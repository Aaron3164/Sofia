import React, { useState } from 'react';
import { Maximize2, X } from 'lucide-react';

export interface OcclusionRect {
  id: string;
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  width: number; // percentage (0 - 100)
  height: number; // percentage (0 - 100)
  label?: string;
}

interface OccludedImageViewerProps {
  imageUrl: string;
  occlusions?: OcclusionRect[];
  isRevealed?: boolean;
  alt?: string;
  maxHeight?: string;
  interactive?: boolean;
}

export const OccludedImageViewer: React.FC<OccludedImageViewerProps> = ({
  imageUrl,
  occlusions = [],
  isRevealed = false,
  alt = 'Illustration',
  maxHeight = '520px',
  interactive = true,
}) => {
  // Individual toggle overrides during review
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [isZoomed, setIsZoomed] = useState(false);

  const handleMaskClick = (e: React.MouseEvent, id: string) => {
    if (!interactive) return;
    e.stopPropagation(); // prevent flipping whole card when clicking mask
    setRevealedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleZoomToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsZoomed(prev => !prev);
  };

  return (
    <>
      <div 
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '100%',
          maxHeight,
          margin: '0 auto',
          borderRadius: '1rem',
          overflow: 'hidden',
          boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
          lineHeight: 0,
          backgroundColor: 'rgba(0,0,0,0.03)'
        }}
      >
        <img
          src={imageUrl}
          alt={alt}
          style={{
            display: 'block',
            maxWidth: '100%',
            maxHeight,
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            borderRadius: '1rem'
          }}
        />

        {/* Zoom button on top-right */}
        <button
          onClick={handleZoomToggle}
          title="Agrandir en plein écran"
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            border: 'none',
            borderRadius: '0.4rem',
            padding: '0.35rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 15,
            transition: 'background-color 0.2s',
            backdropFilter: 'blur(4px)'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.85)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)')}
        >
          <Maximize2 size={15} />
        </button>

        {/* Render Occlusion Masks */}
        {occlusions.map((rect) => {
          const isMaskRevealed = isRevealed || !!revealedIds[rect.id];

          return (
            <div
              key={rect.id}
              onClick={(e) => handleMaskClick(e, rect.id)}
              title={isMaskRevealed ? "Cliquer pour masquer" : "Cliquer pour révéler"}
              style={{
                position: 'absolute',
                left: `${rect.x}%`,
                top: `${rect.y}%`,
                width: `${rect.width}%`,
                height: `${rect.height}%`,
                backgroundColor: isMaskRevealed ? 'rgba(16, 185, 129, 0.22)' : 'var(--accent-primary, #db2777)',
                border: isMaskRevealed ? '2px solid #10b981' : '2px solid rgba(255,255,255,0.7)',
                borderRadius: '4px',
                boxShadow: isMaskRevealed ? 'none' : '0 2px 8px rgba(0,0,0,0.3)',
                cursor: interactive ? 'pointer' : 'default',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isMaskRevealed ? '#065f46' : 'white',
                fontSize: '0.75rem',
                fontWeight: 700,
                userSelect: 'none',
                zIndex: 10
              }}
            >
              {!isMaskRevealed && (
                <span style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)', opacity: 0.9 }}>
                  {rect.label || `[?]`}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Fullscreen Zoom Lightbox */}
      {isZoomed && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setIsZoomed(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '95vw',
              maxHeight: '92vh',
              display: 'inline-block',
              lineHeight: 0,
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              borderRadius: '1rem',
              overflow: 'hidden'
            }}
          >
            <button
              onClick={() => setIsZoomed(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                color: 'white',
                border: '2px solid white',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 40
              }}
              title="Fermer le plein écran"
            >
              <X size={18} />
            </button>

            <img
              src={imageUrl}
              alt={alt}
              style={{
                display: 'block',
                maxWidth: '92vw',
                maxHeight: '88vh',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain'
              }}
            />

            {/* Masks in Fullscreen mode */}
            {occlusions.map((rect) => {
              const isMaskRevealed = isRevealed || !!revealedIds[rect.id];
              return (
                <div
                  key={`zoom_${rect.id}`}
                  onClick={(e) => handleMaskClick(e, rect.id)}
                  style={{
                    position: 'absolute',
                    left: `${rect.x}%`,
                    top: `${rect.y}%`,
                    width: `${rect.width}%`,
                    height: `${rect.height}%`,
                    backgroundColor: isMaskRevealed ? 'rgba(16, 185, 129, 0.22)' : 'var(--accent-primary, #db2777)',
                    border: isMaskRevealed ? '2px solid #10b981' : '2px solid rgba(255,255,255,0.7)',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isMaskRevealed ? '#065f46' : 'white',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    zIndex: 20
                  }}
                >
                  {!isMaskRevealed && <span>[?]</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};
