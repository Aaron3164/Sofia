import { useState, useEffect } from 'react';
import { BookOpen, GraduationCap, Clock, Plus, Trash2, Folder, FileText, ChevronRight, ChevronDown, UploadCloud, RefreshCw, Paperclip, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useFileSystem, type FileNode } from '../hooks/useFileSystem';
import { useAuth } from '../context/AuthContext';
import { uploadPDF, supabase } from '../lib/supabase';

type StatTab = 'annales' | 'qcm' | 'time';

interface AnnaleGrade {
  id: string;
  folderId?: string; // Change from courseId to folderId
  subject: string; // Utilisé pour l'Année / Session
  score: number;
  date: string;
  attachments?: string[];
}

interface AnnaleFolder {
  id: string;
  name: string;
  parentId: string | null;
}

interface MCQGrade {
  id: string;
  courseId: string;
  courseName: string;
  score: number;
  total: number;
  date: string;
  mcqs?: any[];
  selectedAnswers?: Record<number, string[]>;
}

interface TimeSpent {
  [courseId: string]: {
    courseName: string;
    seconds: number;
  }
}

export default function Statistics() {
  const { nodes } = useFileSystem();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<StatTab>('annales');
  
  // State for Annales
  const [annales, setAnnales] = useState<AnnaleGrade[]>([]);
  const [annaleFolders, setAnnaleFolders] = useState<AnnaleFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [newAnnale, setNewAnnale] = useState({ subject: '', score: '', folderId: '' });
  const [annaleFiles, setAnnaleFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isAddingFolder, setIsAddingFolder] = useState(false);

  // State for QCM
  const [mcqGrades, setMcqGrades] = useState<MCQGrade[]>([]);
  const [expandedQcm, setExpandedQcm] = useState<string | null>(null);

  // State for Time
  const [timeData, setTimeData] = useState<TimeSpent>({});
  const [isFormVisible, setIsFormVisible] = useState(false);

  // 1. Initial Load & Migration
  useEffect(() => {
    async function loadData() {
      if (!profile) {
        // Local only
        const annalesStr = localStorage.getItem('aura_annales_grades');
        if (annalesStr) setAnnales(JSON.parse(annalesStr));

        const mcqStr = localStorage.getItem('aura_mcq_grades');
        if (mcqStr) setMcqGrades(JSON.parse(mcqStr));

        const timeStr = localStorage.getItem('aura_time_spent');
        if (timeStr) setTimeData(JSON.parse(timeStr));
        return;
      }

      // Cloud Fetch
      const [annalesRes, mcqRes, statsRes, foldersRes] = await Promise.all([
        supabase.from('annales_grades').select('*').order('date', { ascending: false }),
        supabase.from('mcq_grades').select('*').order('date', { ascending: false }),
        supabase.from('course_stats').select('*'),
        supabase.from('annale_folders').select('*')
      ]);

      if (foldersRes.data) {
        setAnnaleFolders(foldersRes.data.map((f: any) => ({
          id: f.id,
          name: f.name,
          parentId: f.parent_id
        })));
      } else {
        const localFolders = localStorage.getItem('aura_annale_folders');
        if (localFolders) setAnnaleFolders(JSON.parse(localFolders));
      }

      // Migration Bridge Logic
      if (!annalesRes.error && annalesRes.data.length === 0) {
        const local = localStorage.getItem('aura_annales_grades');
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed.length > 0) {
            await supabase.from('annales_grades').insert(parsed.map((p: any) => ({ 
              ...p, 
              user_id: profile.id,
              folder_id: p.folderId || p.courseId,
              attachments: p.attachments || []
            })));
            setAnnales(parsed);
          }
        }
      } else if (annalesRes.data) {
        setAnnales(annalesRes.data.map((a: any) => ({
          id: a.id,
          folderId: a.folder_id,
          subject: a.subject,
          score: a.score,
          date: a.date,
          attachments: a.attachments || []
        })));
      }

      if (!mcqRes.error && mcqRes.data.length === 0) {
        const local = localStorage.getItem('aura_mcq_grades');
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed.length > 0) {
            await supabase.from('mcq_grades').insert(parsed.map((p: any) => ({ 
              id: p.id,
              user_id: profile.id,
              course_id: p.courseId,
              course_name: p.courseName,
              score: p.score,
              total: p.total,
              date: p.date,
              mcqs: p.mcqs || [],
              selected_answers: p.selectedAnswers || {}
            })));
            setMcqGrades(parsed);
          }
        }
      } else if (mcqRes.data) {
        setMcqGrades(mcqRes.data.map(m => ({
          id: m.id,
          courseId: m.course_id,
          courseName: m.course_name,
          score: m.score,
          total: m.total,
          date: m.date,
          mcqs: m.mcqs,
          selectedAnswers: m.selected_answers
        })));
      }

      if (!statsRes.error && statsRes.data) {
        const statsMap: TimeSpent = {};
        statsRes.data.forEach((s: any) => {
          const node = nodes.find(n => n.id === s.course_id);
          statsMap[s.course_id] = { courseName: node?.name || 'Inconnu', seconds: s.seconds };
        });
        setTimeData(statsMap);
      }
    }
    loadData();
  }, [profile, nodes]);

  const handleAddAnnale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnale.subject || !newAnnale.score) {
      alert('Veuillez entrer une session et une note.');
      return;
    }
    
    const scoreNum = parseFloat(newAnnale.score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 20) {
      alert('La note doit être comprise entre 0 et 20.');
      return;
    }

    setIsUploading(true);
    let attachmentUrls: string[] = [];
    
    try {
      if (annaleFiles.length > 0) {
        const uploadPromises = annaleFiles.map(file => uploadPDF(file, `annales/${currentFolderId || 'root'}`));
        const results = await Promise.all(uploadPromises);
        attachmentUrls = results.filter((url): url is string => url !== null);
      }

      const newEntry: AnnaleGrade = {
        id: crypto.randomUUID(),
        folderId: currentFolderId || undefined,
        subject: newAnnale.subject,
        score: scoreNum,
        date: new Date().toISOString(),
        attachments: attachmentUrls
      };

      const updated = [newEntry, ...annales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAnnales(updated);
      localStorage.setItem('aura_annales_grades', JSON.stringify(updated));
      
      if (profile) {
        await supabase.from('annales_grades').insert([{ 
          id: newEntry.id,
          user_id: profile.id,
          folder_id: newEntry.folderId,
          subject: newEntry.subject,
          score: newEntry.score,
          date: newEntry.date,
          attachments: newEntry.attachments
        }]);
      }
      
      setNewAnnale({ subject: '', score: '', folderId: '' });
      setAnnaleFiles([]);
    } catch (error) {
      console.error('Error adding annale:', error);
      alert('Erreur lors du téléchargement des fichiers.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddFolder = async () => {
    if (!newFolderName.trim()) return;
    
    const newFolder: AnnaleFolder = {
      id: crypto.randomUUID(),
      name: newFolderName,
      parentId: currentFolderId
    };

    const updated = [...annaleFolders, newFolder];
    setAnnaleFolders(updated);
    localStorage.setItem('aura_annale_folders', JSON.stringify(updated));
    setNewFolderName('');
    setIsAddingFolder(false);

    if (profile) {
      await supabase.from('annale_folders').insert([{
        id: newFolder.id,
        user_id: profile.id,
        name: newFolder.name,
        parent_id: newFolder.parentId
      }]);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Toutes les annales dans ce dossier deviendront orphelines. Continuer ?')) return;

    const updatedFolders = annaleFolders.filter(f => f.id !== folderId);
    setAnnaleFolders(updatedFolders);
    localStorage.setItem('aura_annale_folders', JSON.stringify(updatedFolders));
    
    if (profile) {
      await supabase.from('annale_folders').delete().eq('id', folderId);
    }
    
    if (currentFolderId === folderId) setCurrentFolderId(null);
  };

  const handleDeleteAnnale = async (id: string) => {
    const updated = annales.filter(a => a.id !== id);
    setAnnales(updated);
    localStorage.setItem('aura_annales_grades', JSON.stringify(updated));
    if (profile) {
      await supabase.from('annales_grades').delete().eq('id', id);
    }
  };

  const handleDeleteQcm = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Voulez-vous vraiment supprimer cet examen blanc de votre historique ?')) {
      const updated = mcqGrades.filter(g => g.id !== id);
      setMcqGrades(updated);
      if (profile) {
        await supabase.from('mcq_grades').delete().eq('id', id);
      } else {
        localStorage.setItem('aura_mcq_grades', JSON.stringify(updated));
      }
    }
  };

  const tabs = [
    { id: 'annales', label: '🏆 Notes aux Annales' },
    { id: 'qcm', label: '📝 Examens Blancs (QCM)' },
    { id: 'time', label: '⏱️ Temps passé' },
  ];

  const formatSeconds = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header className="page-header" style={{ flexShrink: 0 }}>
        <h1>📈 Statistiques & Progression</h1>
        <p className="subtitle">Suivez vos résultats et votre temps d'étude</p>
      </header>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem', flexShrink: 0 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as StatTab)}
            className={`btn ${activeTab === t.id ? 'btn-primary' : 'btn-outline glass-panel'}`}
            style={{ whiteSpace: 'nowrap' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="glass-panel" style={{ flex: 1, padding: '2rem', borderRadius: '1rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        
        {activeTab === 'annales' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <BookOpen size={20} className="text-accent" />
                Vos Notes aux Annales
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => setIsFormVisible(!isFormVisible)} 
                  className={`btn ${isFormVisible ? 'btn-primary' : 'btn-outline'}`}
                  style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                >
                  <Plus size={16} style={{ marginRight: '0.5rem' }} /> {isFormVisible ? 'Masquer' : 'Ajouter une Note'}
                </button>
                <button 
                  onClick={() => setIsAddingFolder(true)} 
                  className="btn btn-outline"
                  style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                >
                  <Folder size={16} style={{ marginRight: '0.5rem' }} /> Nouveau Dossier
                </button>
              </div>
            </div>

            {/* Explorateur de Dossiers / Fil d'Ariane */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', padding: '0.75rem 1.25rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
              <button 
                onClick={() => setCurrentFolderId(null)}
                style={{ background: 'none', border: 'none', color: !currentFolderId ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: !currentFolderId ? 700 : 400 }}
              >
                Racine
              </button>
              {(() => {
                const getAncestors = (folderId: string): AnnaleFolder[] => {
                  const folder = annaleFolders.find(f => f.id === folderId);
                  if (!folder) return [];
                  if (!folder.parentId) return [folder];
                  return [...getAncestors(folder.parentId), folder];
                };
                const ancestors = currentFolderId ? getAncestors(currentFolderId) : [];
                return ancestors.map(folder => (
                  <div key={folder.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ChevronRight size={14} color="var(--text-secondary)" />
                    <button 
                      onClick={() => setCurrentFolderId(folder.id)}
                      style={{ background: 'none', border: 'none', color: currentFolderId === folder.id ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: currentFolderId === folder.id ? 700 : 400 }}
                    >
                      {folder.name}
                    </button>
                  </div>
                ));
              })()}
            </div>

            {isAddingFolder && (
              <div style={{ display: 'flex', gap: '0.5rem', padding: '1rem', backgroundColor: 'var(--accent-primary)10', borderRadius: '0.5rem', border: '1px solid var(--accent-primary)' }}>
                <input 
                  type="text" 
                  value={newFolderName} 
                  onChange={e => setNewFolderName(e.target.value)}
                  placeholder="Nom du dossier..."
                  className="input"
                  autoFocus
                  style={{ flex: 1 }}
                />
                <button onClick={handleAddFolder} className="btn btn-primary">Créer</button>
                <button onClick={() => setIsAddingFolder(false)} className="btn btn-outline">Annuler</button>
              </div>
            )}

            {isFormVisible && (
              <form onSubmit={handleAddAnnale} className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '2px border-color var(--accent-primary)', borderStyle: 'solid', borderWidth: '1px' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Session / Matière</label>
                    <input 
                      type="text" 
                      value={newAnnale.subject} 
                      onChange={e => setNewAnnale(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Ex: 2023 Rattrapage"
                      className="input"
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div style={{ flex: '0 0 100px' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Note (/20)</label>
                    <input 
                      type="number" 
                      step="0.5"
                      value={newAnnale.score} 
                      onChange={e => setNewAnnale(prev => ({ ...prev, score: e.target.value }))}
                      placeholder="14.5"
                      className="input"
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Fichiers PDF</label>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input 
                      type="file" 
                      multiple 
                      accept=".pdf"
                      onChange={e => setAnnaleFiles(Array.from(e.target.files || []))}
                      style={{ display: 'none' }}
                      id="annale-upload"
                    />
                    <label 
                      htmlFor="annale-upload" 
                      className="btn btn-outline"
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <UploadCloud size={18} />
                      {annaleFiles.length > 0 ? `${annaleFiles.length} fichiers` : 'Choisir PDF'}
                    </label>
                    
                    <button 
                      type="submit" 
                      className="btn btn-primary" 
                      disabled={isUploading}
                      style={{ padding: '0.75rem 1.5rem', marginLeft: 'auto' }}
                    >
                      {isUploading ? <RefreshCw size={18} className="spin" /> : <Plus size={18} />}
                      {isUploading ? 'Chargement...' : `Ajouter à ${currentFolderId ? annaleFolders.find(f => f.id === currentFolderId)?.name : 'la racine'}`}
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(() => {
                const currentSubFolders = annaleFolders.filter(f => (f.parentId || null) === (currentFolderId || null));
                const currentAnnales = annales.filter(a => (a.folderId || null) === (currentFolderId || null));

                if (currentSubFolders.length === 0 && currentAnnales.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', border: '2px dashed var(--border-color)', borderRadius: '1rem' }}>
                      <Folder size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                      <p>Ce dossier est vide.</p>
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {currentFolderId && (
                      <button 
                        onClick={() => {
                          const folder = annaleFolders.find(f => f.id === currentFolderId);
                          setCurrentFolderId(folder?.parentId || null);
                        }}
                        className="btn btn-outline"
                        style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', padding: '0.25rem 0.5rem' }}
                      >
                        <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} /> Retour
                      </button>
                    )}
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                      {currentSubFolders.map(f => (
                        <div 
                          key={f.id} 
                          className="hover-lift glass-panel" 
                          style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', cursor: 'pointer', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '1rem' }}
                          onClick={() => setCurrentFolderId(f.id)}
                        >
                          <Folder size={24} color="var(--accent-primary)" />
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {annales.filter(a => a.folderId === f.id).length} notes
                            </div>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteFolder(f.id); }} 
                            className="icon-button delete-btn" 
                            style={{ padding: '0.3rem', opacity: 0.5 }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {currentAnnales.map(a => (
                        <AnnaleGradeItem key={a.id} a={a} onDelete={handleDeleteAnnale} />
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === 'qcm' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <GraduationCap size={20} className="text-accent" />
              Historique des Examens Blancs
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {mcqGrades.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  Aucun QCM complété pour le moment.
                </div>
              ) : (
                <QcmTreeRoot 
                  nodes={nodes} 
                  mcqGrades={mcqGrades} 
                  expandedQcm={expandedQcm} 
                  setExpandedQcm={setExpandedQcm} 
                  onDelete={handleDeleteQcm} 
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'time' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Clock size={20} className="text-accent" />
              Temps passé par Matière
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {Object.keys(timeData).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  Aucun temps d'étude enregistré.
                </div>
              ) : (
                <TimeTreeRoot nodes={nodes} timeData={timeData} formatSeconds={formatSeconds} />
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ------ Helper Components for QCM Forest View ------

const isCorrectOption = (correctOpts: string[], option: string) => {
  return correctOpts.some(c => c.trim().toLowerCase() === option.trim().toLowerCase());
};

const getCorrectAnswers = (q: any): string[] => {
  if (q.correctAnswers && Array.isArray(q.correctAnswers)) return q.correctAnswers;
  if (q.correctAnswer) return [q.correctAnswer];
  return [];
};

function QcmGradeItem({ g, expandedQcm, setExpandedQcm, onDelete }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'var(--bg-elevated)', borderRadius: '0.5rem', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
      <div 
        className="hover-lift" 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', cursor: g.mcqs ? 'pointer' : 'default' }}
        onClick={() => g.mcqs && setExpandedQcm(expandedQcm === g.id ? null : g.id)}
      >
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Examen du {format(new Date(g.date), 'dd MMMM yyyy à HH:mm', { locale: fr })}
          </span>
          {g.mcqs && (
            <p style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: 'var(--accent-primary)' }}>
              {expandedQcm === g.id ? 'Masquer la correction' : 'Voir la correction détaillée'}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: (g.score/g.total) >= 0.5 ? 'var(--success)' : 'var(--danger)' }}>
            {g.score} / {g.total}
          </div>
          <button onClick={(e) => onDelete(g.id, e)} className="icon-button delete-btn" style={{ padding: '0.5rem' }} title="Supprimer de l'historique">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      {expandedQcm === g.id && g.mcqs && (
        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {g.mcqs.map((q: any, qIndex: number) => {
              const correctOpts = getCorrectAnswers(q);
              const selected = g.selectedAnswers?.[qIndex] || [];

              return (
                <div key={qIndex} style={{ padding: '1rem', borderRadius: '1rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                  <h5 style={{ marginBottom: '1rem', fontSize: '1rem' }}>{qIndex + 1}. {q.question}</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {q.options.map((option: string, oIndex: number) => {
                      const isSelected = selected.includes(option);
                      const isCorrect = isCorrectOption(correctOpts, option);
                      
                      let bgColor = 'var(--bg-primary)';
                      let borderColor = 'var(--border-color)';
                      let feedbackText = '';
                      
                      if (isCorrect && isSelected) {
                        bgColor = '#10b98120'; 
                        borderColor = 'var(--success)';
                        feedbackText = '✅ Bonne réponse cochée';
                      } else if (isCorrect && !isSelected) {
                        bgColor = '#f59e0b20'; 
                        borderColor = 'var(--warning)';
                        feedbackText = '⚠️ Réponse correcte oubliée';
                      } else if (!isCorrect && isSelected) {
                        bgColor = '#ef444420'; 
                        borderColor = 'var(--danger)';
                        feedbackText = '❌ Cochée par erreur';
                      }

                      return (
                        <div
                          key={oIndex}
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '0.5rem',
                            border: `1px solid ${borderColor}`,
                            backgroundColor: bgColor,
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            marginLeft: '0.5rem'
                          }}
                        >
                          <div style={{ 
                            width: '16px', height: '16px', flexShrink: 0, 
                            border: `2px solid ${isSelected ? (!isCorrect ? 'var(--danger)' : 'var(--accent-primary)') : 'var(--text-secondary)'}`, 
                            borderRadius: '4px',
                            backgroundColor: isSelected ? (!isCorrect ? 'var(--danger)' : 'var(--accent-primary)') : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {isSelected && <div style={{ width: '8px', height: '8px', backgroundColor: 'white', clipPath: 'polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%)' }} />}
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.9rem' }}>{option}</span>
                            {feedbackText && (
                              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: borderColor, marginTop: '0.2rem' }}>
                                {feedbackText}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function QcmTreeCourse({ course, mcqGrades, expandedQcm, setExpandedQcm, onDelete }: any) {
  const [isOpen, setIsOpen] = useState(false);
  if (mcqGrades.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
      <div 
        className="hover-lift glass-panel" 
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', cursor: 'pointer', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--accent-primary)', borderRadius: '0.5rem' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        <FileText size={20} color="var(--accent-primary)" />
        <span style={{ fontWeight: 600 }}>{course.name}</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{mcqGrades.length} examen(s)</span>
      </div>
      
      {isOpen && (
        <div style={{ paddingLeft: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
          {mcqGrades.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((g: any) => (
            <QcmGradeItem key={g.id} g={g} expandedQcm={expandedQcm} setExpandedQcm={setExpandedQcm} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function QcmTreeFolder({ folder, nodes, mcqGrades, expandedQcm, setExpandedQcm, onDelete }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const children = nodes.filter((n: FileNode) => n.parentId === folder.id);
  const courseIdsWithGrades = new Set(mcqGrades.map((g: any) => g.courseId));
  
  const hasGrades = (nodeId: string): boolean => {
    const childs = nodes.filter((n: FileNode) => n.parentId === nodeId);
    return childs.some((c: FileNode) => c.type === 'course' ? courseIdsWithGrades.has(c.id) : hasGrades(c.id));
  };

  const relevantChildren = children.filter((c: FileNode) => c.type === 'course' ? courseIdsWithGrades.has(c.id) : hasGrades(c.id));

  if (relevantChildren.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
      <div 
        className="hover-lift glass-panel" 
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', cursor: 'pointer', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        <Folder size={20} color={folder.color || 'var(--accent-primary)'} />
        <span style={{ fontWeight: 600 }}>{folder.name}</span>
      </div>
      {isOpen && (
        <div style={{ paddingLeft: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
          {relevantChildren.map((child: FileNode) => child.type === 'folder' 
            ? <QcmTreeFolder key={child.id} folder={child} nodes={nodes} mcqGrades={mcqGrades} expandedQcm={expandedQcm} setExpandedQcm={setExpandedQcm} onDelete={onDelete} />
            : <QcmTreeCourse key={child.id} course={child} mcqGrades={mcqGrades.filter((g: any) => g.courseId === child.id)} expandedQcm={expandedQcm} setExpandedQcm={setExpandedQcm} onDelete={onDelete} />
          )}
        </div>
      )}
    </div>
  );
}

function QcmTreeRoot({ nodes, mcqGrades, expandedQcm, setExpandedQcm, onDelete }: any) {
  const rootNodes = nodes.filter((n: FileNode) => n.parentId === null);
  const courseIdsWithGrades = new Set(mcqGrades.map((g: any) => g.courseId));
  
  const hasGrades = (nodeId: string): boolean => {
    const childs = nodes.filter((n: FileNode) => n.parentId === nodeId);
    return childs.some((c: FileNode) => c.type === 'course' ? courseIdsWithGrades.has(c.id) : hasGrades(c.id));
  };

  const relevantRoots = rootNodes.filter((c: FileNode) => c.type === 'course' ? courseIdsWithGrades.has(c.id) : hasGrades(c.id));

  const existingCourseIds = new Set(nodes.filter((n: FileNode) => n.type === 'course').map((n: FileNode) => n.id));
  const detachedGrades = mcqGrades.filter((g: any) => !existingCourseIds.has(g.courseId));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {relevantRoots.map((child: FileNode) => child.type === 'folder' 
            ? <QcmTreeFolder key={child.id} folder={child} nodes={nodes} mcqGrades={mcqGrades} expandedQcm={expandedQcm} setExpandedQcm={setExpandedQcm} onDelete={onDelete} />
            : <QcmTreeCourse key={child.id} course={child} mcqGrades={mcqGrades.filter((g: any) => g.courseId === child.id)} expandedQcm={expandedQcm} setExpandedQcm={setExpandedQcm} onDelete={onDelete} />
      )}
      {detachedGrades.length > 0 && (
         <QcmTreeCourse 
           key="deleted-courses" 
           course={{ id: 'deleted', name: 'Cours ou Examens Orphelins', type: 'course' } as any} 
           mcqGrades={detachedGrades} 
           expandedQcm={expandedQcm} 
           setExpandedQcm={setExpandedQcm} 
           onDelete={onDelete} 
         />
      )}
    </div>
  );
}
function TimeTreeCourse({ course, time, formatSeconds }: any) {
  return (
    <div key={course.id} style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'var(--bg-elevated)', borderRadius: '0.5rem', border: '1px solid var(--accent-primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={18} color="var(--accent-primary)" />
          <span style={{ fontWeight: '600' }}>{course.name}</span>
        </div>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{formatSeconds(time)}</span>
      </div>
      <div style={{ height: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
        <div 
          className="time-bar"
          style={{ 
            height: '100%', 
            backgroundColor: 'var(--accent-primary)',
            width: `${Math.min(100, (time / 3600) * 100)}%`,
            transition: 'width 1s ease-out'
          }} 
        />
      </div>
    </div>
  );
}

function TimeTreeFolder({ folder, nodes, timeData, formatSeconds }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const children = nodes.filter((n: FileNode) => n.parentId === folder.id);
  
  const hasTime = (nodeId: string): boolean => {
    const childs = nodes.filter((n: FileNode) => n.parentId === nodeId);
    return childs.some((c: FileNode) => c.type === 'course' ? !!timeData[c.id] : hasTime(c.id));
  };

  const relevantChildren = children.filter((c: FileNode) => c.type === 'course' ? !!timeData[c.id] : hasTime(c.id));

  if (relevantChildren.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
      <div 
        className="hover-lift glass-panel" 
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', cursor: 'pointer', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        <Folder size={20} color={folder.color || 'var(--accent-primary)'} />
        <span style={{ fontWeight: 600 }}>{folder.name}</span>
      </div>
      {isOpen && (
        <div style={{ paddingLeft: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
          {relevantChildren.map((child: FileNode) => child.type === 'folder' 
            ? <TimeTreeFolder key={child.id} folder={child} nodes={nodes} timeData={timeData} formatSeconds={formatSeconds} />
            : <TimeTreeCourse key={child.id} course={child} time={timeData[child.id]?.seconds || 0} formatSeconds={formatSeconds} />
          )}
        </div>
      )}
    </div>
  );
}

function TimeTreeRoot({ nodes, timeData, formatSeconds }: any) {
  const rootNodes = nodes.filter((n: FileNode) => n.parentId === null);
  
  const hasTime = (nodeId: string): boolean => {
    const childs = nodes.filter((n: FileNode) => n.parentId === nodeId);
    return childs.some((c: FileNode) => c.type === 'course' ? !!timeData[c.id] : hasTime(c.id));
  };

  const relevantRoots = rootNodes.filter((c: FileNode) => c.type === 'course' ? !!timeData[c.id] : hasTime(c.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {relevantRoots.map((child: FileNode) => child.type === 'folder' 
            ? <TimeTreeFolder key={child.id} folder={child} nodes={nodes} timeData={timeData} formatSeconds={formatSeconds} />
            : <TimeTreeCourse key={child.id} course={child} time={timeData[child.id]?.seconds || 0} formatSeconds={formatSeconds} />
      )}
    </div>
  );
}

function AnnaleGradeItem({ a, onDelete }: any) {
  return (
    <div className="hover-lift" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', backgroundColor: 'var(--bg-elevated)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <h4 style={{ margin: 0, fontSize: '1rem' }}>{a.subject}</h4>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {format(new Date(a.date), 'dd MMMM yyyy', { locale: fr })}
          </span>
          {a.attachments && a.attachments.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {a.attachments.map((url: string, idx: number) => (
                <button 
                  key={idx}
                  onClick={() => window.open(url, '_blank')}
                  className="btn btn-outline"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', height: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  title="Ouvrir le PDF"
                >
                  <Paperclip size={12} />
                  Doc {idx + 1}
                  <ExternalLink size={10} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: a.score >= 10 ? 'var(--success)' : 'var(--danger)' }}>
          {a.score} / 20
        </div>
        <button onClick={() => onDelete(a.id)} className="icon-button delete-btn" style={{ padding: '0.4rem' }}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// (Old components removed to simplify code)
