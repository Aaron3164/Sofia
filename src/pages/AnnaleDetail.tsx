import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, GraduationCap, MessageSquare, Trash2, 
  Maximize2, Minimize2, Folder 
} from 'lucide-react';
import { useFileSystem } from '../hooks/useFileSystem';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { supabase } from '../lib/supabase';
import { getCachedAllCourseData, updateCachedCourseData } from '../lib/courseDataCache';
import { InteractiveMCQ, type MCQ } from '../components/library/InteractiveMCQ';
import { InteractiveQA } from '../components/library/InteractiveQA';
import './SubjectDetail.css';

export default function AnnaleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm } = useDialog();
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

        // B. Fetch all courses from the parent folder to build strictly separated 2-zone context
        const parentId = annaleNode?.parentId || null;
        const siblingCourses = nodes.filter(n => 
          n.type === 'course' && 
          n.parentId === parentId && 
          n.id !== id && 
          !n.name.startsWith('🎓')
        );

        let combinedContext = `=== [ZONE_1_SUJET_OFFICIEL_DE_L_ANNALE : ${displayTitle}] ===\n`;
        combinedContext += `(CIBLE EXCLUSIVE DES CORRECTIONS : Lorsque l'étudiant demande de corriger l'annale ou d'expliquer une question N, ce sont EXCLUSIVEMENT les questions de cette ZONE 1 qui doivent être corrigées.)\n\n`;
        combinedContext += `--- TEXTE BRUT OFFICIEL DE L'ÉPREUVE ---\n${ownContent}\n\n`;

        // If parsed questions and official answers exist, format and append the official grid
        if (loadedQuestions && loadedQuestions.length > 0) {
          const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
          combinedContext += `--- GRILLE DE CORRECTION OFFICIELLE DU CONCOURS (VÉRITÉ ABSOLUE NON NÉGOCIABLE) ---\n`;
          loadedQuestions.forEach((q, qIdx) => {
            const raw = (q as any).correctAnswers ?? (q as any).correct_answers ?? (q as any).correctAnswer ?? (q as any).correct_answer ?? [];
            const rawArr = Array.isArray(raw) ? raw : [raw];
            const qNum = (q as any).questionNumber || (qIdx + 1);
            
            combinedContext += `[ANNALE_OFFICIELLE_QUESTION_${qNum}] Question ${qNum} : "${q.question}"\n`;
            if (q.options && q.options.length > 0) {
              const correctLetters: string[] = [];
              q.options.forEach((opt, oIdx) => {
                const optLetter = letters[oIdx] || `${oIdx + 1}`;
                const normOpt = opt.toLowerCase().trim();
                const isCorrect = rawArr.some(c => {
                  if (c === null || c === undefined) return false;
                  const cStr = c.toString().toLowerCase().trim();
                  return cStr === normOpt || cStr === optLetter.toLowerCase() || cStr === oIdx.toString();
                });
                if (isCorrect) correctLetters.push(optLetter);
                combinedContext += `  ${optLetter}. ${opt} -> ${isCorrect ? 'OFFICIELLEMENT VRAI' : 'OFFICIELLEMENT FAUX'}\n`;
              });
              combinedContext += `  => BONNES RÉPONSES OFFICIELLES DU CONCOURS : ${correctLetters.length > 0 ? correctLetters.join(', ') : 'Aucune'}\n`;
            } else if (q.expectedAnswer) {
              combinedContext += `  => RÉPONSE ATTENDUE OFFICIELLE : ${q.expectedAnswer}\n`;
            }
            if (q.explanation) {
              combinedContext += `  => Justification officielle : ${q.explanation}\n`;
            }
            combinedContext += `\n`;
          });
          combinedContext += `--- FIN DE LA GRILLE OFFICIELLE DU CONCOURS ---\n`;
        }
        combinedContext += `=== [FIN_ZONE_1_SUJET_OFFICIEL_DE_L_ANNALE] ===\n\n`;

        // ZONE 2: All theoretical courses in the same folder (from memory cache, cloud, or local storage even if never opened/revised yet)
        if (siblingCourses.length > 0) {
          combinedContext += `=== [ZONE_2_COURS_THEORIQUES_DU_DOSSIER] ===\n`;
          combinedContext += `(BASE DE CONNAISSANCES THÉORIQUES DU DOSSIER : Utilise l'ensemble de ces cours pour chercher les preuves, mécanismes, définitions et pages justifiant les réponses de l'annale ou pour répondre aux questions de l'étudiant. N'utilise JAMAIS un exercice interne à ces cours à la place des questions de la ZONE 1.)\n\n`;

          const allCachedCourses = user ? await getCachedAllCourseData(user.id) : [];

          for (const sibNode of siblingCourses) {
            const cloudEntry = allCachedCourses.find(c => c.course_id === sibNode.id);
            let courseText = cloudEntry?.extracted_content || '';
            let courseTitle = cloudEntry?.file_name || sibNode.name || 'Cours du dossier';
            let generationsObj = cloudEntry?.generations || {};

            if (!courseText) {
              const localRaw = localStorage.getItem(`aura_subject_${sibNode.id}`);
              if (localRaw) {
                try {
                  const localParsed = JSON.parse(localRaw);
                  courseText = localParsed.extractedContent || localParsed.generations?.resume || '';
                  if (localParsed.fileName) courseTitle = localParsed.fileName;
                  if (localParsed.generations) generationsObj = localParsed.generations;
                } catch {}
              }
            }

            if (courseText && courseText.trim()) {
              // Automatically populate/warm both in-memory cache and localStorage cache for this sibling course
              // so that opening the course later or using it in ChatSofIA is already 100% cached!
              updateCachedCourseData(sibNode.id, {
                file_name: courseTitle,
                extracted_content: courseText,
                generations: generationsObj
              });
              try {
                const existingLocal = localStorage.getItem(`aura_subject_${sibNode.id}`);
                if (!existingLocal) {
                  localStorage.setItem(`aura_subject_${sibNode.id}`, JSON.stringify({
                    extractedContent: courseText,
                    fileName: courseTitle,
                    generations: generationsObj
                  }));
                }
              } catch {}

              combinedContext += `--- DOCUMENT DE COURS THÉORIQUE DU DOSSIER : ${courseTitle} (ID: ${sibNode.id}) ---\n${courseText.substring(0, 80000)}\n\n`;
            }
          }
          combinedContext += `=== [FIN_ZONE_2_COURS_THEORIQUES_DU_DOSSIER] ===\n\n`;
        }

        setFolderCoursesContext(combinedContext);
      } catch (err) {
        console.error('Erreur chargement annale:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAnnaleData();
  }, [id, user?.id, annaleNode?.parentId, displayTitle, nodes.length]);

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
    const isConfirmed = await confirm('Voulez-vous vraiment supprimer définitivement cette annale ?');
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

  const qcmCount = questions.filter(q => q.type !== 'open' && q.options && q.options.length > 0).length;
  const openCount = questions.length - qcmCount;
  const examTabLabel = questions.length === 0 
    ? 'Épreuve' 
    : (qcmCount > 0 && openCount > 0 
        ? 'Épreuve Mixte' 
        : (openCount > 0 ? 'Épreuve Rédactionnelle' : 'Épreuve (QCM)'));

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
                    {qcmCount > 0 && openCount > 0 ? 'Annale Mixte' : (openCount > 0 ? 'Annale Rédactionnelle' : 'Annale Officielle')}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  <Folder size={12} />
                  <span>Dossier : <strong>{parentFolder?.name || 'Bibliothèque'}</strong></span>
                  <span>•</span>
                  <span>{questions.length} questions {openCount > 0 ? `(${qcmCount} QCM, ${openCount} rédactionnelle${openCount > 1 ? 's' : ''})` : 'extraites'}</span>
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
                <span>{examTabLabel}</span>
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
            <div style={{ flex: 1, height: '100%', overflowY: 'auto', display: activeTab === 'exam' ? 'block' : 'none' }}>
              {questions.length > 0 ? (
                <InteractiveMCQ
                  data={questions}
                  courseId={id}
                  courseName={rawTitle}
                  documentContext={folderCoursesContext}
                />
              ) : (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <p>Aucune question n'a été trouvée pour cette annale.</p>
                </div>
              )}
            </div>

            {/* Tab 2: Sofia AI Interactive Explanations */}
            <div style={{ flex: 1, height: '100%', overflowY: 'auto', padding: '1rem', display: activeTab === 'explications' ? 'block' : 'none' }}>
              <InteractiveQA
                data={qaData}
                onUpdate={handleQAUpdate}
                documentContext={folderCoursesContext}
                preferences={profile?.preferences}
                plan={profile?.plan}
                courseId={id}
              />
            </div>
          </>
        )}

      </div>

    </div>
  );
}
