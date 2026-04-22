import { useState, useEffect } from 'react';
import { addDays, format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export type RepetitionItem = {
  id: string;
  courseId: string;
  courseName: string;
  date: string; // yyyy-MM-dd
  step: number; // 1, 3, 7, 14, 30
  completed: boolean;
};

const STORAGE_KEY = 'aura_spaced_repetition';
const J_STEPS = [1, 3, 7, 14, 30];

export function useSpacedRepetition() {
  const { user } = useAuth();
  const [items, setItems] = useState<RepetitionItem[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Initial load & migration
  useEffect(() => {
    async function loadData() {
      if (!user) {
        const saved = localStorage.getItem(STORAGE_KEY);
        setItems(saved ? JSON.parse(saved) : []);
        setIsInitialLoad(false);
        return;
      }

      // 1. Fetch from cloud
      const { data, error } = await supabase
        .from('spaced_repetition')
        .select('*')
        .order('date', { ascending: true });

      if (!error && data && data.length > 0) {
        setItems(data.map(n => ({
          id: n.id,
          courseId: n.course_id,
          courseName: n.course_name,
          date: n.date,
          step: n.step,
          completed: n.completed
        })));
      } else if (error && error.code !== 'PGRST116') {
        console.error('Error fetching spaced repetition:', error);
      } else {
        // 2. Migration Bridge
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const localItems = JSON.parse(saved);
          if (localItems.length > 0) {
            console.log('Migrating local spaced repetition to Supabase...');
            const toInsert = localItems.map((n: any) => ({
              id: n.id,
              user_id: user.id,
              course_id: n.courseId,
              course_name: n.courseName,
              date: n.date,
              step: n.step,
              completed: n.completed
            }));

            const { error: insertError } = await supabase.from('spaced_repetition').insert(toInsert);
            if (!insertError) setItems(localItems);
          }
        }
      }
      setIsInitialLoad(false);
    }
    loadData();
  }, [user]);

  // Sync back to local if not logged in
  useEffect(() => {
    if (!user && !isInitialLoad) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, user, isInitialLoad]);

  const scheduleCourse = async (courseId: string, courseName: string) => {
    const today = new Date();
    const newItems: RepetitionItem[] = J_STEPS.map(step => ({
      id: crypto.randomUUID(),
      courseId,
      courseName,
      date: format(addDays(today, step), 'yyyy-MM-dd'),
      step,
      completed: false,
    }));

    // Optimistic update
    setItems(prev => {
      const filtered = prev.filter(item => item.courseId !== courseId || item.completed);
      return [...filtered, ...newItems].sort((a, b) => a.date.localeCompare(b.date));
    });

    if (user) {
      const performSchedule = async (retryCount = 0) => {
        // Remove old cloud records for this course (uncompleted)
        await supabase.from('spaced_repetition')
          .delete()
          .eq('course_id', courseId)
          .eq('completed', false);

        // Insert new records
        const { error } = await supabase.from('spaced_repetition').insert(
          newItems.map(item => ({
            id: item.id,
            user_id: user.id,
            course_id: item.courseId,
            course_name: item.courseName,
            date: item.date,
            step: item.step,
            completed: item.completed
          }))
        );

        if (error) {
          console.error('Error scheduling course in cloud:', error);
          if (error.code === '23503' && retryCount < 3) {
            console.warn(`Node ID ${courseId} not found in cloud. Retrying schedule (${retryCount + 1})...`);
            setTimeout(() => performSchedule(retryCount + 1), 2000);
          }
        }
      };

      performSchedule();
    }
    
    return newItems;
  };

  const markCompleted = async (id: string, completed: boolean) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, completed } : item
    ));

    if (user) {
      await supabase.from('spaced_repetition').update({ completed }).eq('id', id);
    }
  };

  const getItemsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return items.filter(item => item.date === dateStr);
  };

  const hasScheduledCourse = (courseId: string) => {
    return items.some(item => item.courseId === courseId && !item.completed);
  };

  const removeCourseSchedules = async (courseId: string) => {
    setItems(prev => prev.filter(item => item.courseId !== courseId));
    if (user) {
      await supabase.from('spaced_repetition').delete().eq('course_id', courseId);
    }
  };

  const updateItemDate = async (id: string, newDate: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, date: newDate } : item
    ).sort((a, b) => a.date.localeCompare(b.date)));

    if (user) {
      await supabase.from('spaced_repetition').update({ date: newDate }).eq('id', id);
    }
  };

  return { 
    items, 
    loading: isInitialLoad,
    scheduleCourse, 
    markCompleted, 
    updateItemDate,
    getItemsForDate, 
    hasScheduledCourse,
    removeCourseSchedules
  };
}
