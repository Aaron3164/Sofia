import React, { useState, useRef, useEffect } from 'react';
import { X, Trash2, Undo2, Check, Square } from 'lucide-react';
import type { OcclusionRect } from './OccludedImageViewer';

interface ImageOcclusionModalProps {
  isOpen: boolean;
  imageUrl: string;
  initialOcclusions?: OcclusionRect[];
  onSave: (occlusions: OcclusionRect[]) => void;
  onClose: () => void;
}

type DragAction = 
  | { type: 'draw'; startX: number; startY: number }
  | { type: 'move'; id: string; startX: number; startY: number; origX: number; origY: number }
  | { type: 'resize'; id: string; handle: string; startX: number; startY: number; origRect: OcclusionRect };

export const ImageOcclusionModal: React.FC<ImageOcclusionModalProps> = ({
  isOpen,
  imageUrl,
  initialOcclusions = [],
  onSave,
  onClose,
}) => {
  const [occlusions, setOcclusions] = useState<OcclusionRect[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawingRect, setDrawingRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dragActionRef = useRef<DragAction | null>(null);

  useEffect(() => {
    if (isOpen) {
      setOcclusions(initialOcclusions ? JSON.parse(JSON.stringify(initialOcclusions)) : []);
      setSelectedId(null);
      setDrawingRect(null);
      dragActionRef.current = null;
    }
  }, [isOpen, initialOcclusions]);

  if (!isOpen) return null;

  // Convert mouse/touch event into percentage coordinates (0 - 100) relative to image container
  const getPercentCoords = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return { x, y };
  };

  const handlePointerDownContainer = (e: React.MouseEvent<HTMLDivElement>) => {
    // If clicking directly on container (not on a mask or handle)
    if (e.target !== containerRef.current && (e.target as HTMLElement).tagName !== 'IMG') {
      return;
    }
    const { x, y } = getPercentCoords(e);
    dragActionRef.current = { type: 'draw', startX: x, startY: y };
    setSelectedId(null);
    setDrawingRect({ x, y, width: 0, height: 0 });
  };

  const handlePointerDownMask = (e: React.MouseEvent, rect: OcclusionRect) => {
    e.stopPropagation();
    setSelectedId(rect.id);
    const { x, y } = getPercentCoords(e);
    dragActionRef.current = {
      type: 'move',
      id: rect.id,
      startX: x,
      startY: y,
      origX: rect.x,
      origY: rect.y
    };
  };

  const handlePointerDownHandle = (e: React.MouseEvent, rect: OcclusionRect, handle: string) => {
    e.stopPropagation();
    const { x, y } = getPercentCoords(e);
    dragActionRef.current = {
      type: 'resize',
      id: rect.id,
      handle,
      startX: x,
      startY: y,
      origRect: { ...rect }
    };
  };

  // Global mouse move & up listeners to keep smooth tracking even outside container
  useEffect(() => {
    const handleWindowPointerMove = (e: MouseEvent) => {
      const action = dragActionRef.current;
      if (!action) return;

      const { x, y } = getPercentCoords(e);

      if (action.type === 'draw') {
        const left = Math.min(action.startX, x);
        const top = Math.min(action.startY, y);
        const width = Math.abs(x - action.startX);
        const height = Math.abs(y - action.startY);
        setDrawingRect({ x: left, y: top, width, height });
      } else if (action.type === 'move') {
        const dx = x - action.startX;
        const dy = y - action.startY;
        setOcclusions(prev => prev.map(item => {
          if (item.id !== action.id) return item;
          const newX = Math.max(0, Math.min(100 - item.width, action.origX + dx));
          const newY = Math.max(0, Math.min(100 - item.height, action.origY + dy));
          return { ...item, x: newX, y: newY };
        }));
      } else if (action.type === 'resize') {
        const { handle, origRect } = action;
        const dx = x - action.startX;
        const dy = y - action.startY;

        setOcclusions(prev => prev.map(item => {
          if (item.id !== action.id) return item;
          let newX = origRect.x;
          let newY = origRect.y;
          let newW = origRect.width;
          let newH = origRect.height;

          if (handle.includes('e')) {
            newW = Math.max(2, Math.min(100 - origRect.x, origRect.width + dx));
          }
          if (handle.includes('s')) {
            newH = Math.max(2, Math.min(100 - origRect.y, origRect.height + dy));
          }
          if (handle.includes('w')) {
            const possibleW = origRect.width - dx;
            if (possibleW >= 2) {
              newX = Math.max(0, origRect.x + dx);
              newW = origRect.width + (origRect.x - newX);
            }
          }
          if (handle.includes('n')) {
            const possibleH = origRect.height - dy;
            if (possibleH >= 2) {
              newY = Math.max(0, origRect.y + dy);
              newH = origRect.height + (origRect.y - newY);
            }
          }

          return { ...item, x: newX, y: newY, width: newW, height: newH };
        }));
      }
    };

    const handleWindowPointerUp = () => {
      const action = dragActionRef.current;
      if (action && action.type === 'draw') {
        setDrawingRect(currentRect => {
          if (currentRect && currentRect.width >= 2 && currentRect.height >= 2) {
            const newId = `occ_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const newRect: OcclusionRect = {
              id: newId,
              x: Math.round(currentRect.x * 10) / 10,
              y: Math.round(currentRect.y * 10) / 10,
              width: Math.round(currentRect.width * 10) / 10,
              height: Math.round(currentRect.height * 10) / 10,
            };
            setOcclusions(prev => [...prev, newRect]);
            setSelectedId(newId);
          }
          return null;
        });
      }
      dragActionRef.current = null;
    };

    window.addEventListener('mousemove', handleWindowPointerMove);
    window.addEventListener('mouseup', handleWindowPointerUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowPointerMove);
      window.removeEventListener('mouseup', handleWindowPointerUp);
    };
  }, []);

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setOcclusions(prev => prev.filter(item => item.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleUndo = () => {
    setOcclusions(prev => prev.slice(0, -1));
    setSelectedId(null);
  };

  const handleClearAll = () => {
    if (confirm('Supprimer tous les masques d\'occlusion sur cette image ?')) {
      setOcclusions([]);
      setSelectedId(null);
    }
  };

  const handleConfirm = () => {
    onSave(occlusions);
    onClose();
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '92vh',
          backgroundColor: 'var(--bg-elevated, #1e293b)',
          border: '1px solid var(--border-color, #334155)',
          borderRadius: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div 
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-primary)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.3rem' }}>🎭</span>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Masquage d'image (Style Anki)
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                Tracez des rectangles pour masquer les termes, définitions ou schémas à deviner.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div 
          style={{
            padding: '0.6rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            backgroundColor: 'var(--bg-elevated)',
            fontSize: '0.82rem',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.25rem 0.6rem',
                borderRadius: '999px',
                backgroundColor: 'rgba(219, 39, 119, 0.15)',
                color: 'var(--accent-primary, #db2777)',
                fontWeight: 600
              }}
            >
              <Square size={13} /> {occlusions.length} masque{occlusions.length > 1 ? 's' : ''}
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>
              • Glissez sur l'image pour tracer un masque
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={handleUndo}
              disabled={occlusions.length === 0}
              className="btn btn-outline"
              style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              title="Annuler le dernier masque tracé"
            >
              <Undo2 size={14} /> Annuler
            </button>
            <button
              onClick={handleClearAll}
              disabled={occlusions.length === 0}
              className="btn btn-outline"
              style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--danger)' }}
              title="Effacer tous les masques"
            >
              <Trash2 size={14} /> Tout effacer
            </button>
          </div>
        </div>

        {/* Canvas Workspace */}
        <div 
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            userSelect: 'none'
          }}
        >
          <div 
            ref={containerRef}
            onMouseDown={handlePointerDownContainer}
            style={{
              position: 'relative',
              display: 'inline-block',
              maxWidth: '100%',
              borderRadius: '0.75rem',
              overflow: 'hidden',
              cursor: 'crosshair',
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
              lineHeight: 0
            }}
          >
            <img 
              src={imageUrl} 
              alt="Anki Occlusion Target"
              draggable={false}
              style={{
                display: 'block',
                maxWidth: '100%',
                maxHeight: '58vh',
                height: 'auto',
                objectFit: 'contain',
                pointerEvents: 'none'
              }} 
            />

            {/* Existing Occlusion Masks */}
            {occlusions.map((rect) => {
              const isSelected = selectedId === rect.id;
              return (
                <div
                  key={rect.id}
                  onMouseDown={(e) => handlePointerDownMask(e, rect)}
                  style={{
                    position: 'absolute',
                    left: `${rect.x}%`,
                    top: `${rect.y}%`,
                    width: `${rect.width}%`,
                    height: `${rect.height}%`,
                    backgroundColor: 'var(--accent-primary, #db2777)',
                    border: isSelected ? '2px solid #ffffff' : '1.5px solid rgba(255,255,255,0.7)',
                    boxShadow: isSelected ? '0 0 0 2px var(--accent-primary), 0 4px 12px rgba(0,0,0,0.4)' : '0 2px 6px rgba(0,0,0,0.25)',
                    borderRadius: '4px',
                    cursor: 'move',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: isSelected ? 30 : 20,
                    transition: 'border 0.15s, box-shadow 0.15s'
                  }}
                >
                  <span style={{ color: 'white', fontSize: '0.7rem', fontWeight: 700, pointerEvents: 'none', opacity: 0.9 }}>
                    [?]
                  </span>

                  {/* Delete Button on Hover / Selection */}
                  {isSelected && (
                    <button
                      onClick={(e) => handleDelete(rect.id, e)}
                      style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '-10px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: '2px solid white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                        zIndex: 40,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                      }}
                      title="Supprimer ce masque"
                    >
                      <X size={12} strokeWidth={3} />
                    </button>
                  )}

                  {/* Resize Handles (Corner handles when selected) */}
                  {isSelected && (
                    <>
                      <div
                        onMouseDown={(e) => handlePointerDownHandle(e, rect, 'nw')}
                        style={{ position: 'absolute', left: '-5px', top: '-5px', width: '9px', height: '9px', backgroundColor: 'white', border: '1px solid #db2777', cursor: 'nwse-resize', zIndex: 35 }}
                      />
                      <div
                        onMouseDown={(e) => handlePointerDownHandle(e, rect, 'ne')}
                        style={{ position: 'absolute', right: '-5px', top: '-5px', width: '9px', height: '9px', backgroundColor: 'white', border: '1px solid #db2777', cursor: 'nesw-resize', zIndex: 35 }}
                      />
                      <div
                        onMouseDown={(e) => handlePointerDownHandle(e, rect, 'se')}
                        style={{ position: 'absolute', right: '-5px', bottom: '-5px', width: '9px', height: '9px', backgroundColor: 'white', border: '1px solid #db2777', cursor: 'nwse-resize', zIndex: 35 }}
                      />
                      <div
                        onMouseDown={(e) => handlePointerDownHandle(e, rect, 'sw')}
                        style={{ position: 'absolute', left: '-5px', bottom: '-5px', width: '9px', height: '9px', backgroundColor: 'white', border: '1px solid #db2777', cursor: 'nesw-resize', zIndex: 35 }}
                      />
                    </>
                  )}
                </div>
              );
            })}

            {/* Actively Drawing Rectangle Preview */}
            {drawingRect && (
              <div 
                style={{
                  position: 'absolute',
                  left: `${drawingRect.x}%`,
                  top: `${drawingRect.y}%`,
                  width: `${drawingRect.width}%`,
                  height: `${drawingRect.height}%`,
                  backgroundColor: 'rgba(219, 39, 119, 0.45)',
                  border: '2px dashed #db2777',
                  borderRadius: '4px',
                  pointerEvents: 'none',
                  zIndex: 50
                }}
              />
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div 
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-primary)'
          }}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Sur la flashcard, les zones seront masquées au recto puis dévoilées au verso.
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              onClick={onClose}
              className="btn btn-outline"
              style={{ padding: '0.5rem 1rem' }}
            >
              Annuler
            </button>
            <button 
              onClick={handleConfirm}
              className="btn btn-primary"
              style={{ padding: '0.5rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Check size={16} /> Valider les masques ({occlusions.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
