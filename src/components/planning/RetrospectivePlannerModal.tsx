import { useState, useMemo } from 'react';
import { Calendar, Sparkles, Folder, X, ChevronDown, Check, Trash2 } from 'lucide-react';
import { format, addDays, differenceInCalendarDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { type FileNode } from '../../hooks/useFileSystem';

interface RetrospectivePlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  allNodes: FileNode[];
  onApplySchedule: (scheduleEntries: { courseId: string; courseName: string; dateStr: string }[]) => Promise<void>;
  onClearProgram?: () => Promise<void>;
  hasExistingProgram?: boolean;
}

export function RetrospectivePlannerModal({
  isOpen,
  onClose,
  allNodes,
  onApplySchedule,
  onClearProgram,
  hasExistingProgram = false
}: RetrospectivePlannerModalProps) {
  // 1. Form state
  const [examDateStr, setExamDateStr] = useState<string>(() => {
    return format(addDays(new Date(), 30), 'yyyy-MM-dd');
  });
  const [targetPasses, setTargetPasses] = useState<number>(3); // Nombre de passages / tours
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [excludeWeekends, setExcludeWeekends] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);

  // Recursively collect all courses inside a folder (and subfolders)
  const getCoursesInFolder = useMemo(() => {
    return (folderId: string): FileNode[] => {
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
  }, [allNodes]);

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
  }, [selectedFolderIds, allNodes, getCoursesInFolder]);

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

  const toggleFolderCollapse = (folderId: string) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [folderId]: !(prev[folderId] ?? false) // default open so user sees hierarchy
    }));
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

          {/* Form Step 2: Choose folder(s) / subjects in HIERARCHICAL TREE VIEW */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Sélectionne le ou les dossiers sur lesquels porte l'examen (arborescence) :
              </label>
              <span style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                {totalCoursesCount} cours sélectionnés
              </span>
            </div>

            <div style={{
              maxHeight: '260px',
              overflowY: 'auto',
              padding: '0.75rem',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem'
            }}>
              <FolderTreeSelector
                nodes={allNodes}
                parentId={null}
                depth={0}
                selectedFolderIds={selectedFolderIds}
                collapsedFolders={collapsedFolders}
                onToggleFolder={toggleFolderCollapse}
                onSelectFolder={toggleFolderSelection}
                getCoursesInFolder={getCoursesInFolder}
              />
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
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.75rem',
          background: 'var(--bg-elevated)',
          flexWrap: 'wrap'
        }}>
          <div>
            {onClearProgram && hasExistingProgram && (
              <button
                type="button"
                onClick={async () => {
                  if (isClearing) return;
                  setIsClearing(true);
                  try {
                    await onClearProgram();
                    onClose();
                  } finally {
                    setIsClearing(false);
                  }
                }}
                disabled={isClearing || isApplying}
                className="btn btn-outline"
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--danger)',
                  borderColor: 'rgba(239, 68, 68, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.45rem 0.85rem'
                }}
                title="Supprimer l'ensemble du programme de révision généré"
              >
                <Trash2 size={14} />
                <span>{isClearing ? 'Suppression...' : 'Supprimer le programme existant'}</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
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
    </div>
  );
}

interface FolderTreeSelectorProps {
  nodes: FileNode[];
  parentId: string | null;
  depth: number;
  selectedFolderIds: string[];
  collapsedFolders: Record<string, boolean>;
  onToggleFolder: (id: string) => void;
  onSelectFolder: (id: string) => void;
  getCoursesInFolder: (id: string) => FileNode[];
}

function FolderTreeSelector({
  nodes,
  parentId,
  depth,
  selectedFolderIds,
  collapsedFolders,
  onToggleFolder,
  onSelectFolder,
  getCoursesInFolder,
}: FolderTreeSelectorProps) {
  // Only list folders
  const currentFolders = nodes
    .filter(n => n.type === 'folder' && n.parentId === parentId)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (currentFolders.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginLeft: depth > 0 ? '1rem' : 0 }}>
      {currentFolders.map(folder => {
        const isCollapsed = collapsedFolders[folder.id] ?? false; // default open
        const isSelected = selectedFolderIds.includes(folder.id);
        const coursesInside = getCoursesInFolder(folder.id);
        const subFoldersCount = nodes.filter(n => n.type === 'folder' && n.parentId === folder.id).length;

        return (
          <div key={folder.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.45rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                background: isSelected ? 'var(--accent-light)' : depth === 0 ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onClick={() => onSelectFolder(folder.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', overflow: 'hidden' }}>
                {subFoldersCount > 0 ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFolder(folder.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      color: 'inherit',
                      transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease'
                    }}
                  >
                    <ChevronDown size={14} />
                  </button>
                ) : (
                  <div style={{ width: 14 }} />
                )}

                <Folder size={15} color={folder.color || 'var(--accent-primary)'} style={{ flexShrink: 0 }} />
                
                <span style={{ fontSize: '0.84rem', fontWeight: isSelected ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {folder.name}
                </span>

                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  ({coursesInside.length} cours)
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '4px',
                  border: isSelected ? 'none' : '1.5px solid var(--border-color)',
                  background: isSelected ? 'var(--accent-primary)' : 'transparent',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem'
                }}>
                  {isSelected && <Check size={12} strokeWidth={3} />}
                </span>
              </div>
            </div>

            {/* Subfolders tree */}
            {!isCollapsed && subFoldersCount > 0 && (
              <FolderTreeSelector
                nodes={nodes}
                parentId={folder.id}
                depth={depth + 1}
                selectedFolderIds={selectedFolderIds}
                collapsedFolders={collapsedFolders}
                onToggleFolder={onToggleFolder}
                onSelectFolder={onSelectFolder}
                getCoursesInFolder={getCoursesInFolder}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
