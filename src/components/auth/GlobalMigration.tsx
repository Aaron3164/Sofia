import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

/**
 * GlobalMigration is a background component that ensures all LocalStorage data
 * is synchronized to Supabase when a user logs in.
 */
export function GlobalMigration() {
  const { user } = useAuth();
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    if (!user || isMigrating) return;

    const performMigration = async () => {
      setIsMigrating(true);
      console.log('Starting global data migration to Supabase...');

      try {
        // Fetch current nodes from database to match by name
        const { data: dbNodes } = await supabase
          .from('nodes')
          .select('id, name, type');
          
        // Retrieve local nodes from storage to get local names
        const localNodesStr = localStorage.getItem('aura_file_system');
        const localNodes = localNodesStr ? JSON.parse(localNodesStr) : [];
        const localNodesMap = new Map<string, string>(localNodes?.map((n: any) => [n.id, n.name]) || []);

        // 1. Migrate Course Data (Flashcards, MCQs, Summaries)
        const allKeys = Object.keys(localStorage);
        const subjectKeys = allKeys.filter(k => k.startsWith('aura_subject_'));
        
        if (subjectKeys.length > 0) {
          for (const key of subjectKeys) {
            const localCourseId = key.replace('aura_subject_', '');
            const saved = localStorage.getItem(key);
            if (saved) {
              try {
                const parsed = JSON.parse(saved);
                
                // Determine course name
                const courseName = localNodesMap.get(localCourseId) || parsed.fileName || '';
                
                // Match with database nodes by name (case-insensitive)
                let targetCourseId = localCourseId;
                if (dbNodes && courseName) {
                  const match = dbNodes.find(n => n.type === 'course' && n.name.toLowerCase() === courseName.toLowerCase());
                  if (match) {
                    targetCourseId = match.id;
                    console.log(`Matched local course "${courseName}" (${localCourseId}) to db node ID: ${targetCourseId}`);
                  }
                }

                // We always upsert to ensure local generations (flashcards) are migrated 
                // if cloud didn't have them yet.
                const { error: upsertError } = await supabase.from('course_data').upsert({
                  user_id: user.id,
                  course_id: targetCourseId,
                  extracted_content: parsed.extractedContent,
                  generations: parsed.generations,
                  pdf_url: parsed.pdfUrl,
                  file_name: parsed.fileName || courseName,
                  updated_at: new Date().toISOString()
                }, { onConflict: 'course_id' });
                
                if (!upsertError) {
                  console.log(`Migrated/Updated course data for: ${courseName || targetCourseId}`);
                  localStorage.removeItem(key);
                } else {
                  console.error(`Failed to migrate Course data for ${courseName || targetCourseId}:`, upsertError);
                }
              } catch (e) {
                console.error(`Failed to parse/migrate Subject data for ${localCourseId}`, e);
              }
            }
          }
        }

        // 2. Migrate Time Spent
        const timeKey = 'aura_time_spent';
        const rawTime = localStorage.getItem(timeKey);
        if (rawTime) {
          try {
            const localTimeData = JSON.parse(rawTime);
            const { data: existingStats } = await supabase.from('course_stats').select('course_id, seconds');
            const existingStatsMap = new Map(existingStats?.map(s => [s.course_id, s.seconds]) || []);

            let migratedCount = 0;
            for (const localCourseId in localTimeData) {
              const localSeconds = localTimeData[localCourseId].seconds || 0;
              const courseName = localNodesMap.get(localCourseId) || localTimeData[localCourseId].courseName || '';
              
              let targetCourseId = localCourseId;
              if (dbNodes && courseName) {
                const match = dbNodes.find(n => n.type === 'course' && n.name.toLowerCase() === courseName.toLowerCase());
                if (match) targetCourseId = match.id;
              }

              const cloudSeconds = existingStatsMap.get(targetCourseId) || 0;

              if (localSeconds > cloudSeconds) {
                const { error: statsError } = await supabase.from('course_stats').upsert({
                  user_id: user.id,
                  course_id: targetCourseId,
                  seconds: Math.max(localSeconds, cloudSeconds),
                  updated_at: new Date().toISOString()
                }, { onConflict: 'course_id' });
                
                if (!statsError) {
                  migratedCount++;
                } else {
                  console.error(`Failed to migrate course stats for ${courseName || targetCourseId}:`, statsError);
                }
              }
            }
            if (migratedCount > 0 || Object.keys(localTimeData).length === 0) {
              localStorage.removeItem(timeKey);
            }
          } catch (e) {
            console.error('Failed to migrate time stats', e);
          }
        }

        // 3. Migrate Grades (MCQ & Annales)
        const mcqKey = 'aura_mcq_grades';
        const rawMcq = localStorage.getItem(mcqKey);
        if (rawMcq) {
          try {
            const grades = JSON.parse(rawMcq);
            if (Array.isArray(grades) && grades.length > 0) {
              const toInsert = grades.map(g => ({
                id: g.id || undefined,
                user_id: user.id,
                course_id: g.courseId,
                course_name: g.courseName,
                score: g.score,
                total: g.total,
                date: g.date || new Date().toISOString(),
                mcqs: g.mcqs || [],
                selected_answers: g.selectedAnswers || {}
              }));
              const { error } = await supabase.from('mcq_grades').upsert(toInsert);
              if (!error) {
                localStorage.removeItem(mcqKey);
              } else {
                console.error('Failed to migrate MCQ grades:', error);
              }
            } else {
              localStorage.removeItem(mcqKey);
            }
          } catch (e) {
            console.error('Failed to migrate MCQ grades:', e);
          }
        }

        const annalesKey = 'aura_annales_grades';
        const rawAnnales = localStorage.getItem(annalesKey);
        if (rawAnnales) {
          try {
            const grades = JSON.parse(rawAnnales);
            if (Array.isArray(grades) && grades.length > 0) {
              const toInsert = grades.map(g => ({
                id: g.id || undefined,
                user_id: user.id,
                folder_id: g.folderId || null,
                subject: g.subject,
                score: g.score,
                attachments: g.attachments || [],
                date: g.date || new Date().toISOString()
              }));
              const { error } = await supabase.from('annales_grades').upsert(toInsert);
              if (!error) {
                localStorage.removeItem(annalesKey);
              } else {
                console.error('Failed to migrate annales grades:', error);
              }
            } else {
              localStorage.removeItem(annalesKey);
            }
          } catch (e) {
            console.error('Failed to migrate annales grades:', e);
          }
        }

        console.log('Global migration completed successfully.');
      } catch (error) {
        console.error('Critical error during global migration:', error);
      } finally {
        setIsMigrating(false);
      }
    };

    performMigration();
  }, [user]);

  return null; // Side-effect only component
}
