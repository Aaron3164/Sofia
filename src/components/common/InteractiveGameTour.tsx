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
import { getDemoCourseId } from '../../lib/OnboardingHelper';

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

  // Listen for global start/stop events
  useEffect(() => {
    const onStart = (e: any) => {
      startTour(e.detail?.courseId);
    };
    const onStop = () => {
      stopTour();
    };

    window.addEventListener('start-game-tour', onStart);
    window.addEventListener('stop-game-tour', onStop);

    return () => {
      window.removeEventListener('start-game-tour', onStart);
      window.removeEventListener('stop-game-tour', onStop);
    };
  }, [startTour, stopTour]);

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
    <BookOpen size={20} color="#3b82f6" />,
    <Zap size={20} color="#f59e0b" />,
    <CheckCircle2 size={20} color="#10b981" />,
    <BarChart3 size={20} color="#06b6d4" />,
    <GraduationCap size={20} color="#ec4899" />
  ];

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.75rem',
        right: '1.75rem',
        zIndex: 99999,
        width: '490px',
        maxWidth: 'calc(100vw - 2.5rem)',
        backgroundColor: 'var(--bg-elevated, #ffffff)',
        borderRadius: '1.25rem',
        border: '1.5px solid var(--accent-primary, #6366f1)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3), 0 0 25px rgba(99, 102, 241, 0.25)',
        backdropFilter: 'blur(16px)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        animation: 'gameTourSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          padding: '0.85rem 1.25rem',
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.12) 0%, rgba(219, 39, 119, 0.12) 100%)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {stepIcons[currentStep] || <Sparkles size={18} color="var(--accent-primary)" />}
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {step.badge}
            </div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {step.title}
            </h4>
          </div>
        </div>

        <button
          onClick={stopTour}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '0.35rem',
            borderRadius: '0.4rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Quitter le tutoriel"
        >
          <X size={18} />
        </button>
      </div>

      {/* Body Content */}
      <div style={{ padding: '1.25rem 1.25rem 0.85rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
          {step.description}
        </p>

        {/* Stepper Progress Bar */}
        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', marginTop: '0.25rem' }}>
          {GAME_TOUR_STEPS.map((_, idx) => (
            <div
              key={idx}
              style={{
                flex: 1,
                height: '5px',
                borderRadius: '3px',
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
          padding: '0.85rem 1.25rem',
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
            fontSize: '0.8rem',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          Quitter le guide
        </button>

        <button
          onClick={handleNext}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1.25rem',
            borderRadius: '0.65rem',
            backgroundColor: 'var(--accent-primary)',
            color: 'white',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.84rem',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
            transition: 'transform 0.15s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <span>{step.actionText}</span>
          {isLast ? <Check size={15} /> : <ArrowRight size={15} />}
        </button>
      </div>
    </div>
  );
};
