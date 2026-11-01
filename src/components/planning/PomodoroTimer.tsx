import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, Square, RefreshCcw, Settings, Check } from 'lucide-react';

type Phase = 'focus' | 'shortBreak' | 'longBreak';

const STORAGE_KEY_CONFIG = 'sofia_pomodoro_config';
const STORAGE_KEY_STATE = 'sofia_pomodoro_state';

interface PomodoroConfig {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
}

const DEFAULT_CONFIG: PomodoroConfig = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
};

export function PomodoroTimer() {
  // Load configuration (customizable minutes)
  const [config, setConfig] = useState<PomodoroConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    } catch (e) {
      // fallback
    }
    return DEFAULT_CONFIG;
  });

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [tempFocus, setTempFocus] = useState(config.focusMinutes);
  const [tempShort, setTempShort] = useState(config.shortBreakMinutes);
  const [tempLong, setTempLong] = useState(config.longBreakMinutes);

  // Load timer running state
  const [phase, setPhase] = useState<Phase>(() => {
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

  const getDurationForPhase = useCallback((p: Phase, cfg: PomodoroConfig = config) => {
    if (p === 'focus') return cfg.focusMinutes * 60;
    if (p === 'shortBreak') return cfg.shortBreakMinutes * 60;
    return cfg.longBreakMinutes * 60;
  }, [config]);

  const handleNextPhase = useCallback(() => {
    let nextPhase: Phase = 'focus';
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

  const handleSaveConfig = () => {
    const validFocus = Math.max(1, Math.min(180, Number(tempFocus) || 25));
    const validShort = Math.max(1, Math.min(60, Number(tempShort) || 5));
    const validLong = Math.max(1, Math.min(120, Number(tempLong) || 15));

    const newConfig: PomodoroConfig = {
      focusMinutes: validFocus,
      shortBreakMinutes: validShort,
      longBreakMinutes: validLong,
    };

    setConfig(newConfig);
    setIsConfigOpen(false);

    // If timer is not active, adapt current timeLeft
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
    if (phase === 'focus') return 'rgba(56, 189, 248, 0.1)';
    return 'rgba(239, 68, 68, 0.1)';
  };
  
  const getBorderColor = () => {
    if (phase === 'focus') return '#38bdf8';
    return '#ef4444';
  };

  const getPhaseName = () => {
    if (phase === 'focus') return '🔵 Session de Focus';
    if (phase === 'shortBreak') return '🔴 Courte Pause';
    return '🔴 Longue Pause';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '450px', padding: '1rem', position: 'relative' }}>
      
      <div 
        className="glass-panel"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2.5rem',
          borderRadius: '2rem',
          backgroundColor: getBackgroundColor(),
          border: `2px solid ${getBorderColor()}`,
          boxShadow: `0 0 40px ${getBackgroundColor()}`,
          transition: 'all 0.5s ease',
          width: '100%',
          maxWidth: '520px',
          position: 'relative'
        }}
      >
        {/* Customization button in top-right */}
        <button
          onClick={() => {
            setTempFocus(config.focusMinutes);
            setTempShort(config.shortBreakMinutes);
            setTempLong(config.longBreakMinutes);
            setIsConfigOpen(!isConfigOpen);
          }}
          className="icon-button"
          style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', opacity: 0.8 }}
          title="Modifier les durées de révision / pause"
        >
          <Settings size={20} />
        </button>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
          {[0, 1, 2, 3].map(i => (
            <div 
              key={i} 
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: i < cyclesCompleted ? getBorderColor() : 'var(--border-color)',
                opacity: phase === 'focus' && i === cyclesCompleted ? 0.5 : 1
              }}
            />
          ))}
        </div>

        <h2 style={{ color: getBorderColor(), marginBottom: '0.25rem', fontSize: '1.4rem', fontWeight: 600 }}>
          {getPhaseName()}
        </h2>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
          {phase === 'focus' ? `${config.focusMinutes} min de focus` : phase === 'shortBreak' ? `${config.shortBreakMinutes} min de pause` : `${config.longBreakMinutes} min de grande pause`}
        </div>
        
        <div style={{ fontSize: '5.5rem', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '-0.05em', margin: '0.5rem 0', color: 'var(--text-primary)' }}>
          {formatTime(timeLeft)}
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button 
            onClick={toggleTimer}
            className="btn"
            style={{ 
              backgroundColor: getBorderColor(), 
              color: 'white',
              border: 'none',
              padding: '0.9rem 2rem',
              borderRadius: '3rem',
              fontSize: '1.15rem',
              minWidth: '170px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: `0 4px 14px ${getBackgroundColor()}`
            }}
          >
            {isActive ? <><Pause size={22} /> Pause</> : <><Play size={22} /> Démarrer</>}
          </button>
          
          <button 
            onClick={resetTimer}
            className="btn btn-outline"
            style={{ borderRadius: '50%', width: '52px', height: '52px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Arrêter / Réinitialiser"
          >
            <Square size={18} />
          </button>
          
          <button 
            onClick={skipPhase}
            className="btn btn-outline"
            style={{ borderRadius: '50%', width: '52px', height: '52px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Sauter l'étape"
          >
            <RefreshCcw size={18} />
          </button>
        </div>

        {/* Inline settings editor */}
        {isConfigOpen && (
          <div 
            className="fade-in"
            style={{
              marginTop: '1.5rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--border-color)',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
              ⏱️ Personnaliser les durées (minutes)
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Révision
                </label>
                <input 
                  type="number"
                  min="1"
                  max="180"
                  value={tempFocus}
                  onChange={(e) => setTempFocus(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Pause courte
                </label>
                <input 
                  type="number"
                  min="1"
                  max="60"
                  value={tempShort}
                  onChange={(e) => setTempShort(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Longue pause
                </label>
                <input 
                  type="number"
                  min="1"
                  max="120"
                  value={tempLong}
                  onChange={(e) => setTempLong(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button 
                onClick={() => setIsConfigOpen(false)}
                className="btn btn-outline"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', height: 'auto' }}
              >
                Annuler
              </button>
              <button 
                onClick={handleSaveConfig}
                className="btn btn-primary"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', height: 'auto', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <Check size={14} /> Enregistrer
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

