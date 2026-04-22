import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, Square, RefreshCcw } from 'lucide-react';

type Phase = 'focus' | 'shortBreak' | 'longBreak';

const FOCUS_TIME = 20 * 60; // 20 minutes
const SHORT_BREAK_TIME = 5 * 60; // 5 minutes 
const LONG_BREAK_TIME = 30 * 60; // 30 minutes

export function PomodoroTimer() {
  const [timeLeft, setTimeLeft] = useState(FOCUS_TIME);
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<Phase>('focus');
  const [cyclesCompleted, setCyclesCompleted] = useState(0);

  const handleNextPhase = useCallback(() => {
    if (phase === 'focus') {
      if (cyclesCompleted === 3) {
        setPhase('longBreak');
        setTimeLeft(LONG_BREAK_TIME);
        setCyclesCompleted(0);
      } else {
        setPhase('shortBreak');
        setTimeLeft(SHORT_BREAK_TIME);
        setCyclesCompleted(prev => prev + 1);
      }
    } else {
      setPhase('focus');
      setTimeLeft(FOCUS_TIME);
    }
  }, [phase, cyclesCompleted]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      // Play a sound if you want, and switch phase
      handleNextPhase();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, handleNextPhase]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setPhase('focus');
    setCyclesCompleted(0);
    setTimeLeft(FOCUS_TIME);
  };

  const skipPhase = () => {
    handleNextPhase();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getBackgroundColor = () => {
    if (phase === 'focus') return 'rgba(56, 189, 248, 0.1)'; // Light blue
    return 'rgba(239, 68, 68, 0.1)'; // Light red
  };
  
  const getBorderColor = () => {
    if (phase === 'focus') return '#38bdf8'; // Blue
    return '#ef4444'; // Red
  };

  const getPhaseName = () => {
    if (phase === 'focus') return '🔵 Session de Focus';
    if (phase === 'shortBreak') return '🔴 Courte Pause';
    return '🔴 Longue Pause';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '2rem' }}>
      
      <div 
        className="glass-panel"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem',
          borderRadius: '2rem',
          backgroundColor: getBackgroundColor(),
          border: `2px solid ${getBorderColor()}`,
          boxShadow: `0 0 40px ${getBackgroundColor()}`,
          transition: 'all 0.5s ease',
          width: '100%',
          maxWidth: '500px'
        }}
      >
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

        <h2 style={{ color: getBorderColor(), marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 600 }}>
          {getPhaseName()}
        </h2>
        
        <div style={{ fontSize: '6rem', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '-0.05em', margin: '1rem 0', color: 'var(--text-primary)' }}>
          {formatTime(timeLeft)}
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button 
            onClick={toggleTimer}
            className="btn"
            style={{ 
              backgroundColor: getBorderColor(), 
              color: 'white',
              border: 'none',
              padding: '1rem 2rem',
              borderRadius: '3rem',
              fontSize: '1.2rem',
              width: '180px',
              display: 'flex',
              justifyContent: 'center',
              boxShadow: `0 4px 14px ${getBackgroundColor()}`
            }}
          >
            {isActive ? <><Pause size={24} /> Pause</> : <><Play size={24} /> Démarrer</>}
          </button>
          
          <button 
            onClick={resetTimer}
            className="btn btn-outline"
            style={{ borderRadius: '50%', width: '56px', height: '56px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Arrêter / Reset"
          >
            <Square size={20} />
          </button>
          
          <button 
            onClick={skipPhase}
            className="btn btn-outline"
            style={{ borderRadius: '50%', width: '56px', height: '56px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Sauter l'étape"
          >
            <RefreshCcw size={20} />
          </button>
        </div>
      </div>

    </div>
  );
}
