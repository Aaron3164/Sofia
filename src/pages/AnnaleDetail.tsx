import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, GraduationCap, MessageSquare, Trash2, 
  Maximize2, Minimize2, Sparkles, Folder, CheckCircle2 
} from 'lucide-react';
import { useFileSystem } from '../hooks/useFileSystem';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { supabase } from '../lib/supabase';
import { InteractiveMCQ, type MCQ } from '../components/library/InteractiveMCQ';
import { InteractiveQA } from '../components/library/InteractiveQA';
import './SubjectDetail.css';

export default function AnnaleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { alert, confirm } = useDialog();
  const { getNode, deleteNode, nodes } = useFileSystem();
  const { profile, user } = useAuth();

  const annaleNode = getNode(id || null);
  const parentFolder = annaleNode?.parentId ? getNode(annaleNode.parentId) : null;

  // Active tab: 'exam' (MCQ) or 'explications' (Sofia AI Q&A)
  const [activeTab, setActiveTab] = useState<'exam' | 'explications'>('exam');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Annale Data
  const [questions, setQuestions] = useState<MCQ[]>([]);
  const [qaData, setQaData] = useState<string | null>(null);
  const [folderCoursesContext, setFolderCoursesContext] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Display Title (stripping 🎓 prefix if present)
  const rawTitle = annaleNode?.name || 'Sujet d\'Annale';
  const displayTitle = rawTitle.replace(/^🎓\s*/, '');

  // 1. Load Annale Content & Folder Courses Context
  useEffect(() => {
    async function loadAnnaleData() {
      if (!id) return;
      setLoading(true);

      try {
        let loadedQuestions: MCQ[] = [];
        let loadedQa: string | null = null;
        let ownContent = '';

        // A. Load this annale from Supabase
        if (user) {
          const { data, error } = await supabase
            .from('course_data')
            .select('generations, extracted_content')
            .eq('course_id', id)
            .maybeSingle();

          if (!error && data) {
            ownContent = data.extracted_content || '';
            const gen = data.generations;
            if (gen) {
              if (Array.isArray(gen.questions)) {
                loadedQuestions = gen.questions;
              } else if (typeof gen.mcq === 'string') {
                try {
                  loadedQuestions = JSON.parse(gen.mcq);
                } catch {
                  // ignore
                }
              }
              if (gen.explications) {
                loadedQa = typeof gen.explications === 'string' ? gen.explications : JSON.stringify(gen.explications);
              }
            }
          }
        }

        // Fallback to local storage
        if (loadedQuestions.length === 0) {
          const localSaved = localStorage.getItem(`aura_subject_${id}`);
          if (localSaved) {
            try {
              const parsed = JSON.parse(localSaved);
              if (parsed.generations?.questions) {
                loadedQuestions = parsed.generations.questions;
              } else if (parsed.generations?.mcq) {
                loadedQuestions = typeof parsed.generations.mcq === 'string' 
                  ? JSON.parse(parsed.generations.mcq) 
                  : parsed.generations.mcq;
              }
              if (parsed.generations?.explications) {
                loadedQa = parsed.generations.explications;
              }
              if (parsed.extractedContent) {
                ownContent = parsed.extractedContent;
              }
            } catch {
              // ignore
            }
          }
        }

        setQuestions(loadedQuestions);
        setQaData(loadedQa);

        // B. Fetch all courses from the parent folder to build context
        const parentId = annaleNode?.parentId || null;
        const siblingCourses = nodes.filter(n => 
          n.type === 'course' && 
          n.parentId === parentId && 
          n.id !== id && 
          !n.name.startsWith('🎓')
        );

        let combinedContext = `--- SUJET DE L'ANNALE : ${displayTitle} ---\n${ownContent}\n\n`;

        if (siblingCourses.length > 0 && user) {
          const courseIds = siblingCourses.map(c => c.id);
          const { data: siblingsData, error: sibError } = await supabase
            .from('course_data')
            .select('course_id, extracted_content, file_name')
            .in('course_id', courseIds);

          if (!sibError && siblingsData) {
            siblingsData.forEach(s => {
              const matchingNode = siblingCourses.find(c => c.id === s.course_id);
              const courseTitle = s.file_name || matchingNode?.name || 'Cours du dossier';
              if (s.extracted_content && s.extracted_content.trim()) {
                combinedContext += `--- COURS DU DOSSIER : ${courseTitle} ---\n${s.extracted_content.substring(0, 80000)}\n\n`;
              }
            });
          }
        }

        setFolderCoursesContext(combinedContext);
      } catch (err) {
        console.error('Erreur chargement annale:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAnnaleData();
  }, [id, user, annaleNode, nodes, displayTitle]);

  // Handle QA updates
  const handleQAUpdate = async (newData: string) => {
    setQaData(newData);
    if (!id) return;

    // Save locally
    const localSaved = localStorage.getItem(`aura_subject_${id}`);
    const parsed = localSaved ? JSON.parse(localSaved) : {};
    const updatedGenerations = {
      ...(parsed.generations || {}),
      is_annale: true,
      questions: questions,
      explications: newData
    };
    localStorage.setItem(`aura_subject_${id}`, JSON.stringify({
      ...parsed,
      generations: updatedGenerations
    }));

    // Save to Cloud
    if (user) {
      await supabase.from('course_data').upsert({
        course_id: id,
        user_id: user.id,
        generations: updatedGenerations,
        updated_at: new Date().toISOString()
      });
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    const isConfirmed = await confirm(
      'Voulez-vous vraiment supprimer définitivement cette annale ?',
      'Supprimer l\'annale'
    );
    if (!isConfirmed) return;

    if (id) {
      await deleteNode(id);
      localStorage.removeItem(`aura_subject_${id}`);
      navigate(annaleNode?.parentId ? `/${annaleNode.parentId}` : '/');
    }
  };

  // Handle Fullscreen toggle
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  return (
    <div className={`subject-detail-container ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      
      {/* Header bar */}
      <div className="glass-panel subject-header shadow-sm" style={{ padding: '0.85rem 1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          
          {/* Back & Breadcrumb / Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
            <button 
              className="btn btn-outline shadow-sm"
              onClick={() => navigate(annaleNode?.parentId ? `/${annaleNode.parentId}` : '/')}
              style={{ padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
              title="Retourner au dossier"
            >
              <ArrowLeft size={16} />
              <span className="desktop-only">Retour au dossier</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '0.75rem',
                background: 'linear-gradient(135deg, rgba(219, 39, 119, 0.2), rgba(168, 85, 247, 0.2))',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <GraduationCap size={22} />
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {displayTitle}
                  </h1>
                  <span style={{
                    padding: '0.2rem 0.55rem',
                    borderRadius: '1rem',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    backgroundColor: 'rgba(219, 39, 119, 0.15)',
                    color: 'var(--accent-primary)',
                    border: '1px solid rgba(219, 39, 119, 0.3)'
                  }}>
                    Annale Officielle
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  <Folder size={12} />
                  <span>Dossier : <strong>{parentFolder?.name || 'Bibliothèque'}</strong></span>
                  <span>•</span>
                  <span>{questions.length} questions extraites</span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls: Tabs & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            
            {/* Tab navigation buttons */}
            <div style={{
              display: 'flex',
              padding: '0.25rem',
              borderRadius: '0.75rem',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)'
            }}>
              <button
                onClick={() => setActiveTab('exam')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '0.55rem',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'exam' ? 'var(--accent-primary)' : 'transparent',
                  color: activeTab === 'exam' ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all 0.2s ease'
                }}
              >
                <GraduationCap size={15} />
                <span>Épreuve (QCM)</span>
              </button>

              <button
                onClick={() => setActiveTab('explications')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '0.55rem',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'explications' ? 'var(--accent-primary)' : 'transparent',
                  color: activeTab === 'explications' ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all 0.2s ease'
                }}
              >
                <MessageSquare size={15} />
                <span>Explications IA</span>
              </button>
            </div>

            {/* Fullscreen toggle */}
            <button 
              className="btn btn-outline"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Quitter le mode plein écran (Échap)' : 'Mode plein écran'}
              style={{ padding: '0.45rem 0.65rem' }}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            {/* Delete button */}
            <button 
              className="btn btn-outline delete-btn"
              onClick={handleDelete}
              title="Supprimer cette annale"
              style={{ padding: '0.45rem 0.65rem', color: 'var(--danger)' }}
            >
              <Trash2 size={16} />
            </button>
          </div>

        </div>
      </div>

      {/* Main Content Area */}
      <div className="glass-panel" style={{ flex: 1, minHeight: '500px', display: 'flex', flexDirection: 'column', borderRadius: '1.25rem', overflow: 'hidden' }}>
        
        {loading ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: 'var(--text-secondary)' }}>
            <div className="animate-spin" style={{ width: '36px', height: '36px', border: '3px solid var(--accent-primary)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Chargement de l'annale et synchronisation des cours du dossier...</p>
          </div>
        ) : (
          <>
            {/* Tab 1: MCQ Interactive Exam */}
            {activeTab === 'exam' && (
              <div style={{ flex: 1, height: '100%', overflowY: 'auto' }}>
                {questions.length > 0 ? (
                  <InteractiveMCQ
                    data={questions}
                    courseId={id}
                    courseName={displayTitle}
                    documentContext={folderCoursesContext}
                  />
                ) : (
                  <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <p>Aucune question n'a été trouvée pour cette annale.</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Sofia AI Interactive Explanations */}
            {activeTab === 'explications' && (
              <div style={{ flex: 1, height: '100%', overflowY: 'auto', padding: '1rem' }}>
                <InteractiveQA
                  data={qaData}
                  onUpdate={handleQAUpdate}
                  documentContext={folderCoursesContext}
                  plan={profile?.plan}
                />
              </div>
            )}
          </>
        )}

      </div>

    </div>
  );
}
