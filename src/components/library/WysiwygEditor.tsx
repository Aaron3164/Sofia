import React, { useRef, useEffect } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, RotateCcw, Check, X } from 'lucide-react';
import { mdToHtml } from '../../lib/markdown';

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
  { name: 'Rose Aurore', hex: '#e11d48' },
  { name: 'Bleu', hex: '#3b82f6' },
  { name: 'Vert', hex: '#22c55e' },
  { name: 'Violet', hex: '#a855f7' },
  { name: 'Orange', hex: '#f97316' }
];

interface WysiwygEditorProps {
  initialContent: string;
  onSave: (newHtml: string) => void;
  onCancel: () => void;
}

export const WysiwygEditor: React.FC<WysiwygEditorProps> = ({ initialContent, onSave, onCancel }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current) {
      // Initialize with rendered HTML version of initial content
      const htmlContent = mdToHtml(initialContent);
      editorRef.current.innerHTML = htmlContent;
    }
  }, [initialContent]);

  const exec = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) editorRef.current.focus();
  };

  const handleSave = () => {
    if (editorRef.current) {
      onSave(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="wysiwyg-editor-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
      {/* Sticky Rich Toolbar */}
      <div 
        className="wysiwyg-toolbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          flexWrap: 'wrap',
          padding: '0.55rem 0.75rem',
          backgroundColor: 'var(--bg-elevated, #f8fafc)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '0.75rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}
      >
        {/* Headings */}
        <select
          onChange={(e) => exec('formatBlock', e.target.value)}
          defaultValue="P"
          style={{
            padding: '0.35rem 0.5rem',
            borderRadius: '0.4rem',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            fontSize: '0.82rem',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          <option value="P">Texte normal</option>
          <option value="H1">Grand Titre (H1)</option>
          <option value="H2">Titre Moyen (H2)</option>
          <option value="H3">Petit Titre (H3)</option>
        </select>

        <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)', margin: '0 0.2rem' }} />

        {/* Text Styles */}
        <button
          onClick={() => exec('bold')}
          className="toolbar-btn"
          title="Gras"
          style={{ padding: '0.35rem 0.55rem', borderRadius: '0.4rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <Bold size={15} />
        </button>

        <button
          onClick={() => exec('italic')}
          className="toolbar-btn"
          title="Italique"
          style={{ padding: '0.35rem 0.55rem', borderRadius: '0.4rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <Italic size={15} />
        </button>

        <button
          onClick={() => exec('underline')}
          className="toolbar-btn"
          title="Souligner"
          style={{ padding: '0.35rem 0.55rem', borderRadius: '0.4rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <Underline size={15} />
        </button>

        <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)', margin: '0 0.2rem' }} />

        {/* Highlight Color Palette */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.45rem', backgroundColor: 'var(--bg-primary)', borderRadius: '0.4rem', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '0.2rem' }}>Surligner:</span>
          {HIGHLIGHT_COLORS.map(c => (
            <button
              key={c.hex}
              onClick={() => exec('hiliteColor', c.hex)}
              title={`Surligner en ${c.name}`}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: c.hex,
                border: '1px solid rgba(0,0,0,0.2)',
                cursor: 'pointer'
              }}
            />
          ))}
        </div>

        {/* Font Color Palette */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.45rem', backgroundColor: 'var(--bg-primary)', borderRadius: '0.4rem', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '0.2rem' }}>Couleur:</span>
          {TEXT_COLORS.filter(tc => tc.hex !== 'inherit').map(c => (
            <button
              key={c.hex}
              onClick={() => exec('foreColor', c.hex)}
              title={`Couleur ${c.name}`}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: c.hex,
                border: '1px solid rgba(0,0,0,0.2)',
                cursor: 'pointer'
              }}
            />
          ))}
        </div>

        <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)', margin: '0 0.2rem' }} />

        {/* Lists */}
        <button
          onClick={() => exec('insertUnorderedList')}
          className="toolbar-btn"
          title="Liste à puces"
          style={{ padding: '0.35rem 0.55rem', borderRadius: '0.4rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <List size={15} />
        </button>

        <button
          onClick={() => exec('insertOrderedList')}
          className="toolbar-btn"
          title="Liste numérotée"
          style={{ padding: '0.35rem 0.55rem', borderRadius: '0.4rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <ListOrdered size={15} />
        </button>

        <button
          onClick={() => exec('removeFormat')}
          className="toolbar-btn"
          title="Effacer la mise en forme"
          style={{ padding: '0.35rem 0.55rem', borderRadius: '0.4rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <RotateCcw size={15} />
        </button>

        {/* Save / Cancel buttons */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleSave}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.4rem 0.85rem', borderRadius: '0.5rem',
              backgroundColor: 'var(--accent-primary)', color: 'white',
              border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600
            }}
          >
            <Check size={15} /> Enregistrer
          </button>
          <button
            onClick={onCancel}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.4rem 0.75rem', borderRadius: '0.5rem',
              backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.82rem'
            }}
          >
            <X size={15} /> Annuler
          </button>
        </div>
      </div>

      {/* Visual Editable Canvas */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="wysiwyg-content-area"
        style={{
          width: '100%',
          minHeight: '420px',
          padding: '1.25rem',
          borderRadius: '0.75rem',
          border: '2px solid var(--accent-primary)',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          fontSize: '0.95rem',
          lineHeight: '1.7',
          outline: 'none',
          overflowY: 'auto'
        }}
      />
    </div>
  );
};
