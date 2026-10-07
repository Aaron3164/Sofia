import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Zap, CheckCircle2, Clock, RotateCcw, Award, Sparkles, BookOpen, 
  ChevronRight, ArrowRight, Play, Check, AlertCircle, Layers
} from 'lucide-react';
import { type FileNode } from '../../hooks/useFileSystem';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { OccludedImageViewer, type OcclusionRect } from './OccludedImageViewer';
import { 
  calculateNextSchedule, 
  getSchedulePreviews, 
  isCardDue, 
  type CardRating, 
  type SpacedCardData 
} from '../../lib/spaced-repetition';

export interface Flashcard extends SpacedCardData {
  id?: string;
  front: string;
  back: string;
  image?: string;
  imageSide?: 'front' | 'back' | 'both';
  occlusions?: OcclusionRect[];
}

interface CourseCardsBundle {
  courseId: string;
  courseName: string;
  cards: Flashcard[];
}

interface SessionQueueItem {
  id: string; // unique session item id
  card: Flashcard;
  courseId: string;
  courseName: string;
  cardIndex: number; // original index in course
  hasBeenFailed: boolean;
}

interface FolderRevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderId: string | null;
  folderName: string;
  allNodes: FileNode[];
}

export const FolderRevisionModal: React.FC<FolderRevisionModalProps> = ({
  isOpen,
  onClose,
  folderId,
  folderName,
  allNodes,
}) => {
  const { profile } = useAuth();
  
  // Loading & Data State
  const [loading, setLoading] = useState(true);
  const [courseBundles, setCourseBundles] = useState<CourseCardsBundle[]>([]);
  const [allCardsList, setAllCardsList] = useState<SessionQueueItem[]>([]);
  const [dueCardsList, setDueCardsList] = useState<SessionQueueItem[]>([]);

  // Session State
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [sessionQueue, setSessionQueue] = useState<SessionQueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Session Stats
  const [reviewedCount, setReviewedCount] = useState(0);
  const [againCount, setAgainCount] = useState(0);
  const [firstTrySuccessCount, setFirstTrySuccessCount] = useState(0);

  // Helper: Find all descendant courses in the folder
  const getDescendantCourses = (parentId: string | null): FileNode[] => {
    if (!parentId) {
      // Root library: all courses
      return allNodes.filter(n => n.type === 'course');
    }

    const courses: FileNode[] = [];
    const traverse = (pId: string) => {
      const children = allNodes.filter(n => n.parentId === pId);
      for (const child of children) {
        if (child.type === 'course') {
          courses.push(child);
        } else if (child.type === 'folder') {
          traverse(child.id);
        }
      }
    };
    traverse(parentId);
    return courses;
  };

  // Helper: Parse flashcard JSON
  const parseFlashcards = (data: any): Flashcard[] => {
    if (!data) return [];
    try {
      let jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
      const startIdx = jsonStr.indexOf('[');
      const endIdx = jsonStr.lastIndexOf(']');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        jsonStr = jsonStr.substring(startIdx, endIdx + 1);
      } else {
        jsonStr = jsonStr.replace(/```json\n?|```/g, '').trim();
      }
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  // Load cards when modal opens
  useEffect(() => {
    if (!isOpen) {
      setSessionStarted(false);
      setSessionFinished(false);
      setCurrentIndex(0);
      setIsFlipped(false);
      return;
    }

    const loadFolderCards = async () => {
      setLoading(true);
      const targetCourses = getDescendantCourses(folderId);
      const courseIds = targetCourses.map(c => c.id);

      const bundles: CourseCardsBundle[] = [];
      const cloudMap = new Map<string, any>();

      // 1. Fetch from Supabase
      if (profile && courseIds.length > 0) {
        try {
          const { data, error } = await supabase
            .from('course_data')
            .select('course_id, generations')
            .in('course_id', courseIds);

          if (!error && data) {
            data.forEach(row => {
              cloudMap.set(row.course_id, row.generations);
            });
          }
        } catch (err) {
          console.error('Error loading cloud cards for folder:', err);
        }
      }

      // 2. Combine with LocalStorage
      for (const course of targetCourses) {
        let cards: Flashcard[] = [];
        const cloudGenerations = cloudMap.get(course.id);
        
        if (cloudGenerations?.flashcards) {
          cards = parseFlashcards(cloudGenerations.flashcards);
        } else {
          const localStr = localStorage.getItem(`aura_subject_${course.id}`);
          if (localStr) {
            try {
              const parsed = JSON.parse(localStr);
              if (parsed?.generations?.flashcards) {
                cards = parseFlashcards(parsed.generations.flashcards);
              }
            } catch {}
          }
        }

        if (cards.length > 0) {
          bundles.push({
            courseId: course.id,
            courseName: course.name,
            cards
          });
        }
      }

      setCourseBundles(bundles);

      // Create flat items
      const allItems: SessionQueueItem[] = [];
      const dueItems: SessionQueueItem[] = [];

      bundles.forEach(bundle => {
        bundle.cards.forEach((card, idx) => {
          const item: SessionQueueItem = {
            id: `${bundle.courseId}_${idx}_${Date.now()}`,
            card,
            courseId: bundle.courseId,
            courseName: bundle.courseName,
            cardIndex: idx,
            hasBeenFailed: false,
          };
          allItems.push(item);
          if (isCardDue(card)) {
            dueItems.push(item);
          }
        });
      });

      setAllCardsList(allItems);
      setDueCardsList(dueItems);
      setLoading(false);
    };

    loadFolderCards();
  }, [isOpen, folderId, allNodes, profile]);

  // Start Session handler
  const handleStartSession = (mode: 'due' | 'all') => {
    const listToUse = mode === 'due' && dueCardsList.length > 0 ? dueCardsList : allCardsList;
    // Shuffle queue for optimal interleaved learning
    const shuffled = [...listToUse].sort(() => Math.random() - 0.5);
    setSessionQueue(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setReviewedCount(0);
    setAgainCount(0);
    setFirstTrySuccessCount(0);
    setSessionStarted(true);
    setSessionFinished(false);
  };

  // Save Card SM-2 Update to Cloud and LocalStorage
  const persistCardUpdate = async (courseId: string, cardIndex: number, updatedCard: Flashcard) => {
    // 1. Update in-memory bundles
    setCourseBundles(prev => {
      return prev.map(bundle => {
        if (bundle.courseId === courseId) {
          const newCards = [...bundle.cards];
          newCards[cardIndex] = updatedCard;
          return { ...bundle, cards: newCards };
        }
        return bundle;
      });
    });

    // 2. Update LocalStorage
    const localKey = `aura_subject_${courseId}`;
    const localStr = localStorage.getItem(localKey);
    let existingGenerations: any = {};
    if (localStr) {
      try {
        const parsed = JSON.parse(localStr);
        existingGenerations = parsed.generations || {};
        existingGenerations.flashcards = courseBundles
          .find(b => b.courseId === courseId)?.cards
          .map((c, i) => (i === cardIndex ? updatedCard : c)) || [updatedCard];
        parsed.generations = existingGenerations;
        localStorage.setItem(localKey, JSON.stringify(parsed));
      } catch {}
    }

    // 3. Update Supabase
    if (profile) {
      try {
        // Fetch current course_data generations to safely merge
        const { data } = await supabase
          .from('course_data')
          .select('generations')
          .eq('course_id', courseId)
          .single();

        const currentGen = data?.generations || existingGenerations;
        const targetBundle = courseBundles.find(b => b.courseId === courseId);
        const updatedCardsList = targetBundle?.cards.map((c, i) => (i === cardIndex ? updatedCard : c)) || [updatedCard];

        const newGenerations = {
          ...currentGen,
          flashcards: updatedCardsList
        };

        await supabase.from('course_data').upsert({
          user_id: profile.id,
          course_id: courseId,
          generations: newGenerations,
          updated_at: new Date().toISOString()
        }, { onConflict: 'course_id' });
      } catch (e) {
        console.error('Failed to sync card to cloud:', e);
      }
    }
  };

  // Grade Card Handler (Anki SM-2)
  const handleRateCard = async (rating: CardRating) => {
    if (sessionQueue.length === 0 || currentIndex >= sessionQueue.length) return;

    const currentItem = sessionQueue[currentIndex];
    const updatedSchedule = calculateNextSchedule(currentItem.card, rating);
    const updatedCard: Flashcard = {
      ...currentItem.card,
      ...updatedSchedule
    };

    // Save immediately to Cloud and Local
    persistCardUpdate(currentItem.courseId, currentItem.cardIndex, updatedCard);

    setReviewedCount(prev => prev + 1);

    if (rating === 1) {
      // Again: Re-insert card at end of session queue!
      setAgainCount(prev => prev + 1);
      const failedItem: SessionQueueItem = {
        ...currentItem,
        card: updatedCard,
        hasBeenFailed: true,
        id: `${currentItem.courseId}_${currentItem.cardIndex}_retry_${Date.now()}`
      };

      setSessionQueue(prev => [...prev, failedItem]);
    } else {
      if (!currentItem.hasBeenFailed) {
        setFirstTrySuccessCount(prev => prev + 1);
      }
    }

    // Move to next card or finish
    setIsFlipped(false);
    if (currentIndex + 1 >= sessionQueue.length && rating !== 1) {
      setSessionFinished(true);
    } else {
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 120);
    }
  };

  // Keyboard navigation during session
  useEffect(() => {
    if (!sessionStarted || sessionFinished) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (isFlipped) {
        if (e.key === '1' || e.key === '&' || e.code === 'Digit1' || e.code === 'Numpad1') {
          e.preventDefault();
          handleRateCard(1);
        } else if (e.key === '2' || e.key === 'é' || e.code === 'Digit2' || e.code === 'Numpad2') {
          e.preventDefault();
          handleRateCard(2);
        } else if (e.key === '3' || e.key === '"' || e.code === 'Digit3' || e.code === 'Numpad3') {
          e.preventDefault();
          handleRateCard(3);
        } else if (e.key === '4' || e.key === "'" || e.code === 'Digit4' || e.code === 'Numpad4') {
          e.preventDefault();
          handleRateCard(4);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sessionStarted, sessionFinished, isFlipped, currentIndex, sessionQueue]);

  if (!isOpen) return null;

  const currentItem = sessionQueue[currentIndex];
  const previews = currentItem ? getSchedulePreviews(currentItem.card) : null;

  const showFrontImage = Boolean(
    currentItem?.card.image && 
    (currentItem.card.imageSide === 'front' || currentItem.card.imageSide === 'both' || !currentItem.card.imageSide)
  );

  const showBackImage = Boolean(
    currentItem?.card.image && 
    (currentItem.card.imageSide === 'back' || currentItem.card.imageSide === 'both' || !currentItem.card.imageSide)
  );

  const cardMaxWidth = (showFrontImage || showBackImage) ? '860px' : '580px';

  // Calculate live counts in current queue
  const remainingCards = sessionQueue.slice(currentIndex);
  const countNew = remainingCards.filter(i => !i.card.state || i.card.state === 'new').length;
  const countLearning = remainingCards.filter(i => i.card.state === 'learning' || i.card.state === 'relearning').length;
  const countReview = remainingCards.filter(i => i.card.state === 'review').length;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(5, 7, 15, 0.88)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        animation: 'fadeIn 0.25s ease-out',
        color: 'var(--text-primary)',
      }}
    >
      {/* 1. MODAL STATE: LOADING */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div className="animate-spin" style={{ width: '44px', height: '44px', border: '3px solid var(--accent-primary)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Rassemblement des flashcards du dossier...</p>
        </div>
      )}

      {/* 2. MODAL STATE: SESSION LAUNCHER */}
      {!loading && !sessionStarted && (
        <div 
          className="glass-panel"
          style={{
            width: '100%',
            maxWidth: '620px',
            borderRadius: '1.75rem',
            padding: '2.5rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.75rem',
            position: 'relative'
          }}
        >
          {/* Close button */}
          <button 
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1.5rem',
              right: '1.5rem',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '50%',
            }}
          >
            <X size={20} />
          </button>

          {/* Header */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)', padding: '0.35rem 0.85rem', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              <Zap size={15} /> Répétition Espacée SM-2
            </div>
            <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.6rem', fontWeight: 700 }}>
              Révision Globale : {folderName}
            </h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Révisez toutes les notions des cours de ce dossier grâce à l'algorithme d'espacement Anki (0 token, 100% instantané).
            </p>
          </div>

          {/* Stats Badges */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '1rem', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                {courseBundles.length}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Cours inclus
              </div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '1rem', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>
                {dueCardsList.length}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                À réviser aujourd'hui
              </div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '1rem', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {allCardsList.length}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Total des cartes
              </div>
            </div>
          </div>

          {/* Action Options */}
          {allCardsList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--bg-elevated)', borderRadius: '1rem', border: '1px dashed var(--border-color)' }}>
              <AlertCircle size={32} style={{ color: 'var(--text-secondary)', opacity: 0.5, marginBottom: '0.5rem' }} />
              <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>Aucune flashcard dans ce dossier</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Créez ou générez des flashcards dans vos cours pour lancer une révision globale.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {dueCardsList.length > 0 ? (
                <button
                  className="btn btn-primary hover-lift"
                  onClick={() => handleStartSession('due')}
                  style={{
                    padding: '1rem 1.5rem',
                    fontSize: '1rem',
                    fontWeight: 600,
                    borderRadius: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.6rem',
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                  }}
                >
                  <Play size={18} /> Réviser les {dueCardsList.length} cartes du jour
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '0.75rem', color: '#10b981', fontSize: '0.9rem', fontWeight: 500 }}>
                  <Check size={18} /> Toutes vos cartes sont à jour pour aujourd'hui !
                </div>
              )}

              <button
                className="btn btn-outline hover-lift"
                onClick={() => handleStartSession('all')}
                style={{
                  padding: '0.85rem 1.25rem',
                  fontSize: '0.95rem',
                  borderRadius: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <Layers size={17} /> Révision libre (Toutes les {allCardsList.length} cartes)
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. MODAL STATE: ACTIVE STUDY SESSION */}
      {!loading && sessionStarted && !sessionFinished && currentItem && (
        <div 
          style={{
            width: '100%',
            maxWidth: cardMaxWidth,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          {/* Top Bar Navigation & Anki Counter */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button 
                onClick={onClose}
                className="btn btn-outline"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                title="Quitter la session"
              >
                <X size={15} /> Quitter
              </button>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {folderName}
              </span>
            </div>

            {/* Anki Live Counts Badges */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '0.5rem', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }} title="Nouvelles cartes">
                🌱 {countNew}
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '0.5rem', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }} title="Cartes en apprentissage">
                🔄 {countLearning}
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '0.5rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }} title="Cartes en révision">
                ⭐ {countReview}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ width: '100%', height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
            <div 
              style={{ 
                height: '100%', 
                width: `${Math.min(100, (currentIndex / sessionQueue.length) * 100)}%`, 
                background: 'linear-gradient(90deg, var(--accent-primary), #10b981)',
                transition: 'width 0.3s ease'
              }} 
            />
          </div>

          {/* Source Course Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            <BookOpen size={14} color="var(--accent-primary)" />
            <span>Cours : <strong>{currentItem.courseName}</strong></span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span>Carte {currentIndex + 1} / {sessionQueue.length}</span>
          </div>

          {/* 3D Flip Flashcard */}
          <div 
            onClick={() => setIsFlipped(prev => !prev)}
            style={{
              width: '100%',
              minHeight: '340px',
              perspective: '1200px',
              cursor: 'pointer',
              userSelect: 'none',
              marginTop: '0.5rem'
            }}
          >
            <div 
              style={{
                width: '100%',
                height: '100%',
                minHeight: '340px',
                position: 'relative',
                transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateX(180deg)' : 'none'
              }}
            >
              {/* RECTO (Question Side) */}
              <div 
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  backfaceVisibility: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: showFrontImage ? '1.25rem' : '2.25rem',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-elevated)',
                  borderRadius: '1.75rem',
                  border: '1.5px solid var(--border-color)',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
                  overflowY: 'auto'
                }}
              >
                {showFrontImage && currentItem.card.image && (
                  <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
                    <OccludedImageViewer
                      imageUrl={currentItem.card.image}
                      occlusions={currentItem.card.occlusions}
                      isRevealed={false}
                      maxHeight="440px"
                      alt="Question Illustration"
                    />
                  </div>
                )}
                {currentItem.card.front && (
                  <div style={{
                    fontSize: showFrontImage ? '1.1rem' : '1.35rem',
                    fontWeight: 600,
                    lineHeight: 1.5,
                    color: 'var(--text-primary)',
                    maxWidth: '92%'
                  }}>
                    {currentItem.card.front}
                  </div>
                )}
                <div style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: 0.7 }}>
                  <span>Appuyez sur <kbd style={{ padding: '0.15rem 0.4rem', background: 'var(--bg-primary)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>Espace</kbd> pour afficher la réponse</span>
                </div>
              </div>

              {/* VERSO (Answer Side) */}
              <div 
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  backfaceVisibility: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: showBackImage ? '1.25rem' : '2.25rem',
                  textAlign: 'center',
                  backgroundColor: 'var(--accent-primary)',
                  color: '#ffffff',
                  borderRadius: '1.75rem',
                  transform: 'rotateX(180deg)',
                  boxShadow: '0 10px 30px rgba(99, 102, 241, 0.25)',
                  overflowY: 'auto'
                }}
              >
                {showBackImage && currentItem.card.image && (
                  <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
                    <OccludedImageViewer
                      imageUrl={currentItem.card.image}
                      occlusions={currentItem.card.occlusions}
                      isRevealed={true}
                      maxHeight="440px"
                      alt="Réponse Illustration"
                    />
                  </div>
                )}
                {currentItem.card.back && (
                  <div style={{
                    fontSize: showBackImage ? '1.05rem' : '1.25rem',
                    lineHeight: 1.55,
                    fontWeight: 500,
                    color: '#ffffff',
                    maxWidth: '92%'
                  }}>
                    {currentItem.card.back}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Rating Bar & Anki SM-2 Grading */}
          <div style={{ width: '100%', marginTop: '1rem' }}>
            {isFlipped && previews ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', width: '100%' }}>
                {/* 1. À revoir (Again) */}
                <button
                  className="hover-lift"
                  onClick={() => handleRateCard(1)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.9rem 0.5rem',
                    borderRadius: '1.2rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1.5px solid rgba(239, 68, 68, 0.45)',
                    color: '#ef4444',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  title="Touche 1 : À revoir"
                >
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    <span style={{ opacity: 0.6, marginRight: '0.25rem' }}>1</span> À revoir
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.95, background: 'rgba(239, 68, 68, 0.2)', padding: '0.15rem 0.55rem', borderRadius: '0.4rem' }}>
                    {previews.again.label}
                  </span>
                </button>

                {/* 2. Difficile (Hard) */}
                <button
                  className="hover-lift"
                  onClick={() => handleRateCard(2)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.9rem 0.5rem',
                    borderRadius: '1.2rem',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    border: '1.5px solid rgba(245, 158, 11, 0.45)',
                    color: '#f59e0b',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  title="Touche 2 : Difficile"
                >
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    <span style={{ opacity: 0.6, marginRight: '0.25rem' }}>2</span> Difficile
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.95, background: 'rgba(245, 158, 11, 0.2)', padding: '0.15rem 0.55rem', borderRadius: '0.4rem' }}>
                    {previews.hard.label}
                  </span>
                </button>

                {/* 3. Correct (Good) */}
                <button
                  className="hover-lift"
                  onClick={() => handleRateCard(3)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.9rem 0.5rem',
                    borderRadius: '1.2rem',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    border: '1.5px solid rgba(16, 185, 129, 0.45)',
                    color: '#10b981',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  title="Touche 3 : Correct"
                >
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    <span style={{ opacity: 0.6, marginRight: '0.25rem' }}>3</span> Correct
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.95, background: 'rgba(16, 185, 129, 0.2)', padding: '0.15rem 0.55rem', borderRadius: '0.4rem' }}>
                    {previews.good.label}
                  </span>
                </button>

                {/* 4. Facile (Easy) */}
                <button
                  className="hover-lift"
                  onClick={() => handleRateCard(4)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.9rem 0.5rem',
                    borderRadius: '1.2rem',
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    border: '1.5px solid rgba(99, 102, 241, 0.45)',
                    color: '#6366f1',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  title="Touche 4 : Facile"
                >
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    <span style={{ opacity: 0.6, marginRight: '0.25rem' }}>4</span> Facile
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.95, background: 'rgba(99, 102, 241, 0.2)', padding: '0.15rem 0.55rem', borderRadius: '0.4rem' }}>
                    {previews.easy.label}
                  </span>
                </button>
              </div>
            ) : (
              <button
                className="btn btn-primary hover-lift shadow-md"
                onClick={() => setIsFlipped(true)}
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1.05rem',
                  fontWeight: 600,
                  borderRadius: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                Afficher la Réponse <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>(Espace)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. MODAL STATE: SESSION FINISHED / CELEBRATION */}
      {!loading && sessionFinished && (
        <div 
          className="glass-panel"
          style={{
            width: '100%',
            maxWidth: '560px',
            borderRadius: '1.75rem',
            padding: '2.5rem',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
          }}
        >
          <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Award size={36} />
          </div>

          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
              Session de révision terminée ! 🎉
            </h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Toutes les cartes du dossier <strong>{folderName}</strong> prévues pour aujourd'hui ont été traitées.
            </p>
          </div>

          {/* Performance Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', width: '100%' }}>
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '1rem', padding: '1.25rem' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                {reviewedCount}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Cartes révisées
              </div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '1rem', padding: '1.25rem' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#10b981' }}>
                {reviewedCount > 0 ? Math.round((firstTrySuccessCount / (reviewedCount - againCount || 1)) * 100) : 100}%
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Rétention au 1er coup
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '0.5rem' }}>
            <button
              className="btn btn-primary"
              onClick={onClose}
              style={{ flex: 1, padding: '0.85rem', borderRadius: '1rem', fontWeight: 600 }}
            >
              Terminer & Retourner aux cours
            </button>
            <button
              className="btn btn-outline"
              onClick={() => handleStartSession('all')}
              style={{ padding: '0.85rem 1.25rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              title="Relancer une révision libre"
            >
              <RotateCcw size={16} /> Révision libre
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
