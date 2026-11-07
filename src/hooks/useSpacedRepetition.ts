import React, { useState, useEffect, createContext, useContext } from 'react';
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

function getInitialCachedItems(): RepetitionItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function useSpacedRepetitionInternal() {
  const { user } = useAuth();
  const [items, setItems] = useState<RepetitionItem[]>(getInitialCachedItems);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(() => getInitialCachedItems().length === 0);

  // Initial load & migration
  useEffect(() => {
    async function loadData() {
      if (!user) {
        setItems(getInitialCachedItems());
        setIsInitialLoad(false);
        return;
      }

      // 1. Fetch from cloud
      const { data, error } = await supabase
        .from('spaced_repetition')
        .select('*')
        .order('date', { ascending: true });

      if (!error && data && data.length > 0) {
        const mapped = data.map(n => ({
          id: n.id,
          courseId: n.course_id,
          courseName: n.course_name,
          date: n.date,
          step: n.step,
          completed: n.completed
        }));
        setItems(mapped);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
        } catch {}
      } else if (error && error.code !== 'PGRST116') {
        console.error('Error fetching spaced repetition:', error);
      } else {
        // 2. Migration Bridge
        const localItems = getInitialCachedItems();
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
        } else {
          setItems([]);
        }
      }
      setIsInitialLoad(false);
    }
    loadData();
  }, [user?.id]);

  // Sync back to local buffer
  useEffect(() => {
    if (!isInitialLoad) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch {}
    }
  }, [items, isInitialLoad]);

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

  const addCourseToDate = async (courseId: string, courseName: string, dateStr: string) => {
    const newItem: RepetitionItem = {
      id: crypto.randomUUID(),
      courseId,
      courseName,
      date: dateStr,
      step: 1,
      completed: false,
    };

    setItems(prev => [...prev, newItem].sort((a, b) => a.date.localeCompare(b.date)));

    if (user) {
      const { error } = await supabase.from('spaced_repetition').insert([{
        id: newItem.id,
        user_id: user.id,
        course_id: newItem.courseId,
        course_name: newItem.courseName,
        date: newItem.date,
        step: newItem.step,
        completed: newItem.completed
      }]);
      if (error) console.error('Error adding course to date:', error);
    }

    return newItem;
  };

  const addCoursesBatchToDate = async (courses: { id: string; name: string }[], dateStr: string) => {
    if (courses.length === 0) return [];

    const newItems: RepetitionItem[] = courses.map(c => ({
      id: crypto.randomUUID(),
      courseId: c.id,
      courseName: c.name,
      date: dateStr,
      step: 1,
      completed: false,
    }));

    setItems(prev => [...prev, ...newItems].sort((a, b) => a.date.localeCompare(b.date)));

    if (user) {
      const toInsert = newItems.map(item => ({
        id: item.id,
        user_id: user.id,
        course_id: item.courseId,
        course_name: item.courseName,
        date: item.date,
        step: item.step,
        completed: item.completed
      }));
      const { error } = await supabase.from('spaced_repetition').insert(toInsert);
      if (error) console.error('Error batch adding courses to date:', error);
    }

    return newItems;
  };

  const deleteScheduleItem = async (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    if (user) {
      await supabase.from('spaced_repetition').delete().eq('id', id);
    }
  };

  const deleteScheduleItemsBatch = async (ids: string[]) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    setItems(prev => prev.filter(item => !idSet.has(item.id)));
    if (user) {
      await supabase.from('spaced_repetition').delete().in('id', ids);
    }
  };

  return { 
    items, 
    loading: isInitialLoad,
    scheduleCourse, 
    addCourseToDate,
    addCoursesBatchToDate,
    deleteScheduleItem,
    deleteScheduleItemsBatch,
    markCompleted, 
    updateItemDate,
    getItemsForDate, 
    hasScheduledCourse,
    removeCourseSchedules
  };
}

type SpacedRepetitionContextType = ReturnType<typeof useSpacedRepetitionInternal>;

const SpacedRepetitionContext = createContext<SpacedRepetitionContextType | undefined>(undefined);

export function SpacedRepetitionProvider({ children }: { children: React.ReactNode }) {
  const value = useSpacedRepetitionInternal();
  return React.createElement(SpacedRepetitionContext.Provider, { value }, children);
}

export function useSpacedRepetition(): SpacedRepetitionContextType {
  const context = useContext(SpacedRepetitionContext);
  if (!context) {
    throw new Error('useSpacedRepetition must be used within a SpacedRepetitionProvider');
  }
  return context;
}
