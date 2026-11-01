import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export type PomodoroPhase = 'focus' | 'shortBreak' | 'longBreak';

export interface PomodoroConfig {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
}

export const DEFAULT_POMODORO_CONFIG: PomodoroConfig = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
};

const STORAGE_KEY_CONFIG = 'sofia_pomodoro_config';
const STORAGE_KEY_STATE = 'sofia_pomodoro_state';

interface PomodoroContextType {
  timeLeft: number;
  isActive: boolean;
  phase: PomodoroPhase;
  cyclesCompleted: number;
  config: PomodoroConfig;
  toggleTimer: () => void;
  resetTimer: () => void;
  skipPhase: () => void;
  updateConfig: (newConfig: PomodoroConfig) => void;
  formatTime: (seconds: number) => string;
  getPhaseName: () => string;
  getBorderColor: () => string;
  getBackgroundColor: () => string;
}

const PomodoroContext = createContext<PomodoroContextType | null>(null);

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<PomodoroConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) return { ...DEFAULT_POMODORO_CONFIG, ...JSON.parse(saved) };
    } catch (e) {}
    return DEFAULT_POMODORO_CONFIG;
  });

  const [phase, setPhase] = useState<PomodoroPhase>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STATE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.phase) return parsed.phase;
      }
    } catch (e) {}
    return 'focus';
  });

  const [cyclesCompleted, setCyclesCompleted] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STATE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.cyclesCompleted === 'number') return parsed.cyclesCompleted;
      }
    } catch (e) {}
    return 0;
  });

  const [timeLeft, setTimeLeft] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STATE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.isActive && parsed.targetTimestamp) {
          const now = Date.now();
          const remaining = Math.max(0, Math.round((parsed.targetTimestamp - now) / 1000));
          return remaining;
        } else if (typeof parsed.timeLeft === 'number') {
          return parsed.timeLeft;
        }
      }
    } catch (e) {}
    return config.focusMinutes * 60;
  });

  const [isActive, setIsActive] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STATE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.isActive && parsed.targetTimestamp) {
          const now = Date.now();
          return parsed.targetTimestamp > now;
        }
        return !!parsed.isActive;
      }
    } catch (e) {}
    return false;
  });

  const targetTimestampRef = useRef<number | null>(null);

  // Initialize or restore targetTimestamp
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STATE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.isActive && parsed.targetTimestamp) {
          targetTimestampRef.current = parsed.targetTimestamp;
        }
      }
    } catch (e) {}
  }, []);

  // Save config
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  }, [config]);

  // Save state
  useEffect(() => {
    const stateToSave = {
      phase,
      cyclesCompleted,
      timeLeft,
      isActive,
      targetTimestamp: targetTimestampRef.current,
    };
    localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(stateToSave));
  }, [phase, cyclesCompleted, timeLeft, isActive]);

  const getDurationForPhase = useCallback((p: PomodoroPhase, cfg: PomodoroConfig = config) => {
    if (p === 'focus') return cfg.focusMinutes * 60;
    if (p === 'shortBreak') return cfg.shortBreakMinutes * 60;
    return cfg.longBreakMinutes * 60;
  }, [config]);

  const handleNextPhase = useCallback(() => {
    let nextPhase: PomodoroPhase = 'focus';
    let nextCycles = cyclesCompleted;
    if (phase === 'focus') {
      if (cyclesCompleted === 3) {
        nextPhase = 'longBreak';
        nextCycles = 0;
      } else {
        nextPhase = 'shortBreak';
        nextCycles = cyclesCompleted + 1;
      }
    } else {
      nextPhase = 'focus';
    }

    const duration = getDurationForPhase(nextPhase);
    setPhase(nextPhase);
    setCyclesCompleted(nextCycles);
    setTimeLeft(duration);
    if (isActive) {
      targetTimestampRef.current = Date.now() + duration * 1000;
    } else {
      targetTimestampRef.current = null;
    }
  }, [phase, cyclesCompleted, getDurationForPhase, isActive]);

  // Tick interval
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isActive) {
      if (!targetTimestampRef.current) {
        targetTimestampRef.current = Date.now() + timeLeft * 1000;
      }

      interval = setInterval(() => {
        if (!targetTimestampRef.current) return;
        const now = Date.now();
        const diff = Math.max(0, Math.round((targetTimestampRef.current - now) / 1000));
        setTimeLeft(diff);

        if (diff <= 0) {
          handleNextPhase();
        }
      }, 500);
    } else {
      targetTimestampRef.current = null;
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, handleNextPhase, timeLeft]);

  const toggleTimer = () => {
    if (!isActive) {
      targetTimestampRef.current = Date.now() + timeLeft * 1000;
      setIsActive(true);
    } else {
      targetTimestampRef.current = null;
      setIsActive(false);
    }
  };

  const resetTimer = () => {
    setIsActive(false);
    targetTimestampRef.current = null;
    setPhase('focus');
    setCyclesCompleted(0);
    const duration = config.focusMinutes * 60;
    setTimeLeft(duration);
  };

  const skipPhase = () => {
    handleNextPhase();
  };

  const updateConfig = (newConfig: PomodoroConfig) => {
    setConfig(newConfig);
    if (!isActive) {
      const newDuration = getDurationForPhase(phase, newConfig);
      setTimeLeft(newDuration);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getBackgroundColor = () => {
    if (phase === 'focus') return 'rgba(56, 189, 248, 0.12)';
    return 'rgba(239, 68, 68, 0.12)';
  };
  
  const getBorderColor = () => {
    if (phase === 'focus') return '#38bdf8';
    return '#ef4444';
  };

  const getPhaseName = () => {
    if (phase === 'focus') return 'Focus';
    if (phase === 'shortBreak') return 'Courte Pause';
    return 'Longue Pause';
  };

  return (
    <PomodoroContext.Provider
      value={{
        timeLeft,
        isActive,
        phase,
        cyclesCompleted,
        config,
        toggleTimer,
        resetTimer,
        skipPhase,
        updateConfig,
        formatTime,
        getPhaseName,
        getBorderColor,
        getBackgroundColor
      }}
    >
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoro() {
  const context = useContext(PomodoroContext);
  if (!context) {
    throw new Error('usePomodoro must be used within a PomodoroProvider');
  }
  return context;
}
