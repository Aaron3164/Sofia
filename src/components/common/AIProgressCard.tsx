import React, { useState, useEffect } from 'react';
import { Sparkles, Clock } from 'lucide-react';
import './AIProgressCard.css';

export interface AIStep {
  percent?: number;
  atPercent?: number;
  label: string;
}

export interface UseAIProgressOptions {
  active?: boolean;
  estimatedDuration: number; // in seconds
  steps?: AIStep[];
}

/**
 * Custom hook to drive smooth, asymptotic AI progress estimation with dynamic countdown.
 */
export function useAIProgress({
  active = true,
  estimatedDuration,
  steps = []
}: UseAIProgressOptions) {
  const [progress, setProgress] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!active) {
      setProgress(0);
      setElapsedSeconds(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setElapsedSeconds(Math.floor(elapsed));

      // Asymptotic progress curve:
      // Advances swiftly up to 80% during first 80% of estimated time,
      // then slows down to 92% and crawls gently to 97% if it takes longer.
      const ratio = elapsed / Math.max(1, estimatedDuration);
      let calculatedPercent: number;

      if (ratio < 0.8) {
        calculatedPercent = ratio * 100;
      } else if (ratio < 1.15) {
        calculatedPercent = 80 + (ratio - 0.8) * 35; // reaches ~92% around ratio=1.15
      } else {
        // Asymptotically crawls from 92% to 98%
        calculatedPercent = 92 + (1 - Math.exp(-(ratio - 1.15) * 0.8)) * 5.5;
      }

      // Clamp between 2% and 98%
      const bounded = Math.max(2, Math.min(98, Math.round(calculatedPercent)));
      setProgress(bounded);
    }, 120);

    return () => clearInterval(interval);
  }, [active, estimatedDuration]);

  const remainingSeconds = Math.max(0, Math.ceil(estimatedDuration - elapsedSeconds));

  let remainingText = '';
  if (remainingSeconds > 0) {
    remainingText = `Environ ${remainingSeconds}s restante${remainingSeconds > 1 ? 's' : ''}`;
  } else {
    remainingText = 'Finalisation imminente...';
  }

  let currentStepLabel = '';
  if (steps.length > 0) {
    const matched = [...steps].reverse().find(s => progress >= (s.percent ?? s.atPercent ?? 0));
    currentStepLabel = matched ? matched.label : steps[0].label;
  }

  return {
    progress,
    elapsedSeconds,
    remainingSeconds,
    remainingText,
    currentStepLabel
  };
}

export interface AIProgressCardProps {
  active?: boolean;
  title?: string;
  subtitle?: string;
  estimatedDuration?: number; // default 14s
  steps?: AIStep[];
  icon?: React.ReactNode;
  overlay?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export const AIProgressCard: React.FC<AIProgressCardProps> = ({
  active = true,
  title = "Génération en cours...",
  subtitle = "Sofia IA analyse vos contenus et conçoit votre matériel d'apprentissage.",
  estimatedDuration = 14,
  steps = [
    { percent: 0, label: "Lecture approfondie du document..." },
    { percent: 25, label: "Extraction des concepts clés et des pièges..." },
    { percent: 55, label: "Formulation et synthèse par Sofia IA..." },
    { percent: 80, label: "Contrôle qualité et mise en forme interactive..." },
    { percent: 95, label: "Finalisation de votre support..." }
  ],
  icon,
  overlay = false,
  style,
  className = ""
}) => {
  const { progress, remainingText, currentStepLabel } = useAIProgress({
    active,
    estimatedDuration,
    steps
  });

  if (!active) return null;

  return (
    <div 
      className={`ai-progress-card ${overlay ? 'overlay-mode' : ''} ${className}`}
      style={style}
    >
      {/* Icon Aura */}
      <div className="ai-progress-icon-wrapper">
        <div className="ai-progress-icon-ring" />
        {icon || <Sparkles size={32} />}
      </div>

      {/* Title & Subtitle */}
      <h3 className="ai-progress-title">{title}</h3>
      {subtitle && <p className="ai-progress-subtitle">{subtitle}</p>}

      {/* Progress Track */}
      <div className="ai-progress-track-wrapper">
        <div className="ai-progress-track">
          <div 
            className="ai-progress-bar" 
            style={{ width: `${progress}%` }} 
          />
        </div>

        {/* Metrics Row */}
        <div className="ai-progress-metrics">
          <div className="ai-progress-percent-badge">
            <Sparkles size={13} />
            <span>{progress}%</span>
          </div>

          <div className="ai-progress-countdown">
            <Clock size={13} />
            <span>{remainingText}</span>
          </div>
        </div>
      </div>

      {/* Dynamic Step Pill */}
      {currentStepLabel && (
        <div className="ai-progress-current-step">
          <div className="ai-progress-step-indicator-dot" />
          <span>{currentStepLabel}</span>
        </div>
      )}
    </div>
  );
};
