import { useState, useMemo } from 'react';
import { Calendar, Sparkles, Folder, X } from 'lucide-react';
import { format, addDays, differenceInCalendarDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { type FileNode } from '../../hooks/useFileSystem';

interface RetrospectivePlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  allNodes: FileNode[];
  onApplySchedule: (scheduleEntries: { courseId: string; courseName: string; dateStr: string }[]) => Promise<void>;
}

export function RetrospectivePlannerModal({
  isOpen,
  onClose,
  allNodes,
  onApplySchedule
}: RetrospectivePlannerModalProps) {
  // 1. Form state
  const [examDateStr, setExamDateStr] = useState<string>(() => {
    return format(addDays(new Date(), 30), 'yyyy-MM-dd');
  });
  const [targetPasses, setTargetPasses] = useState<number>(3); // Nombre de passages / tours
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [excludeWeekends, setExcludeWeekends] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);

  // Folders list
  const folders = useMemo(() => {
    return allNodes.filter(n => n.type === 'folder');
  }, [allNodes]);

  // Recursively collect all courses inside a folder (and subfolders)
  const getCoursesInFolder = (folderId: string): FileNode[] => {
    const directChildren = allNodes.filter(n => n.parentId === folderId);
    let courses: FileNode[] = [];
    for (const child of directChildren) {
      if (child.type === 'course') {
        courses.push(child);
      } else if (child.type === 'folder') {
        courses = courses.concat(getCoursesInFolder(child.id));
      }
    }
    return courses;
  };

  // Selected courses grouped by folder / subject
  const selectedCoursesByFolder = useMemo(() => {
    const map = new Map<string, { folderName: string; courses: FileNode[] }>();

    for (const folderId of selectedFolderIds) {
      const folder = allNodes.find(n => n.id === folderId);
      if (!folder) continue;
      const courses = getCoursesInFolder(folderId);
      // Remove duplicates
      const uniqueCourses = Array.from(new Map(courses.map(c => [c.id, c])).values());
      map.set(folderId, {
        folderName: folder.name,
        courses: uniqueCourses
      });
    }

    return map;
  }, [selectedFolderIds, allNodes]);

  const totalCoursesCount = useMemo(() => {
    const courseIds = new Set<string>();
    selectedCoursesByFolder.forEach(({ courses }) => {
      courses.forEach(c => courseIds.add(c.id));
    });
    return courseIds.size;
  }, [selectedCoursesByFolder]);

  // Available study days calculation
  const studyDays = useMemo(() => {
    if (!examDateStr) return [];
    try {
      const today = new Date();
      const examDate = parseISO(examDateStr);
      const totalDays = differenceInCalendarDays(examDate, today);
      if (totalDays <= 0) return [];

      const daysList: Date[] = [];
      for (let i = 1; i <= totalDays; i++) {
        const d = addDays(today, i);
        if (excludeWeekends) {
          const dayOfWeek = d.getDay(); // 0 is Sunday, 6 is Saturday
          if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        }
        daysList.push(d);
      }
      return daysList;
    } catch {
      return [];
    }
  }, [examDateStr, excludeWeekends]);

  // Algorithme de rétro-planification équilibrée
  // Règle : Regrouper les cours d'une même matière ensemble, et planifier N passages
  const generatedSchedule = useMemo(() => {
    if (!studyDays.length || totalCoursesCount === 0 || targetPasses <= 0) return [];

    const scheduleEntries: { courseId: string; courseName: string; dateStr: string; folderName: string; passNumber: number }[] = [];
    const totalDaysAvailable = studyDays.length;

    // Répartir la période globale en N "tours" ou "passages"
    // Exemple : Tour 1 (50% du temps), Tour 2 (30% du temps), Tour 3 (20% du temps) ou uniforme
    const daysPerPass = Math.max(1, Math.floor(totalDaysAvailable / targetPasses));

    for (let pass = 1; pass <= targetPasses; pass++) {
      const passStartDayIdx = (pass - 1) * daysPerPass;
      const passEndDayIdx = pass === targetPasses ? totalDaysAvailable : pass * daysPerPass;
      const passDays = studyDays.slice(passStartDayIdx, passEndDayIdx);

      if (passDays.length === 0) continue;

      // Rassembler tous les cours groupés par matière
      const passCoursesList: { course: FileNode; folderName: string }[] = [];
      selectedCoursesByFolder.forEach(({ folderName, courses }) => {
        courses.forEach(c => {
          passCoursesList.push({ course: c, folderName });
        });
      });

      if (passCoursesList.length === 0) continue;

      // Distribuer les cours sur les passDays disponibles de ce tour
      passCoursesList.forEach((item, index) => {
        const dayIndex = Math.min(
          passDays.length - 1,
          Math.floor((index / passCoursesList.length) * passDays.length)
        );
        const assignedDate = passDays[dayIndex];
        const dateStr = format(assignedDate, 'yyyy-MM-dd');

        scheduleEntries.push({
          courseId: item.course.id,
          courseName: item.course.name,
          dateStr,
          folderName: item.folderName,
          passNumber: pass
        });
      });
    }

    return scheduleEntries;
  }, [studyDays, selectedCoursesByFolder, totalCoursesCount, targetPasses]);

  const toggleFolderSelection = (folderId: string) => {
    setSelectedFolderIds(prev => 
      prev.includes(folderId) ? prev.filter(id => id !== folderId) : [...prev, folderId]
    );
  };

  const handleApply = async () => {
    if (generatedSchedule.length === 0) return;
    setIsApplying(true);
    try {
      await onApplySchedule(generatedSchedule.map(s => ({
        courseId: s.courseId,
        courseName: s.courseName,
        dateStr: s.dateStr
      })));
      onClose();
    } catch (e) {
      console.error('Failed to apply retrospective schedule:', e);
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 10000,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div 
        className="card"
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1.5rem 1.75rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <Sparkles size={18} color="var(--accent-primary)" />
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Planning Rétrospectif d'Examen
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Calcule la meilleure répartition de tes cours jusqu'au jour J en regroupant les matières.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="btn btn-outline"
            style={{ padding: '0.4rem', borderRadius: '50%', color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Form Step 1: Exam Date & Number of passes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Date de l'examen (Jour J)
              </label>
              <input
                type="date"
                value={examDateStr}
                min={format(addDays(new Date(), 2), 'yyyy-MM-dd')}
                onChange={e => setExamDateStr(e.target.value)}
                className="input"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.88rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.35rem' }}>
                {studyDays.length > 0 ? `${studyDays.length} jours d'études disponibles` : 'Date invalide ou trop proche'}
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Nombre de passages souhaité (Tours)
              </label>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setTargetPasses(n)}
                    className="btn"
                    style={{
                      flex: 1,
                      padding: '0.6rem 0',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      background: targetPasses === n ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                      color: targetPasses === n ? '#ffffff' : 'var(--text-secondary)',
                      borderColor: targetPasses === n ? 'var(--accent-primary)' : 'var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      textAlign: 'center'
                    }}
                  >
                    {n} tour{n > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.35rem' }}>
                Recommandé : 3 tours (Apprentissage, Consolidation, Sprint final)
              </span>
            </div>
          </div>

          {/* Optional: Exclude weekends */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="excludeWeekends"
              checked={excludeWeekends}
              onChange={e => setExcludeWeekends(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
            />
            <label htmlFor="excludeWeekends" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Ne pas planifier de cours le week-end (samedi et dimanche libres)
            </label>
          </div>

          {/* Form Step 2: Choose folder(s) / subjects */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Sélectionne le ou les dossiers sur lesquels porte l'examen :
              </label>
              <span style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                {totalCoursesCount} cours sélectionnés
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '0.5rem',
              maxHeight: '180px',
              overflowY: 'auto',
              padding: '0.5rem',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}>
              {folders.length === 0 ? (
                <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  Aucun dossier trouvé dans ta bibliothèque.
                </div>
              ) : (
                folders.map(f => {
                  const isSelected = selectedFolderIds.includes(f.id);
                  const countInFolder = getCoursesInFolder(f.id).length;

                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleFolderSelection(f.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.6rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        background: isSelected ? 'var(--accent-light)' : 'var(--bg-secondary)',
                        border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        fontFamily: 'inherit',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Folder size={15} style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isSelected ? 600 : 400 }}>
                        {f.name}
                      </span>
                      <span style={{ fontSize: '0.72rem', opacity: 0.7, flexShrink: 0 }}>
                        {countInFolder}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Simulation summary */}
          {generatedSchedule.length > 0 && (
            <div style={{
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Aperçu de la répartition calculée :
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: 600 }}>
                  ~{Math.round(totalCoursesCount / Math.max(1, studyDays.length / targetPasses) * 10) / 10} cours/jour
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {Array.from({ length: targetPasses }).map((_, pIdx) => {
                  const passNum = pIdx + 1;
                  const entriesInPass = generatedSchedule.filter(s => s.passNumber === passNum);
                  const firstDate = entriesInPass[0]?.dateStr;
                  const lastDate = entriesInPass[entriesInPass.length - 1]?.dateStr;

                  return (
                    <div 
                      key={passNum}
                      style={{
                        flex: '1 1 180px',
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.78rem'
                      }}
                    >
                      <strong style={{ color: 'var(--accent-primary)', display: 'block', marginBottom: '0.2rem' }}>
                        Tour {passNum} : {entriesInPass.length} séances
                      </strong>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {firstDate && lastDate ? `Du ${format(parseISO(firstDate), 'd MMM', { locale: fr })} au ${format(parseISO(lastDate), 'd MMM', { locale: fr })}` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                ✓ Les cours d'une même matière sont enchaînés successivement pour maximiser la mémorisation contextuelle.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          background: 'var(--bg-elevated)'
        }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline"
            style={{ fontSize: '0.85rem' }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={generatedSchedule.length === 0 || isApplying}
            className="btn btn-primary"
            style={{
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: (generatedSchedule.length === 0 || isApplying) ? 0.6 : 1
            }}
          >
            {isApplying ? (
              'Application...'
            ) : (
              <>
                <Calendar size={15} /> Injecter dans mon planning ({generatedSchedule.length} séances)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

