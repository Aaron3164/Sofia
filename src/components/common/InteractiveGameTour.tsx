import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowRight, 
  Check, 
  X, 
  BookOpen, 
  Zap, 
  CheckCircle2, 
  BarChart3, 
  GraduationCap 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDemoCourseId, forceSeedDemoCourse } from '../../lib/OnboardingHelper';

export interface GameTourStep {
  id: string;
  badge: string;
  title: string;
  description: string;
  tab?: 'resume' | 'flashcards' | 'mcq' | 'explications';
  targetPath?: (courseId: string) => string;
  actionText: string;
}

export const GAME_TOUR_STEPS: GameTourStep[] = [
  {
    id: 'demo-resume',
    badge: 'Étape 1 / 5 • Cours & Résumé',
    title: 'Le Résumé Structuré & Export PDF 📝',
    description: "Bienvenue dans votre cours démo ! SofIA extrait automatiquement les notions fondamentales et détecte les mots en gras. Vous pouvez surligner, modifier le contenu ou télécharger la fiche au format PDF prêt à imprimer (sans mention d'IA en Premium).",
    tab: 'resume',
    targetPath: (cid) => `/subject/${cid}`,
    actionText: 'Continuer : Flashcards Anki ➔'
  },
  {
    id: 'demo-flashcards',
    badge: 'Étape 2 / 5 • Répétition Espacée',
    title: 'Flashcards & Algorithme Anki SM-2 ⚡',
    description: "Passez en mode apprentissage actif ! L'algorithme SM-2 déterministe (0 token) planifie vos révisions juste avant l'oubli. Raccourcis claviers fluides : Espace pour retourner la carte, 1 à 4 pour vous auto-évaluer. Supporte aussi les masques d'occlusion sur schéma (Ctrl+V) !",
    tab: 'flashcards',
    targetPath: (cid) => `/subject/${cid}`,
    actionText: 'Continuer : Les QCM ➔'
  },
  {
    id: 'demo-mcq',
    badge: 'Étape 3 / 5 • Entraînement Examen',
    title: 'QCM Universitaires & Correction Pédagogique ✅',
    description: "Entraînez-vous avec des QCM conformes aux exigences d'examen. Dès validation, cliquez sur 'Voir la correction détaillée' : Sofia formule une explication pédagogique instantanée et naturelle en 1 phrase basée sur le document.",
    tab: 'mcq',
    targetPath: (cid) => `/subject/${cid}`,
    actionText: 'Continuer vers les Statistiques ➔'
  },
  {
    id: 'stats-overview',
    badge: 'Étape 4 / 5 • Cockpit de Performance',
    title: 'Statistiques & Suivi de Rétention 📊',
    description: "Visualisez l'ensemble de votre travail d'étude : vos notes aux annales d'examen, vos scores cumulés aux QCM et votre temps d'étude actif réel pour mesurer vos progrès jour après jour.",
    targetPath: () => '/statistics',
    actionText: 'Continuer vers la Bibliothèque ➔'
  },
  {
    id: 'library-actions',
    badge: 'Étape 5 / 5 • Fonctionnalités Clés',
    title: 'Importer une Annale & Réviser un Dossier 🎯',
    description: "Deux super-pouvoirs dans votre Bibliothèque :\n• 🎓 **Importer une annale** : Retranscription mot pour mot (0 token, 0 hallucination), extraction des schémas d'origine et chronomètre d'examen.\n• ⚡ **Réviser le dossier (l'éclair)** : Révisez toutes les flashcards de toutes vos matières en une seule session SM-2 globale !",
    targetPath: () => '/',
    actionText: '🎉 Terminer le tutoriel !'
  }
];

