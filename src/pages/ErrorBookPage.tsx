import { useState, useEffect, useMemo } from 'react';
import { 
  BookX, Trash2, CheckCircle2, RotateCcw, Search, 
  Eye, EyeOff, AlertTriangle, Check, Folder, Layers, ChevronDown
} from 'lucide-react';
import { ErrorBookService, type ErrorQuestionItem } from '../lib/ErrorBookService';
import { useDialog } from '../context/DialogContext';
import { useFileSystem } from '../hooks/useFileSystem';

export default function ErrorBookPage() {
  const { nodes, getNode } = useFileSystem();
  const [errors, setErrors] = useState<ErrorQuestionItem[]>(() => ErrorBookService.getErrors());
  const [filterType, setFilterType] = useState<'all' | 'mcq' | 'flashcard'>('all');
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [activePracticeItem, setActivePracticeItem] = useState<ErrorQuestionItem | null>(null);
  const [practiceSelected, setPracticeSelected] = useState<string[]>([]);
  const [practiceAnswerChecked, setPracticeAnswerChecked] = useState(false);
  const [allTabLimit, setAllTabLimit] = useState<number>(30);
  const [subjectLimits, setSubjectLimits] = useState<Record<string, number>>({});
  const { confirm } = useDialog();

  useEffect(() => {
    setAllTabLimit(30);
    setSubjectLimits({});
  }, [filterType, selectedFolderFilter, searchQuery]);

  useEffect(() => {
    const handleUpdate = () => {
      setErrors(ErrorBookService.getErrors());
    };
    window.addEventListener('sofia-error-book-updated', handleUpdate);
    return () => window.removeEventListener('sofia-error-book-updated', handleUpdate);
  }, []);

  // Resolves the primary subject / root folder name for a given course
  const getSubjectNameForCourse = useMemo(() => {
    return (courseId: string, itemCourseName: string, itemFolderPath?: string[]): string => {
      if (itemFolderPath && itemFolderPath.length > 0) {
        return itemFolderPath[itemFolderPath.length - 1]; // Closest parent folder or root
      }
      const courseNode = nodes.find(n => n.id === courseId);
      if (courseNode && courseNode.parentId) {
        const parentFolder = getNode(courseNode.parentId);
        if (parentFolder) return parentFolder.name;
      }
      return itemCourseName || 'Autre matière';
    };
  }, [nodes, getNode]);

  // Available subjects with error count
  const subjectsList = useMemo(() => {
    const counts = new Map<string, number>();
    errors.forEach(item => {
      const subject = getSubjectNameForCourse(item.courseId, item.courseName, item.folderPath);
      counts.set(subject, (counts.get(subject) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [errors, getSubjectNameForCourse]);

  // Base filtered errors (by subject and search query, before type filter)
  const baseFilteredErrors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return errors.filter(item => {
      const subject = getSubjectNameForCourse(item.courseId, item.courseName, item.folderPath);
      if (selectedFolderFilter !== 'all' && subject !== selectedFolderFilter) return false;
      if (!q) return true;
      return (
        item.question.toLowerCase().includes(q) ||
        item.courseName.toLowerCase().includes(q) ||
        subject.toLowerCase().includes(q) ||
        (item.back && item.back.toLowerCase().includes(q))
      );
    });
  }, [errors, selectedFolderFilter, searchQuery, getSubjectNameForCourse]);

  // Filtered errors (including type filter)
  const filteredErrors = useMemo(() => {
    if (filterType === 'all') return baseFilteredErrors;
    return baseFilteredErrors.filter(item => item.type === filterType);
  }, [baseFilteredErrors, filterType]);

  // Grouped errors by subject (for structured layout)
  const groupedErrors = useMemo(() => {
    const map = new Map<string, ErrorQuestionItem[]>();
    const sourceList = filterType === 'all' ? filteredErrors.slice(0, allTabLimit) : filteredErrors;
    sourceList.forEach(item => {
      const subject = getSubjectNameForCourse(item.courseId, item.courseName, item.folderPath);
      const list = map.get(subject) || [];
      list.push(item);
      map.set(subject, list);
    });
    return map;
  }, [filteredErrors, filterType, allTabLimit, getSubjectNameForCourse]);

  const handleClearAll = async () => {
    const ok = await confirm("Voulez-vous vraiment vider tout le carnet d'erreurs ?");
    if (ok) {
      ErrorBookService.clearErrors();
      setErrors([]);
    }
  };

  const handleRemoveOne = (id: string) => {
    ErrorBookService.removeError(id);
    setErrors(prev => prev.filter(e => e.id !== id));
    if (activePracticeItem?.id === id) {
      setActivePracticeItem(null);
    }
  };

  const toggleReveal = (id: string) => {
    setRevealedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Practice Mode functions
  const startPractice = (item: ErrorQuestionItem) => {
    setActivePracticeItem(item);
    setPracticeSelected([]);
    setPracticeAnswerChecked(false);
  };

  const togglePracticeOption = (opt: string) => {
    if (practiceAnswerChecked) return;
    setPracticeSelected(prev => 
      prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
    );
  };

  const isMcqCorrectlySolved = useMemo(() => {
    if (!activePracticeItem || activePracticeItem.type !== 'mcq') return false;
    const correct = activePracticeItem.correctAnswers || [];
    if (correct.length !== practiceSelected.length) return false;
    return correct.every(c => practiceSelected.includes(c));
  }, [activePracticeItem, practiceSelected]);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', paddingBottom: '3rem' }}>
      
      {/* ── Header ─────────────────────────────────── */}
      <header style={{ 
        marginBottom: '1.75rem', 
        paddingBottom: '1.25rem', 
        borderBottom: '1px solid var(--border-subtle)', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        gap: '1rem', 
        flexWrap: 'wrap' 
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: 'var(--radius-sm)', 
              background: 'rgba(225, 29, 72, 0.12)', 
              border: '1px solid rgba(225, 29, 72, 0.25)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'var(--accent-primary)' 
            }}>
              <BookX size={18} />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Carnet d'Erreurs
            </h1>
          </div>
          <p className="subtitle" style={{ margin: 0, fontSize: '0.875rem' }}>
            {errors.length} notion{errors.length > 1 ? 's' : ''} ou question{errors.length > 1 ? 's' : ''} à consolider, triées par matière
          </p>
        </div>

        {errors.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={handleClearAll}
              className="btn btn-outline"
              style={{ fontSize: '0.82rem', color: 'var(--danger)', borderColor: 'rgba(229, 72, 77, 0.25)' }}
            >
              <Trash2 size={14} /> Vider le carnet
            </button>
          </div>
        )}
      </header>

      {/* ── Top Filters Row: Subject pills ─────────── */}
      {subjectsList.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Folder size={14} color="var(--accent-primary)" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Filtrer par matière / dossier :
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            <button
              type="button"
              onClick={() => setSelectedFolderFilter('all')}
              style={{
                background: selectedFolderFilter === 'all' ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                color: selectedFolderFilter === 'all' ? '#ffffff' : 'var(--text-secondary)',
                border: selectedFolderFilter === 'all' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                padding: '0.35rem 0.8rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Layers size={13} />
              <span>Toutes les matières</span>
              <span style={{ opacity: 0.85, fontSize: '0.72rem' }}>({errors.length})</span>
            </button>

            {subjectsList.map(subj => {
              const isSelected = selectedFolderFilter === subj.name;
              return (
                <button
                  key={subj.name}
                  type="button"
                  onClick={() => setSelectedFolderFilter(subj.name)}
                  style={{
                    background: isSelected ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                    color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                    border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    padding: '0.35rem 0.8rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.78rem',
                    fontWeight: isSelected ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Folder size={12} />
                  <span>{subj.name}</span>
                  <span style={{ 
                    background: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(225, 29, 72, 0.1)', 
                    color: isSelected ? '#ffffff' : 'var(--accent-primary)',
                    padding: '0.1rem 0.35rem', 
                    borderRadius: '999px',
                    fontSize: '0.68rem',
                    fontWeight: 700 
                  }}>
                    {subj.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Sub-Filters & Search ───────────────────── */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        gap: '1rem', 
        marginBottom: '1.5rem', 
        flexWrap: 'wrap' 
      }}>
        {/* Type pills */}
        <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-elevated)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <button
            type="button"
            onClick={() => setFilterType('all')}
            style={{
              background: filterType === 'all' ? 'var(--bg-secondary)' : 'transparent',
              color: filterType === 'all' ? 'var(--text-primary)' : 'var(--text-muted)',
              border: 'none',
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Tous ({baseFilteredErrors.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('mcq')}
            style={{
              background: filterType === 'mcq' ? 'var(--bg-secondary)' : 'transparent',
              color: filterType === 'mcq' ? 'var(--text-primary)' : 'var(--text-muted)',
              border: 'none',
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            QCM ({baseFilteredErrors.filter(e => e.type === 'mcq').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('flashcard')}
            style={{
              background: filterType === 'flashcard' ? 'var(--bg-secondary)' : 'transparent',
              color: filterType === 'flashcard' ? 'var(--text-primary)' : 'var(--text-muted)',
              border: 'none',
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Flashcards ({baseFilteredErrors.filter(e => e.type === 'flashcard').length})
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: 'min(360px, 100%)' }}>
          <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Rechercher une notion ou un cours..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input"
            style={{
              width: '100%',
              padding: '0.5rem 0.85rem 0.5rem 2.4rem',
              fontSize: '0.85rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>

      {/* ── Active Practice Box ─────────────────────── */}
      {activePracticeItem && (
        <div style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--bg-secondary)',
          border: '1.5px solid var(--accent-primary)',
          boxShadow: '0 12px 32px rgba(225, 29, 72, 0.12)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', background: 'var(--accent-light)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)' }}>
                Entraînement direct
              </span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {activePracticeItem.courseName}
              </span>
            </div>
            <button
              onClick={() => setActivePracticeItem(null)}
              className="btn btn-outline"
              style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}
            >
              Fermer l'exercice
            </button>
          </div>

          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem', lineHeight: 1.5 }}>
            {activePracticeItem.question}
          </h3>

          {activePracticeItem.type === 'mcq' && activePracticeItem.options && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {activePracticeItem.options.map((opt, i) => {
                const isSelected = practiceSelected.includes(opt);
                const isCorrect = activePracticeItem.correctAnswers?.includes(opt);
                let borderStyle = '1px solid var(--border-color)';
                let bgStyle = 'var(--bg-elevated)';
                let textStyle = 'var(--text-primary)';

                if (practiceAnswerChecked) {
                  if (isCorrect) {
                    borderStyle = '1.5px solid var(--success)';
                    bgStyle = 'var(--success-light)';
                    textStyle = 'var(--success)';
                  } else if (isSelected && !isCorrect) {
                    borderStyle = '1.5px solid var(--danger)';
                    bgStyle = 'var(--danger-light)';
                    textStyle = 'var(--danger)';
                  }
                } else if (isSelected) {
                  borderStyle = '1.5px solid var(--accent-primary)';
                  bgStyle = 'var(--accent-light)';
                }

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => togglePracticeOption(opt)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: borderStyle,
                      background: bgStyle,
                      color: textStyle,
                      textAlign: 'left',
                      cursor: practiceAnswerChecked ? 'default' : 'pointer',
                      fontSize: '0.88rem',
                      fontFamily: 'inherit',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: '1px solid currentColor',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      flexShrink: 0
                    }}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span style={{ flex: 1 }}>{opt}</span>
                    {practiceAnswerChecked && isCorrect && <Check size={16} color="var(--success)" />}
                  </button>
                );
              })}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', alignItems: 'center' }}>
                {!practiceAnswerChecked ? (
                  <button
                    type="button"
                    onClick={() => setPracticeAnswerChecked(true)}
                    className="btn btn-primary"
                    disabled={practiceSelected.length === 0}
                    style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}
                  >
                    Vérifier ma réponse
                  </button>
                ) : (
                  <>
                    {isMcqCorrectlySolved ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: 600, fontSize: '0.88rem' }}>
                        <CheckCircle2 size={18} /> Bravo, c'est la bonne réponse !
                        <button
                          onClick={() => handleRemoveOne(activePracticeItem.id)}
                          className="btn btn-outline"
                          style={{ marginLeft: '1rem', fontSize: '0.78rem', borderColor: 'var(--success)', color: 'var(--success)' }}
                        >
                          Retirer du carnet d'erreurs
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', fontSize: '0.88rem' }}>
                        <AlertTriangle size={18} /> Encore une petite hésitation !
                        <button
                          onClick={() => {
                            setPracticeSelected([]);
                            setPracticeAnswerChecked(false);
                          }}
                          className="btn btn-outline"
                          style={{ marginLeft: '0.5rem', fontSize: '0.78rem' }}
                        >
                          <RotateCcw size={13} /> Réessayer
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {activePracticeItem.type === 'flashcard' && (
            <div>
              <div style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-color)',
                marginBottom: '1rem'
              }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Réponse cachée :</span>
                {practiceAnswerChecked ? (
                  <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 500, lineHeight: 1.5 }}>
                    {activePracticeItem.back}
                  </p>
                ) : (
                  <button
                    onClick={() => setPracticeAnswerChecked(true)}
                    className="btn btn-outline"
                    style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
                  >
                    <Eye size={14} /> Révéler la réponse
                  </button>
                )}
              </div>

              {practiceAnswerChecked && (
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => handleRemoveOne(activePracticeItem.id)}
                    className="btn btn-primary"
                    style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
                  >
                    <Check size={14} /> Je la sais maintenant (Retirer)
                  </button>
                  <button
                    onClick={() => setPracticeAnswerChecked(false)}
                    className="btn btn-outline"
                    style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
                  >
                    Garder dans le carnet
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Empty State ────────────────────────────── */}
      {errors.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-color)',
          maxWidth: '520px',
          margin: '2rem auto'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'var(--success-light)',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem'
          }}>
            <CheckCircle2 size={26} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>
            Aucune erreur enregistrée !
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
            Quand tu te trompes sur un QCM ou que tu cliques sur <em>« À revoir »</em> dans une session de flashcards, les questions s'ajouteront automatiquement ici pour que tu puisses les revoir par matière en 1 clic.
          </p>
        </div>
      ) : filteredErrors.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Aucune erreur ne correspond à ce filtre ou cette matière.
        </div>
      ) : (
        /* ── Grouped Sections by Subject ─────────────── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {Array.from(groupedErrors.entries()).map(([subjectName, itemsInSubject]) => {
            const currentSubjectLimit = subjectLimits[subjectName] ?? 3;
            const visibleItemsInSubject = filterType === 'all'
              ? itemsInSubject
              : itemsInSubject.slice(0, currentSubjectLimit);
            const hasMoreInSubject = filterType !== 'all' && visibleItemsInSubject.length < itemsInSubject.length;

            return (
              <section key={subjectName}>
                {/* Section Header: Subject name */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: '1rem',
                  paddingBottom: '0.5rem',
                  borderBottom: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Folder size={17} color="var(--accent-primary)" />
                    <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {subjectName}
                    </h2>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--accent-primary)',
                      background: 'var(--accent-light)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-full)'
                    }}>
                      {itemsInSubject.length} question{itemsInSubject.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Grid of cards in this subject */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
                  {visibleItemsInSubject.map((item) => {
                    const isRevealed = Boolean(revealedIds[item.id]);

                    return (
                      <div 
                        key={item.id}
                        className="card"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          padding: '1.25rem',
                          borderRadius: 'var(--radius-lg)',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          position: 'relative'
                        }}
                      >
                        {/* Header row: Course name & badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.85rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span style={{ 
                              fontSize: '0.7rem', 
                              fontWeight: 600, 
                              color: item.type === 'mcq' ? '#f59e0b' : 'var(--accent-primary)',
                              background: item.type === 'mcq' ? 'rgba(245, 158, 11, 0.12)' : 'var(--accent-light)',
                              border: `1px solid ${item.type === 'mcq' ? 'rgba(245, 158, 11, 0.25)' : 'var(--accent-glow)'}`,
                              padding: '0.15rem 0.45rem', 
                              borderRadius: 'var(--radius-sm)',
                              textTransform: 'uppercase'
                            }}>
                              {item.type === 'mcq' ? 'QCM' : 'Flashcard'}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                              {item.courseName}
                            </span>
                          </div>

                          {item.failCount > 1 && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600, background: 'var(--danger-light)', padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-sm)' }}>
                              Raté {item.failCount}x
                            </span>
                          )}
                        </div>

                        {/* Question body */}
                        <div style={{ flex: 1, marginBottom: '1rem' }}>
                          <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                            {item.question}
                          </p>

                          {/* MCQ Options preview if revealed */}
                          {item.type === 'mcq' && item.options && isRevealed && (
                            <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                              {item.options.map((opt, oIdx) => {
                                const isCorrect = item.correctAnswers?.includes(opt);
                                const wasSelected = item.userSelected?.includes(opt);

                                return (
                                  <div 
                                    key={oIdx}
                                    style={{
                                      fontSize: '0.82rem',
                                      padding: '0.4rem 0.65rem',
                                      borderRadius: 'var(--radius-sm)',
                                      background: isCorrect ? 'var(--success-light)' : wasSelected ? 'var(--danger-light)' : 'var(--bg-elevated)',
                                      border: isCorrect ? '1px solid rgba(16, 185, 129, 0.3)' : wasSelected ? '1px solid rgba(220, 38, 38, 0.3)' : '1px solid var(--border-subtle)',
                                      color: isCorrect ? 'var(--success)' : wasSelected ? 'var(--danger)' : 'var(--text-secondary)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: '0.5rem'
                                    }}
                                  >
                                    <span>{opt}</span>
                                    {isCorrect && <Check size={13} color="var(--success)" />}
                                    {!isCorrect && wasSelected && <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Ta sélection</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Flashcard back if revealed */}
                          {item.type === 'flashcard' && item.back && isRevealed && (
                            <div style={{ marginTop: '0.85rem', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Réponse attendue :</span>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                                {item.back}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Footer action buttons */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button
                              type="button"
                              onClick={() => toggleReveal(item.id)}
                              className="btn btn-outline"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                              title={isRevealed ? "Cacher la correction" : "Voir la correction"}
                            >
                              {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                              <span>{isRevealed ? 'Cacher' : 'Solution'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => startPractice(item)}
                              className="btn btn-primary"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                            >
                              <RotateCcw size={13} /> Re-tester
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveOne(item.id)}
                            className="btn btn-outline"
                            style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}
                            title="Supprimer du carnet"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Per-subject "Voir plus" button (+10) in QCM / Flashcards tabs */}
                {hasMoreInSubject && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setSubjectLimits(prev => ({ ...prev, [subjectName]: (prev[subjectName] ?? 3) + 10 }))}
                      className="btn btn-outline"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        padding: '0.5rem 1.25rem',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-full)'
                      }}
                    >
                      <ChevronDown size={15} /> Voir plus ({itemsInSubject.length - visibleItemsInSubject.length} restante{itemsInSubject.length - visibleItemsInSubject.length > 1 ? 's' : ''})
                    </button>
                  </div>
                )}
              </section>
            );
          })}

          {/* Global "Voir plus" button (+30) in "Tous" tab */}
          {filterType === 'all' && allTabLimit < filteredErrors.length && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setAllTabLimit(prev => prev + 30)}
                className="btn btn-outline"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.5rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-full)'
                }}
              >
                <ChevronDown size={16} /> Voir plus ({filteredErrors.length - allTabLimit} restante{filteredErrors.length - allTabLimit > 1 ? 's' : ''})
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
