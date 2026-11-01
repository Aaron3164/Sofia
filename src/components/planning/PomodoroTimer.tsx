import { useState } from 'react';
import { Play, Pause, Square, RefreshCcw, Settings, Check } from 'lucide-react';
import { usePomodoro, type PomodoroConfig } from '../../context/PomodoroContext';

export function PomodoroTimer() {
  const {
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
  } = usePomodoro();

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [tempFocus, setTempFocus] = useState(config.focusMinutes);
  const [tempShort, setTempShort] = useState(config.shortBreakMinutes);
  const [tempLong, setTempLong] = useState(config.longBreakMinutes);

  const handleSaveConfig = () => {
    const validFocus = Math.max(1, Math.min(180, Number(tempFocus) || 25));
    const validShort = Math.max(1, Math.min(60, Number(tempShort) || 5));
    const validLong = Math.max(1, Math.min(120, Number(tempLong) || 15));

    const newConfig: PomodoroConfig = {
      focusMinutes: validFocus,
      shortBreakMinutes: validShort,
      longBreakMinutes: validLong,
    };

    updateConfig(newConfig);
    setIsConfigOpen(false);
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

