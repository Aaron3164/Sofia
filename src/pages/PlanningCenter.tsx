import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle, Circle, Edit2, Plus, Palette, Trash2, X, Search, Folder, ChevronDown, FolderPlus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSpacedRepetition } from '../hooks/useSpacedRepetition';
import { useFileSystem, type FileNode } from '../hooks/useFileSystem';
import { useDialog } from '../context/DialogContext';
import { useNavigate } from 'react-router-dom';
import { PomodoroTimer } from '../components/planning/PomodoroTimer';

type PlanMode = 'spaced' | 'pomodoro';

// 5 mastery levels: Red (Not mastered) -> Orange -> Yellow -> Light Green -> Green (Mastered)
// Mastery levels: Grey (Pas encore vu / Non commencé) + 5 mastery levels: Red -> Green
const MASTERY_LEVELS = [
  { level: 0, label: 'Pas encore vu', color: '#64748b', text: '#ffffff' }, // Gris neutre (défaut)
  { level: 1, label: 'Non maîtrisé', color: '#ef4444', text: '#ffffff' }, // Rouge
  { level: 2, label: 'En difficulté', color: '#f97316', text: '#ffffff' }, // Orange
  { level: 3, label: 'En cours', color: '#eab308', text: '#000000' }, // Jaune
  { level: 4, label: 'Bien assimilé', color: '#84cc16', text: '#000000' }, // Vert clair
  { level: 5, label: 'Maîtrisé', color: '#10b981', text: '#ffffff' }, // Vert foncé
];

const DEFAULT_COURSE_COLOR = '#64748b'; // Gris par défaut quand importé / pas encore vu

