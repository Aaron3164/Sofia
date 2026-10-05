import React, { useState, useEffect, useRef } from 'react';
import { Bold, Underline, X } from 'lucide-react';

interface SelectionToolbarProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onSaveContent: () => void;
}

export const HIGHLIGHT_COLORS = [
  { name: 'Jaune', hex: '#fef08a', textColor: '#854d0e' },
  { name: 'Vert', hex: '#bbf7d0', textColor: '#166534' },
  { name: 'Bleu', hex: '#bfdbfe', textColor: '#1e40af' },
  { name: 'Rose', hex: '#fbcfe8', textColor: '#9d174d' },
  { name: 'Violet', hex: '#e9d5ff', textColor: '#6b21a8' },
  { name: 'Orange', hex: '#fed7aa', textColor: '#9a3412' }
];

export const TEXT_COLORS = [
  { name: 'Défaut', hex: 'inherit' },
  { name: 'Rouge', hex: '#ef4444' },
  { name: 'Bleu', hex: '#3b82f6' },
  { name: 'Vert', hex: '#22c55e' },
  { name: 'Violet', hex: '#a855f7' },
  { name: 'Orange', hex: '#f97316' }
];

export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({ containerRef, onSaveContent }) => {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !containerRef.current) {
        setPosition(null);
        return;
      }

      const text = selection.toString().trim();
      if (!text) {
        setPosition(null);
        return;
      }

      // Ensure selection is inside containerRef
      const range = selection.getRangeAt(0);
      if (!containerRef.current.contains(range.commonAncestorContainer)) {
        setPosition(null);
        return;
      }

      const rect = range.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        setPosition(null);
        return;
      }

      const top = Math.max(10, rect.top - 54);
      const left = Math.min(window.innerWidth - 220, Math.max(20, rect.left + rect.width / 2 - 100));

      setPosition({ top, left });
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [containerRef]);

  if (!position) return null;

  const applyHighlight = (colorHex: string, textColor: string) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const mark = document.createElement('mark');
    mark.style.backgroundColor = colorHex;
    mark.style.color = textColor || 'inherit';
    mark.style.padding = '0.15em 0.35em';
    mark.style.borderRadius = '0.25em';
    mark.style.fontWeight = '500';

    try {
      range.surroundContents(mark);
    } catch (e) {
      document.execCommand('hiliteColor', false, colorHex);
    }

    sel.removeAllRanges();
    setPosition(null);
    onSaveContent();
  };

  const removeHighlight = () => {
    document.execCommand('removeFormat', false);
    const sel = window.getSelection();
    if (sel) sel.removeAllRanges();
    setPosition(null);
    onSaveContent();
  };

  const applyCommand = (cmd: string, val: string = '') => {
    document.execCommand(cmd, false, val);
    onSaveContent();
  };

  return (
    <div
      ref={toolbarRef}
      className="selection-toolbar fade-in"
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.4rem 0.6rem',
        backgroundColor: 'var(--bg-elevated, #ffffff)',
        border: '1px solid var(--border-color, #e5e7eb)',
        borderRadius: '0.75rem',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(8px)'
      }}
    >
      {/* Surlignage Color Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        {HIGHLIGHT_COLORS.map(c => (
          <button
            key={c.hex}
            onClick={() => applyHighlight(c.hex, c.textColor)}
            title={`Surligner en ${c.name}`}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: c.hex,
              border: '1.5px solid rgba(0,0,0,0.15)',
              cursor: 'pointer',
              transition: 'transform 0.15s'
            }}
            onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.2)')}
            onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
          />
        ))}
      </div>

      <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--border-color, #e5e7eb)', margin: '0 0.2rem' }} />

      {/* Formatting Quick Actions */}
      <button
        onClick={() => applyCommand('bold')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', color: 'var(--text-primary)', display: 'flex' }}
        title="Gras"
      >
        <Bold size={15} />
      </button>

      <button
        onClick={() => applyCommand('underline')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', color: 'var(--text-primary)', display: 'flex' }}
        title="Souligner"
      >
        <Underline size={15} />
      </button>

      <button
        onClick={removeHighlight}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', color: 'var(--text-secondary)', display: 'flex' }}
        title="Effacer le surlignage"
      >
        <X size={15} />
      </button>
    </div>
  );
};