export const InteractiveGameTour: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  const step = GAME_TOUR_STEPS[currentStep];
  const isLast = currentStep === GAME_TOUR_STEPS.length - 1;

  const [isMinimized, setIsMinimized] = useState(false);

  // Execute step transitions (route change, tab switch, spotlights)
  const applyStepEffects = useCallback((stepIdx: number, courseId: string | null) => {
    const s = GAME_TOUR_STEPS[stepIdx];
    if (!s) return;

    // 1. Navigation
    if (s.targetPath && courseId) {
      const destination = s.targetPath(courseId);
      if (location.pathname !== destination) {
        navigate(destination);
      }
    } else if (s.targetPath && !courseId && (stepIdx === 3 || stepIdx === 4)) {
      const destination = s.targetPath('');
      if (location.pathname !== destination) {
        navigate(destination);
      }
    }

    // 2. Tab switch in course
    if (s.tab) {
      // Delay slightly so SubjectDetail has mounted if navigating
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('tour-switch-tab', { detail: s.tab }));
      }, 150);
    }

    // 3. Spotlight highlights on step 4 (Library buttons)
    setTimeout(() => {
      document.querySelectorAll('.tour-highlight-active').forEach(el => {
        el.classList.remove('tour-highlight-active');
      });

      if (stepIdx === 4) {
        const annaleButtons = document.querySelectorAll('[data-tour="tour-annale-btn"]');
        const revisionButtons = document.querySelectorAll('[data-tour="tour-revision-btn"]');
        annaleButtons.forEach(btn => btn.classList.add('tour-highlight-active'));
        revisionButtons.forEach(btn => btn.classList.add('tour-highlight-active'));
      }
    }, 250);
  }, [location.pathname, navigate]);

  // Start Tour Handler
  const startTour = useCallback((targetCourseId?: string) => {
    const cId = targetCourseId || getDemoCourseId(profile?.id) || '';
    setActiveCourseId(cId);
    setCurrentStep(0);
    setIsActive(true);
    setIsMinimized(false);
    localStorage.setItem('sofia_game_tour_active', 'true');
    applyStepEffects(0, cId);
  }, [profile?.id, applyStepEffects]);

  // Stop Tour Handler
  const stopTour = useCallback(() => {
    setIsActive(false);
    localStorage.removeItem('sofia_game_tour_active');
    localStorage.setItem('sofia_game_tour_completed', 'true');
    document.querySelectorAll('.tour-highlight-active').forEach(el => {
      el.classList.remove('tour-highlight-active');
    });
  }, []);

  // Next Step Handler
  const handleNext = () => {
    if (isLast) {
      stopTour();
    } else {
      const nextIdx = currentStep + 1;
      setCurrentStep(nextIdx);
      applyStepEffects(nextIdx, activeCourseId);
    }
  };

  // Listen for global start/stop/open events
  useEffect(() => {
    const onStart = (e: any) => {
      startTour(e.detail?.courseId);
    };
    const onStop = () => {
      stopTour();
    };
    const onOpen = async () => {
      try {
        const res = await forceSeedDemoCourse(profile?.id);
        const cId = res?.courseId || getDemoCourseId(profile?.id);
        if (cId) {
          startTour(cId);
        }
      } catch (err) {
        console.error('Failed to launch tour from event:', err);
      }
    };

    window.addEventListener('start-game-tour', onStart);
    window.addEventListener('stop-game-tour', onStop);
    window.addEventListener('open-onboarding-tour', onOpen);

    return () => {
      window.removeEventListener('start-game-tour', onStart);
      window.removeEventListener('stop-game-tour', onStop);
      window.removeEventListener('open-onboarding-tour', onOpen);
    };
  }, [profile?.id, startTour, stopTour]);

  // Clean up highlights on unmount
  useEffect(() => {
    return () => {
      document.querySelectorAll('.tour-highlight-active').forEach(el => {
        el.classList.remove('tour-highlight-active');
      });
    };
  }, []);

  if (!isActive) return null;

  const stepIcons = [
    <BookOpen size={18} color="#3b82f6" />,
    <Zap size={18} color="#f59e0b" />,
    <CheckCircle2 size={18} color="#10b981" />,
    <BarChart3 size={18} color="#06b6d4" />,
    <GraduationCap size={18} color="#ec4899" />
  ];

  // Minimized Floating Pill View
  if (isMinimized) {
    return (
      <div
        style={{
          position: 'fixed',
          top: '4.5rem',
          right: '1.5rem',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.5rem 0.85rem',
          backgroundColor: 'var(--bg-elevated, #ffffff)',
          borderRadius: '2rem',
          border: '1.5px solid var(--accent-primary, #6366f1)',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(12px)',
          cursor: 'pointer'
        }}
        onClick={() => setIsMinimized(false)}
        title="Agrandir le guide"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Sparkles size={16} color="var(--accent-primary)" />
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Visite guidée ({currentStep + 1}/5)
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            stopTour();
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex'
          }}
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '4.75rem',
        right: '1.5rem',
        zIndex: 99999,
        width: '380px',
        maxWidth: 'calc(100vw - 3rem)',
        backgroundColor: 'var(--bg-elevated, #ffffff)',
        borderRadius: '0.95rem',
        border: '1.5px solid var(--accent-primary, #6366f1)',
        boxShadow: '0 16px 36px rgba(0, 0, 0, 0.25), 0 0 16px rgba(99, 102, 241, 0.2)',
        backdropFilter: 'blur(16px)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        animation: 'gameTourSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          padding: '0.5rem 0.85rem',
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.12) 0%, rgba(219, 39, 119, 0.12) 100%)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {stepIcons[currentStep] || <Sparkles size={13} color="var(--accent-primary)" />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {step.badge}
            </span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {step.title}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', flexShrink: 0 }}>
          <button
            onClick={() => setIsMinimized(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '0.2rem',
              borderRadius: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              lineHeight: 1
            }}
            title="Réduire"
          >
            ━
          </button>
          <button
            onClick={stopTour}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '0.2rem',
              borderRadius: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Quitter le tutoriel"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Body Content */}
      <div style={{ padding: '0.65rem 0.85rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        <p style={{ margin: 0, fontSize: '0.78rem', lineHeight: 1.45, color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
          {step.description}
        </p>

        {/* Stepper Progress Bar */}
        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', marginTop: '0.1rem' }}>
          {GAME_TOUR_STEPS.map((_, idx) => (
            <div
              key={idx}
              style={{
                flex: 1,
                height: '3.5px',
                borderRadius: '2px',
                backgroundColor: idx <= currentStep ? 'var(--accent-primary)' : 'var(--border-color)',
                transition: 'all 0.25s ease'
              }}
            />
          ))}
        </div>
      </div>

      {/* Footer Navigation */}
      <div
        style={{
          padding: '0.45rem 0.85rem',
          backgroundColor: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <button
          onClick={stopTour}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '0.72rem',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          Quitter
        </button>

        <button
          onClick={handleNext}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.4rem 0.85rem',
            borderRadius: '0.5rem',
            backgroundColor: 'var(--accent-primary)',
            color: 'white',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.76rem',
            cursor: 'pointer',
            boxShadow: '0 3px 8px rgba(99, 102, 241, 0.35)',
            transition: 'transform 0.15s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <span>{step.actionText}</span>
          {isLast ? <Check size={13} /> : <ArrowRight size={13} />}
        </button>
      </div>
    </div>
  );
};
