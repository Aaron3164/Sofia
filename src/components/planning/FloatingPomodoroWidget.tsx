import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Play, Pause, X, Eye, EyeOff, RotateCcw, Move, ChevronRight } from 'lucide-react';
import { usePomodoro } from '../../context/PomodoroContext';

export function FloatingPomodoroWidget() {
  const { 
    timeLeft, 
    isActive, 
    hasStarted,
    phase, 
    cyclesCompleted, 
    toggleTimer, 
    resetTimer, 
    formatTime, 
    getBorderColor 
  } = usePomodoro();

  const location = useLocation();
  const navigate = useNavigate();

  // Hide in full Pomodoro view inside planning to avoid double UI
  const isPlanningPage = location.pathname === '/planning';

  // Draggable position state (saved in localStorage)
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('sofia_pomodoro_widget_pos');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    // Default: bottom right corner
    return { x: window.innerWidth - 240, y: window.innerHeight - 110 };
  });

  // Minimized / hidden state (subtle almost invisible pill)
  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    return localStorage.getItem('sofia_pomodoro_minimized') === 'true';
  });

  // Explicitly hidden until re-activated
  const [isDismissed, setIsDismissed] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
  });

  // Clamp position within viewport on resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.min(Math.max(10, prev.x), window.innerWidth - 240),
        y: Math.min(Math.max(10, prev.y), window.innerHeight - 90),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save pos
  useEffect(() => {
    localStorage.setItem('sofia_pomodoro_widget_pos', JSON.stringify(position));
  }, [position]);

  // Save minimized
  useEffect(() => {
    localStorage.setItem('sofia_pomodoro_minimized', isMinimized ? 'true' : 'false');
  }, [isMinimized]);

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag from the drag handle or non-button areas
    if ((e.target as HTMLElement).closest('button')) return;

    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - dragRef.current.startX;
      const deltaY = moveEvent.clientY - dragRef.current.startY;

      const newX = Math.min(Math.max(10, dragRef.current.initialX + deltaX), window.innerWidth - 80);
      const newY = Math.min(Math.max(10, dragRef.current.initialY + deltaY), window.innerHeight - 50);

      setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Only display floating pop up in other pages if pomodoro was launched (!hasStarted -> hidden)
  // Also hide if dismissed or if currently on full planning page
  if (!hasStarted || isDismissed || isPlanningPage) {
    return null;
  }

  const borderColor = getBorderColor();

  // 1. Minimized Mode (almost invisible pill on hover)
  if (isMinimized) {
    return (
      <div
        onPointerDown={handlePointerDown}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 9999,
          touchAction: 'none',
          userSelect: 'none',
          cursor: isDragging ? 'grabbing' : 'grab',
          opacity: 0.28,
          transition: isDragging ? 'none' : 'opacity 0.25s ease, transform 0.2s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.95'; }}
        onMouseLeave={(e) => { if (!isDragging) e.currentTarget.style.opacity = '0.28'; }}
        title="Pomodoro en arrière-plan (Cliquer pour agrandir, glisser pour déplacer)"
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.65rem',
            borderRadius: '2rem',
            backgroundColor: 'var(--bg-elevated)',
            border: `1.5px solid ${borderColor}`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(8px)',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
            fontWeight: 700,
            fontFamily: 'monospace',
          }}
        >
          <span 
            style={{ 
              width: 8, 
              height: 8, 
              borderRadius: '50%', 
              backgroundColor: borderColor,
              animation: isActive ? 'pulse 1.5s infinite' : 'none' 
            }} 
          />
          <span>{formatTime(timeLeft)}</span>
          <button
            onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              marginLeft: '0.2rem'
            }}
            title="Agrandir le widget"
          >
            <Eye size={13} />
          </button>
        </div>
      </div>
    );
  }

  // 2. Expanded Floating Pop-up Widget
  return (
    <div
      onPointerDown={handlePointerDown}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
        touchAction: 'none',
        userSelect: 'none',
        cursor: isDragging ? 'grabbing' : 'default',
        width: '240px',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        className="glass-panel"
        style={{
          padding: '0.75rem 0.9rem',
          borderRadius: '1rem',
          backgroundColor: 'var(--bg-elevated)',
          border: `1.5px solid ${borderColor}`,
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          transition: 'box-shadow 0.2s ease',
        }}
      >
        {/* Header: Drag handle, phase name, minimize, close */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'grab' }} title="Glisser pour déplacer">
            <Move size={12} style={{ color: 'var(--text-secondary)', opacity: 0.7 }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: borderColor }}>
              {phase === 'focus' ? '🔵 Focus' : '🔴 Pause'}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              ({cyclesCompleted}/4)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <button
              onClick={() => setIsMinimized(true)}
              className="icon-button"
              style={{ width: '22px', height: '22px', padding: 0 }}
              title="Réduire en miniature discrète"
            >
              <EyeOff size={13} />
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="icon-button"
              style={{ width: '22px', height: '22px', padding: 0 }}
              title="Fermer le widget flottant"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Time and Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '-0.1rem' }}>
          <div 
            onClick={() => navigate('/planning')}
            style={{ 
              fontSize: '1.75rem', 
              fontWeight: 800, 
              fontFamily: 'monospace', 
              letterSpacing: '-0.03em', 
              color: 'var(--text-primary)',
              cursor: 'pointer' 
            }}
            title="Cliquer pour ouvrir la vue complète"
          >
            {formatTime(timeLeft)}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              onClick={toggleTimer}
              className="btn"
              style={{
                backgroundColor: borderColor,
                color: 'white',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
              }}
              title={isActive ? "Mettre en pause" : "Démarrer"}
            >
              {isActive ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: 2 }} />}
            </button>

            <button
              onClick={resetTimer}
              className="btn btn-outline"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Réinitialiser"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>

        {/* Footer quick link */}
        <div 
          onClick={() => navigate('/planning')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            fontSize: '0.68rem', 
            color: 'var(--text-secondary)',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '0.35rem',
            cursor: 'pointer'
          }}
          title="Aller à la page Planification"
        >
          <span>Ouvrir le chronomètre complet</span>
          <ChevronRight size={12} />
        </div>
      </div>
    </div>
  );
}
