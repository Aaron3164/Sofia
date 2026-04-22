import React from 'react';
import { mdToHtml } from '../../lib/markdown';
import './StudyResume.css';

interface StudyResumeProps {
  content: string;
  courseId?: string;
}

export const StudyResume: React.FC<StudyResumeProps> = ({ content, courseId }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Restore scroll
  React.useEffect(() => {
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
      style={{ overflowY: 'auto' }}
    >
       <div className="resume-glass-wrapper">
          <div className="resume-content-rendered" dangerouslySetInnerHTML={{ __html: mdToHtml(content) }} />
       </div>
    </div>
  );
};
