import React, { useState } from 'react';

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
  alt = 'Flashcard Illustration',
  maxHeight = '280px',
  interactive = true,
}) => {
  // Individual toggle overrides during review
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  const handleMaskClick = (e: React.MouseEvent, id: string) => {
    if (!interactive) return;
    e.stopPropagation(); // prevent flipping whole card when clicking mask
    setRevealedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div 
      style={{
        position: 'relative',
        display: 'inline-block',
        maxWidth: '100%',
        margin: '0.5rem auto',
        borderRadius: '0.75rem',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        lineHeight: 0
      }}
    >
      <img
        src={imageUrl}
        alt={alt}
        style={{
          display: 'block',
          maxWidth: '100%',
          maxHeight,
          height: 'auto',
          objectFit: 'contain',
          borderRadius: '0.75rem'
        }}
      />

      {/* Render Occlusion Masks */}
      {occlusions.map((rect) => {
        // A mask is revealed if the card is flipped (isRevealed) OR if student clicked it individually
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
  );
};
