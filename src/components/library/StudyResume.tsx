import React, { useState, useEffect, useRef } from 'react';
import { Pencil } from 'lucide-react';
import { mdToHtml } from '../../lib/markdown';
import { WysiwygEditor } from './WysiwygEditor';
import './StudyResume.css';

interface StudyResumeProps {
  content: string;
  courseId?: string;
  onUpdate?: (newContent: string) => void;
}

export const StudyResume: React.FC<StudyResumeProps> = ({ content, courseId, onUpdate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);

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
                title="Modifier ce résumé en mode visuel"
              >
                <Pencil size={14} /> <span>Modifier</span>
              </button>
            )}
          </div>

          {isEditing ? (
            <WysiwygEditor 
              initialContent={content}
              onSave={(newHtml) => {
                if (onUpdate) onUpdate(newHtml);
                setIsEditing(false);
              }}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <div 
              className="resume-content-rendered" 
              dangerouslySetInnerHTML={{ __html: mdToHtml(content) }} 
            />
          )}
       </div>
    </div>
  );
};
