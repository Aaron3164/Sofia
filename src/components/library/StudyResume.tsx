import React, { useState, useEffect, useRef } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { mdToHtml } from '../../lib/markdown';
import './StudyResume.css';

interface StudyResumeProps {
  content: string;
  courseId?: string;
  onUpdate?: (newContent: string) => void;
}

export const StudyResume: React.FC<StudyResumeProps> = ({ content, courseId, onUpdate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(content);

  useEffect(() => {
    setEditedText(content);
  }, [content]);

  // Restore scroll
  useEffect(() => {
    if (courseId && containerRef.current) {
      const savedScroll = sessionStorage.getItem(`aura_resume_scroll_${courseId}`);
      if (savedScroll) {
        containerRef.current.scrollTop = parseInt(savedScroll, 10);
      }
    }
  }, [courseId]);

  // Handle scroll save
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (courseId) {
      sessionStorage.setItem(`aura_resume_scroll_${courseId}`, e.currentTarget.scrollTop.toString());
    }
  };

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(editedText);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedText(content);
    setIsEditing(false);
  };

  return (
    <div 
      className="study-resume-container fade-in" 
      ref={containerRef}
      onScroll={handleScroll}
      style={{ overflowY: 'auto', position: 'relative' }}
    >
       <div className="resume-glass-wrapper" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
            {onUpdate && !isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.4rem 0.75rem', borderRadius: '0.5rem',
                  backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem',
                  transition: 'all 0.2s'
                }}
                title="Modifier ce résumé"
              >
                <Pencil size={14} /> <span>Modifier</span>
              </button>
            )}

            {isEditing && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={handleSave}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                    padding: '0.4rem 0.75rem', borderRadius: '0.5rem',
                    backgroundColor: 'var(--accent-primary)', color: 'white',
                    border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500
                  }}
                >
                  <Check size={14} /> <span>Enregistrer</span>
                </button>
                <button 
                  onClick={handleCancel}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                    padding: '0.4rem 0.75rem', borderRadius: '0.5rem',
                    backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem'
                  }}
                >
                  <X size={14} /> <span>Annuler</span>
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <textarea 
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              style={{
                width: '100%',
                minHeight: '400px',
                padding: '1rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--accent-primary)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                lineHeight: '1.6',
                fontFamily: 'monospace'
              }}
            />
          ) : (
            <div className="resume-content-rendered" dangerouslySetInnerHTML={{ __html: mdToHtml(content) }} />
          )}
       </div>
    </div>
  );
};