export default function PlanningCenter() {
  const [mode, setMode] = useState<PlanMode>('spaced');
  const [currentDate, setCurrentDate] = useState(new Date());
  const { alert, prompt, confirm } = useDialog();
  const { items, markCompleted, updateItemDate, addCourseToDate, addCoursesBatchToDate, deleteScheduleItem, deleteScheduleItemsBatch } = useSpacedRepetition();
  const { nodes, updateNodeColor } = useFileSystem();
  const navigate = useNavigate();

  // Modals state
  const [selectedDayForAdd, setSelectedDayForAdd] = useState<string | null>(null);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [colorPickerTargetCourse, setColorPickerTargetCourse] = useState<{ id: string; name: string; currentColor: string } | null>(null);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [hoveredCourseId, setHoveredCourseId] = useState<string | null>(null);

  // Column pixel widths for 7 days (Monday to Sunday)
  const [colWidths, setColWidths] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('aura_planning_col_widths_px');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 7) return parsed;
      }
    } catch {
      // ignore
    }
    return [140, 140, 140, 140, 140, 140, 140]; // 140px baseline each
  });

  const handleStartColResize = (colIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const initialWidth = colWidths[colIndex];

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(90, Math.min(450, initialWidth + deltaX));
      setColWidths(prev => {
        const next = [...prev];
        next[colIndex] = newWidth;
        return next;
      });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setColWidths(latest => {
        try {
          localStorage.setItem('aura_planning_col_widths_px', JSON.stringify(latest));
        } catch {
          // ignore
        }
        return latest;
      });
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleResetColWidth = (colIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setColWidths(prev => {
      const next = [...prev];
      next[colIndex] = 140;
      try {
        localStorage.setItem('aura_planning_col_widths_px', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const modes = [
    { id: 'spaced', label: '🗓️ Répétition espacée' },
    { id: 'pomodoro', label: '🍅 Pomodoro' },
  ];

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const handleReschedule = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    const newDate = await prompt(`À quelle date voulez-vous reporter "${item.courseName}" ? (Format: AAAA-MM-JJ)`, item.date);
    if (newDate && newDate !== item.date) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
        updateItemDate(item.id, newDate);
      } else {
        await alert("Format de date invalide. Utilisez AAAA-MM-JJ.");
      }
    }
  };

  const handleDeleteItem = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    if (await confirm(`Retirer "${item.courseName}" de la planification pour ce jour ?`)) {
      deleteScheduleItem(item.id);
    }
  };

  const handleDeleteAllDayCourses = async (e: React.MouseEvent, dayStr: string, dayFormatted: string, count: number) => {
    e.stopPropagation();
    if (await confirm(`Supprimer tous les ${count} cours planifiés le ${dayFormatted} ?`)) {
      const idsToDelete = items.filter(item => item.date === dayStr).map(item => item.id);
      await deleteScheduleItemsBatch(idsToDelete);
    }
  };

  const handleAddCourseSingleDay = (course: FileNode) => {
    if (!selectedDayForAdd) return;
    // Ensure the course is imported as grey ('#64748b' - Pas encore vu)
    if (!course.color || course.color !== '#64748b') {
      updateNodeColor(course.id, '#64748b');
    }
    addCourseToDate(course.id, course.name, selectedDayForAdd);
    setSelectedDayForAdd(null);
    setCourseSearchQuery('');
  };

  // Recursively collect all courses contained inside a folder and its subfolders,
  // STRICTLY preserving the folder's order and subfolder hierarchy
  const getDescendantCourses = (folderId: string): FileNode[] => {
    const directChildren = nodes
      .filter(n => n.parentId === folderId)
      .sort((a, b) => a.order - b.order);

    const directCourses: FileNode[] = directChildren.filter(n => n.type === 'course');
    const subFolders = directChildren.filter(n => n.type === 'folder');

    let all: FileNode[] = [...directCourses];
    for (const sub of subFolders) {
      all = all.concat(getDescendantCourses(sub.id));
    }
    return all;
  };

  const handleAddFolderSingleDay = async (folder: FileNode) => {
    if (!selectedDayForAdd) return;
    const coursesInFolder = getDescendantCourses(folder.id);
    if (coursesInFolder.length === 0) {
      await alert(`Le dossier "${folder.name}" ne contient aucun cours.`);
      return;
    }

    if (await confirm(`Ajouter tous les ${coursesInFolder.length} cours du dossier "${folder.name}" au planning du ${format(new Date(selectedDayForAdd), 'd MMMM', { locale: fr })} ?`)) {
      // Ensure all courses in the folder are set to grey ('#64748b' - Pas encore vu) on import
      coursesInFolder.forEach(c => {
        if (!c.color || c.color !== '#64748b') {
          updateNodeColor(c.id, '#64748b');
        }
      });
      await addCoursesBatchToDate(coursesInFolder.map(c => ({ id: c.id, name: c.name })), selectedDayForAdd);
      setSelectedDayForAdd(null);
      setCourseSearchQuery('');
    }
  };

  const toggleFolderCollapse = (folderId: string) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const handleSetCourseColor = (newColor: string) => {
    if (!colorPickerTargetCourse) return;
    updateNodeColor(colorPickerTargetCourse.id, newColor);
    setColorPickerTargetCourse(null);
  };

  // Get color for a course (or fallback)
  const getCourseColor = (courseId: string) => {
    const node = nodes.find(n => n.id === courseId);
    return node?.color || DEFAULT_COURSE_COLOR;
  };

  const allCourses = nodes.filter(n => n.type === 'course');
  const filteredCourses = allCourses.filter(c => 
    c.name.toLowerCase().includes(courseSearchQuery.toLowerCase())
  );

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column' }}>
      <header className="page-header" style={{ flexShrink: 0 }}>
        <h1>Centre de Planification</h1>
        <p className="subtitle">Plannings d'études, répétitions personnalisées et maîtrise des cours</p>
      </header>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem', flexShrink: 0 }}>
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id as PlanMode)}
            className={`btn ${mode === m.id ? 'btn-primary' : 'btn-outline glass-panel'}`}
            style={{ whiteSpace: 'nowrap' }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="glass-panel" style={{ padding: '2rem', borderRadius: '1rem', display: 'flex', flexDirection: 'column', flexShrink: 0, marginBottom: '2rem' }}>
        {mode === 'spaced' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <CalendarIcon size={20} className="text-accent" />
                  Calendrier des Révisions
                </h3>
                {/* Mastery Legend */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Niveau de maîtrise :</span>
                  {MASTERY_LEVELS.map(m => (
                    <div key={m.level} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: m.color, display: 'inline-block' }} />
                      <span style={{ color: 'var(--text-secondary)' }}>{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button className="icon-button" onClick={prevMonth}><ChevronLeft size={20} /></button>
                <h4 style={{ minWidth: '150px', textAlign: 'center', textTransform: 'capitalize' }}>
                  {format(currentDate, 'MMMM yyyy', { locale: fr })}
                </h4>
                <button className="icon-button" onClick={nextMonth}><ChevronRight size={20} /></button>
              </div>
            </div>

            {/* Grid Column Template: 7 configurable columns */}
            {(() => {
              const gridTemplate = colWidths.map(w => `minmax(${w}px, ${w}fr)`).join(' ');

              return (
                <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, gap: '0.5rem', marginBottom: '0.5rem', minWidth: '100%' }}>
                    {weekDays.map((day, colIdx) => (
                      <div 
                        key={day} 
                        style={{ 
                          textAlign: 'center', 
                          fontWeight: 'bold', 
                          color: 'var(--text-secondary)', 
                          padding: '0.5rem 0',
                          position: 'relative',
                          userSelect: 'none'
                        }}
                      >
                        <span>{day}</span>

                        {/* Excel-like Column Resize Separator: positioned right on the gap boundary */}
                        <div
                          onMouseDown={(e) => handleStartColResize(colIdx, e)}
                          onDoubleClick={(e) => handleResetColWidth(colIdx, e)}
                          title="Glisser pour ajuster la largeur de cette journée (Double-clic pour réinitialiser)"
                          style={{
                            position: 'absolute',
                            right: '-0.45rem',
                            top: '15%',
                            bottom: '15%',
                            width: '10px',
                            cursor: 'col-resize',
                            zIndex: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0.35,
                            transition: 'opacity 0.15s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.35'; }}
                        >
                          <div style={{ width: '2px', height: '100%', backgroundColor: 'var(--accent-primary)', borderRadius: '1px' }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, gap: '0.5rem', minWidth: '100%' }}>
                    {days.map((day, idx) => {
                      const isCurrentMonth = isSameMonth(day, currentDate);
                      const isToday = isSameDay(day, new Date());
                      const dayStr = format(day, 'yyyy-MM-dd');

                      // Retrieve and sort day items: group by parent folder first, then by node.order / name
                      const rawDayItems = items.filter(item => item.date === dayStr);
                      const dayItems = [...rawDayItems].sort((a, b) => {
                        const nodeA = nodes.find(n => n.id === a.courseId);
                        const nodeB = nodes.find(n => n.id === b.courseId);
                        const parentA = nodeA?.parentId || '';
                        const parentB = nodeB?.parentId || '';
                        if (parentA !== parentB) {
                          return parentA.localeCompare(parentB);
                        }
                        const orderA = nodeA?.order ?? 0;
                        const orderB = nodeB?.order ?? 0;
                        if (orderA !== orderB) {
                          return orderA - orderB;
                        }
                        return a.courseName.localeCompare(b.courseName);
                      });

                      return (
                        <div 
                          key={idx}
                          className="day-card"
                          style={{
                            border: isToday ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                            borderRadius: '0.5rem',
                            padding: '0.5rem',
                            minHeight: '110px',
                            backgroundColor: isCurrentMonth ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                            opacity: isCurrentMonth ? 1 : 0.45,
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                            <button
                              onClick={() => setSelectedDayForAdd(dayStr)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '0.15rem 0.35rem',
                                borderRadius: '0.25rem',
                                color: 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                                fontSize: '0.65rem'
                              }}
                              title={`Ajouter un cours le ${format(day, 'd MMMM', { locale: fr })}`}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                            >
                              <Plus size={12} />
                              <span>Cours</span>
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              {dayItems.length > 0 && (
                                <button
                                  onClick={(e) => handleDeleteAllDayCourses(e, dayStr, format(day, 'd MMMM', { locale: fr }), dayItems.length)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '0.15rem',
                                    borderRadius: '0.25rem',
                                    color: 'var(--text-secondary)',
                                    opacity: 0.6,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                  title={`Supprimer tous les ${dayItems.length} cours de ce jour`}
                                  onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.opacity = '1'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.opacity = '0.6'; }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                              <div style={{ fontWeight: isToday ? 'bold' : 'normal', fontSize: '0.85rem' }}>
                                {format(day, 'd')}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, overflowY: 'auto' }}>
                            {(() => {
                              const isExpanded = !!expandedDays[dayStr];
                              const MAX_COLLAPSED_ITEMS = 2;
                              const visibleItems = (dayItems.length > MAX_COLLAPSED_ITEMS && !isExpanded)
                                ? dayItems.slice(0, MAX_COLLAPSED_ITEMS)
                                : dayItems;
                              const hiddenCount = dayItems.length - MAX_COLLAPSED_ITEMS;

                              return (
                                <>
                                  {visibleItems.map(item => {
                                    const courseColor = getCourseColor(item.courseId);
                                    const masteryObj = MASTERY_LEVELS.find(m => m.color.toLowerCase() === courseColor.toLowerCase());
                                    const textColor = item.completed 
                                      ? 'var(--text-secondary)' 
                                      : (masteryObj ? masteryObj.text : '#ffffff');
                                    const isHovered = hoveredCourseId === item.id;

                                    return (
                                      <div 
                                        key={item.id}
                                        className="hover-lift"
                                        onMouseEnter={() => setHoveredCourseId(item.id)}
                                        onMouseLeave={() => setHoveredCourseId(null)}
                                        style={{
                                          fontSize: '0.75rem',
                                          padding: '0.35rem 0.45rem',
                                          backgroundColor: item.completed ? 'var(--bg-elevated)' : courseColor,
                                          color: textColor,
                                          borderRadius: '0.35rem',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.3rem',
                                          opacity: item.completed ? 0.6 : 1,
                                          border: item.completed ? '1px solid var(--border-color)' : '1px solid rgba(0,0,0,0.1)',
                                          boxShadow: item.completed ? 'none' : '0 1px 3px rgba(0,0,0,0.15)',
                                          position: 'relative'
                                        }}
                                        title={`Cours: ${item.courseName} (J+${item.step})`}
                                      >
                                        <button 
                                          style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}
                                          onClick={(e) => { e.stopPropagation(); markCompleted(item.id, !item.completed); }}
                                          title={item.completed ? "Marquer non fait" : "Marquer comme révisé"}
                                        >
                                          {item.completed ? <CheckCircle size={12} /> : <Circle size={12} />}
                                        </button>
                                        
                                        <span 
                                          style={{ 
                                            overflow: 'hidden', 
                                            textOverflow: 'ellipsis', 
                                            whiteSpace: 'nowrap', 
                                            flex: 1, 
                                            cursor: 'pointer', 
                                            fontWeight: 500 
                                          }}
                                          onClick={() => navigate(`/subject/${item.courseId}`)}
                                        >
                                          {item.courseName}
                                        </span>

                                        {/* Action buttons (palette, reschedule, delete) appear on hover or stay minimal */}
                                        {isHovered && (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                                            {/* Color / Mastery picker button */}
                                            <button
                                              style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', opacity: 0.85, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setColorPickerTargetCourse({ id: item.courseId, name: item.courseName, currentColor: courseColor });
                                              }}
                                              title="Changer le niveau de maîtrise (couleur)"
                                            >
                                              <Palette size={11} />
                                            </button>

                                            {/* Reschedule button */}
                                            <button 
                                              className="reschedule-btn"
                                              style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', opacity: 0.85, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                              onClick={(e) => handleReschedule(e, item)}
                                              title="Reporter à un autre jour"
                                            >
                                              <Edit2 size={10} />
                                            </button>

                                            {/* Delete single day item button */}
                                            <button 
                                              style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', opacity: 0.85, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                              onClick={(e) => handleDeleteItem(e, item)}
                                              title="Retirer de ce jour"
                                            >
                                              <Trash2 size={10} />
                                            </button>
                                          </div>
                                        )}

                                        <span style={{ fontWeight: 'bold', opacity: 0.85, fontSize: '0.65rem', flexShrink: 0 }}>J{item.step}</span>
                                      </div>
                                    );
                                  })}

                                  {/* Collapse / Expand toggle button if more than 2 items */}
                                  {dayItems.length > MAX_COLLAPSED_ITEMS && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedDays(prev => ({ ...prev, [dayStr]: !prev[dayStr] }));
                                      }}
                                      style={{
                                        marginTop: '0.2rem',
                                        padding: '0.2rem 0.4rem',
                                        fontSize: '0.68rem',
                                        fontWeight: 600,
                                        borderRadius: '0.25rem',
                                        border: '1px dashed var(--border-color)',
                                        backgroundColor: 'var(--bg-elevated)',
                                        color: 'var(--accent-primary)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.25rem',
                                        transition: 'all 0.15s ease'
                                      }}
                                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'; }}
                                    >
                                      {isExpanded ? (
                                        <>
                                          <span>▲ Réduire</span>
                                        </>
                                      ) : (
                                        <>
                                          <span>▼ +{hiddenCount} autre{hiddenCount > 1 ? 's' : ''}</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </>
        ) : mode === 'pomodoro' ? (
          <PomodoroTimer />
        ) : (
          <>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarIcon size={20} className="text-accent" />
              Mode: {modes.find(m => m.id === mode)?.label}
            </h3>
            <div style={{ flex: 1, border: '1px dashed var(--border-color)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              Ce mode est en cours de développement.
            </div>
          </>
        )}
      </div>

      {/* Modal: Add course to single day */}
      {selectedDayForAdd && createPortal(
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
          onClick={() => { setSelectedDayForAdd(null); setCourseSearchQuery(''); }}
        >
          <div 
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: 'var(--bg-elevated)',
              borderRadius: '1rem',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Ajouter un cours au planning</h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Date : {format(new Date(selectedDayForAdd), 'EEEE d MMMM yyyy', { locale: fr })}
                </p>
              </div>
              <button 
                className="icon-button"
                onClick={() => { setSelectedDayForAdd(null); setCourseSearchQuery(''); }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="Rechercher un cours..."
                value={courseSearchQuery}
                onChange={(e) => setCourseSearchQuery(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem 0.6rem 2.2rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <div style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingRight: '0.25rem' }}>
              {/* If user is actively searching, show matched courses directly */}
              {courseSearchQuery.trim() ? (
                filteredCourses.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Aucun cours correspondant.
                  </div>
                ) : (
                  filteredCourses.map(course => {
                    const color = getCourseColor(course.id);
                    const parentFolder = nodes.find(n => n.id === course.parentId);
                    return (
                      <div 
                        key={course.id}
                        onClick={() => handleAddCourseSingleDay(course)}
                        className="hover-lift"
                        style={{
                          padding: '0.65rem 0.85rem',
                          backgroundColor: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '0.5rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <span style={{ fontSize: '0.88rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {course.name}
                            </span>
                            {parentFolder && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                📁 {parentFolder.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <button className="btn btn-outline" style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem', height: 'auto', flexShrink: 0 }}>
                          Ajouter
                        </button>
                      </div>
                    );
                  })
                )
              ) : (
                /* Hierarchical folder & course browser */
                allCourses.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Aucun cours dans votre bibliothèque.
                  </div>
                ) : (
                  <CourseTreeSelector
                    nodes={nodes}
                    parentId={null}
                    depth={0}
                    collapsedFolders={collapsedFolders}
                    onToggleFolder={toggleFolderCollapse}
                    onAddCourse={handleAddCourseSingleDay}
                    onAddFolder={handleAddFolderSingleDay}
                    getDescendantCourses={getDescendantCourses}
                    getCourseColor={getCourseColor}
                  />
                )
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Mastery Level & Color Picker */}
      {colorPickerTargetCourse && createPortal(
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
          onClick={() => setColorPickerTargetCourse(null)}
        >
          <div 
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '420px',
              backgroundColor: 'var(--bg-elevated)',
              borderRadius: '1rem',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Niveau de maîtrise du cours</h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {colorPickerTargetCourse.name}
                </p>
              </div>
              <button 
                className="icon-button"
                onClick={() => setColorPickerTargetCourse(null)}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Sélectionnez le niveau de maîtrise (du rouge au vert). Cette couleur s'appliquera automatiquement à tous les créneaux de ce cours sur le calendrier.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {MASTERY_LEVELS.map(m => {
                const isSelected = colorPickerTargetCourse.currentColor.toLowerCase() === m.color.toLowerCase();
                return (
                  <button
                    key={m.level}
                    onClick={() => handleSetCourseColor(m.color)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.7rem 1rem',
                      borderRadius: '0.5rem',
                      border: isSelected ? `2px solid ${m.color}` : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'var(--bg-primary)' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span 
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        backgroundColor: m.color,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        flexShrink: 0
                      }} 
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: isSelected ? 700 : 500, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        Niveau {m.level} — {m.label}
                      </div>
                    </div>
                    {isSelected && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: m.color }}>Actuel</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

interface CourseTreeSelectorProps {
  nodes: FileNode[];
  parentId: string | null;
  depth: number;
  collapsedFolders: Record<string, boolean>;
  onToggleFolder: (id: string) => void;
  onAddCourse: (course: FileNode) => void;
  onAddFolder: (folder: FileNode) => void;
  getDescendantCourses: (folderId: string) => FileNode[];
  getCourseColor: (courseId: string) => string;
}

function CourseTreeSelector({
  nodes,
  parentId,
  depth,
  collapsedFolders,
  onToggleFolder,
  onAddCourse,
  onAddFolder,
  getDescendantCourses,
  getCourseColor,
}: CourseTreeSelectorProps) {
  const currentNodes = nodes
    .filter(n => n.parentId === parentId)
    .sort((a, b) => {
      // Folders first, then courses, then alphabetical
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

  if (currentNodes.length === 0) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginLeft: depth > 0 ? '1rem' : 0 }}>
      {currentNodes.map(node => {
        if (node.type === 'folder') {
          const isCollapsed = collapsedFolders[node.id] ?? true; // default folded / closed
          const descendantCourses = getDescendantCourses(node.id);

          return (
            <div 
              key={node.id} 
              style={{
                borderRadius: '0.5rem',
                border: '1px solid var(--border-subtle)',
                backgroundColor: depth === 0 ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                padding: '0.4rem 0.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem'
              }}
            >
              {/* Folder Row */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  userSelect: 'none',
                  padding: '0.2rem 0.25rem'
                }}
                onClick={() => onToggleFolder(node.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                      transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease'
                    }}
                  >
                    <ChevronDown size={15} />
                  </button>
                  <Folder size={16} color={node.color || 'var(--accent-primary)'} />
                  <span style={{ fontSize: '0.86rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {node.name}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', opacity: 0.8 }}>
                    ({descendantCourses.length} cours)
                  </span>
                </div>

                {/* Batch add all courses in folder button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddFolder(node);
                  }}
                  disabled={descendantCourses.length === 0}
                  className="btn btn-outline hover-lift"
                  style={{
                    fontSize: '0.7rem',
                    padding: '0.25rem 0.6rem',
                    height: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    whiteSpace: 'nowrap',
                    opacity: descendantCourses.length === 0 ? 0.4 : 1,
                    borderColor: 'var(--accent-primary)',
                    color: 'var(--accent-primary)'
                  }}
                  title={`Programmer les ${descendantCourses.length} cours de ce dossier pour ce jour`}
                >
                  <FolderPlus size={12} />
                  <span>Tout ajouter</span>
                </button>
              </div>

              {/* Sub tree */}
              {!isCollapsed && (
                <div style={{ marginTop: '0.15rem' }}>
                  <CourseTreeSelector
                    nodes={nodes}
                    parentId={node.id}
                    depth={depth + 1}
                    collapsedFolders={collapsedFolders}
                    onToggleFolder={onToggleFolder}
                    onAddCourse={onAddCourse}
                    onAddFolder={onAddFolder}
                    getDescendantCourses={getDescendantCourses}
                    getCourseColor={getCourseColor}
                  />
                </div>
              )}
            </div>
          );
        }

        // Course node
        const color = getCourseColor(node.id);
        return (
          <div 
            key={node.id}
            onClick={() => onAddCourse(node)}
            className="hover-lift"
            style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '0.45rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.6rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {node.name}
              </span>
            </div>
            <button 
              className="btn btn-outline" 
              style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', height: 'auto', flexShrink: 0 }}
            >
              Ajouter
            </button>
          </div>
        );
      })}
    </div>
  );
}

