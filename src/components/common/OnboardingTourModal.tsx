import React, { useState } from 'react';
import { Sparkles, ArrowRight, Check, X, BookOpen, Zap, CheckCircle2 } from 'lucide-react';
import { ONBOARDING_STEPS } from '../../lib/OnboardingHelper';

interface OnboardingTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToCourse?: () => void;
}

export const OnboardingTourModal: React.FC<OnboardingTourModalProps> = ({ isOpen, onClose, onNavigateToCourse }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = ONBOARDING_STEPS[currentStep];
  const isLast = currentStep === ONBOARDING_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
      if (onNavigateToCourse) onNavigateToCourse();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const stepIcons = [
    <Sparkles size={24} color="#8b5cf6" />,
    <BookOpen size={24} color="#3b82f6" />,
    <Zap size={24} color="#f59e0b" />,
    <CheckCircle2 size={24} color="#10b981" />
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: 'var(--bg-elevated, #ffffff)',
          borderRadius: '1.5rem',
          border: '1px solid var(--border-color)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Progress */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(219, 39, 119, 0.08) 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {stepIcons[currentStep]}
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Guide de Bienvenue • Étape {currentStep + 1} / {ONBOARDING_STEPS.length}
              </span>
              <h3 style={{ margin: '0.1rem 0 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {step.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.3rem' }}
            title="Passer le tutoriel"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.75rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ margin: 0, fontSize: '0.96rem', lineHeight: 1.65, color: 'var(--text-secondary)' }}>
            {step.description}
          </p>

          {/* Stepper Dots */}
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', justifyContent: 'center', marginTop: '0.5rem' }}>
            {ONBOARDING_STEPS.map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: idx === currentStep ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  backgroundColor: idx === currentStep ? 'var(--accent-primary)' : 'var(--border-color)',
                  transition: 'all 0.25s ease'
                }}
              />
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '1rem 1.5rem',
            backgroundColor: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.84rem',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Passer le guide
          </button>

          <button
            onClick={handleNext}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.25rem',
              borderRadius: '0.75rem',
              backgroundColor: 'var(--accent-primary)',
              color: 'white',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
              transition: 'all 0.15s'
            }}
          >
            <span>{step.actionText || (isLast ? "C'est parti !" : "Suivant")}</span>
            {isLast ? <Check size={16} /> : <ArrowRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};
