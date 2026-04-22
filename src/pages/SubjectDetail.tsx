import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UploadCloud, FileText, BrainCircuit, RefreshCw, Trash2, Plus } from 'lucide-react';
import { uploadPDF, supabase } from '../lib/supabase';
import { generateStudyMaterials } from '../lib/gemini';
import { extractTextFromPDF } from '../lib/pdf-extractor';
import { InteractiveMCQ } from '../components/library/InteractiveMCQ';
import { InteractiveFlashcard } from '../components/library/InteractiveFlashcard';
import { InteractiveQA } from '../components/library/InteractiveQA';
import { StudyResume } from '../components/library/StudyResume';
import { useFileSystem } from '../hooks/useFileSystem';
import { useSpacedRepetition } from '../hooks/useSpacedRepetition';
import { useAuth } from '../context/AuthContext';
import { Calendar } from 'lucide-react';
import './SubjectDetail.css';

type GenerationTab = 'flashcards' | 'mcq' | 'explications' | 'resume';

export default function SubjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getNode, deleteNode } = useFileSystem();
  const { scheduleCourse, hasScheduledCourse, removeCourseSchedules, loading: isSpacedLoading } = useSpacedRepetition();
  const { profile } = useAuth();
  
  const courseNode = getNode(id || null);
  const storageKey = `aura_subject_${id}`;
  
  const [extractedContent, setExtractedContent] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const isScheduled = id ? hasScheduledCourse(id) : false;
  const [activeTab, setActiveTab] = useState<GenerationTab | 'source'>('flashcards');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [generations, setGenerations] = useState<Record<GenerationTab, string | null>>({
    flashcards: null, mcq: null, explications: null, resume: null
  });
  const [naiveAttachments, setNaiveAttachments] = useState<{ id: string, name: string, url: string }[]>([]);
  const [isUploadingNaive, setIsUploadingNaive] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'syncing' | 'error'>('syncing');
  const [syncError, setSyncError] = useState<string | null>(null);

  // Load data from Supabase or LocalStorage
  useEffect(() => {
    async function loadData() {
      if (!id) return;
      setDataLoading(true);

      try {
        setSyncStatus('syncing');
        if (!profile) {
          // Fallback to local
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (parsed.extractedContent) setExtractedContent(parsed.extractedContent);
              if (parsed.generations) setGenerations(parsed.generations);
              if (parsed.pdfUrl) setPdfUrl(parsed.pdfUrl);
              if (parsed.fileName) setFileName(parsed.fileName);
              if (parsed.naiveAttachments) setNaiveAttachments(parsed.naiveAttachments);
            } catch (e) {
              console.error('Failed to load local data');
            }
          }
          setDataLoading(false);
          setSyncStatus('connected');
          return;
        }

        // 1. Fetch from Supabase
        const { data, error } = await supabase
          .from('course_data')
          .select('*')
          .eq('course_id', id)
          .single();

        if (error && error.code === 'PGRST116') {
          // 2. Migration Bridge: Check for local data to upload
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            console.log('Migrating local course data to Supabase...');
            const { error: insertError } = await supabase.from('course_data').upsert({
              user_id: profile.id,
              course_id: id,
              extracted_content: parsed.extractedContent,
              generations: parsed.generations,
              pdf_url: parsed.pdfUrl,
              file_name: parsed.fileName,
              updated_at: new Date().toISOString()
            }, { onConflict: 'course_id' });

            if (!insertError) {
              setExtractedContent(parsed.extractedContent);
              setGenerations(parsed.generations);
              setPdfUrl(parsed.pdfUrl);
              setFileName(parsed.fileName);
              localStorage.removeItem(storageKey);
            }
          }
          setSyncStatus('connected');
        } else if (data) {
          setExtractedContent(data.extracted_content || '');
          setGenerations(data.generations || { flashcards: null, mcq: null, explications: null, resume: null });
          setPdfUrl(data.pdf_url);
          setFileName(data.file_name);
          setNaiveAttachments(data.naive_attachments || []);
          setSyncStatus('connected');
        }
      } catch (err: any) {
        console.error('Error loading subject data:', err);
        setSyncStatus('error');
        setSyncError(err.message || 'Erreur de connexion Cloud');
      } finally {
        setDataLoading(false);
      }
    }

    loadData();
  }, [id, storageKey, profile]);

  // Save to Supabase (debounce or specific actions)
  const saveToCloud = async (updates: any) => {
    if (!profile || !id) return;
    setSyncStatus('syncing');
    const { error } = await supabase.from('course_data').upsert({
      user_id: profile.id,
      course_id: id,
      ...updates,
      updated_at: new Date().toISOString()
    }, { onConflict: 'course_id' });
    
    if (error) {
      console.error('Critical: Cloud save failed in SubjectDetail:', error);
      setSyncStatus('error');
      setSyncError(error.message);
      // If it's a foreign key error, the node might not have reached the cloud yet
      if (error.code === '23503') {
        console.warn('Node ID not found in cloud yet. Retrying in 2s...');
        setTimeout(() => saveToCloud(updates), 2000);
      }
    } else {
      setSyncStatus('connected');
      setSyncError(null);
    }
  };

  // Save to local fallback (Buffer for sync reliability)
  useEffect(() => {
    // We always save to local if we have content, acting as a buffer
    if (extractedContent || Object.values(generations).some(g => g !== null) || pdfUrl || naiveAttachments.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify({ extractedContent, generations, pdfUrl, fileName, naiveAttachments }));
    }
  }, [extractedContent, generations, pdfUrl, fileName, storageKey]);

  // Sync time spent to database
  useEffect(() => {
    if (!id || !courseNode) return;
    const courseId = id; // local non-nullable
    
    const startTime = Date.now();
    
    return () => {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      if (timeSpent <= 0) return;

      const syncTime = async () => {
        if (!profile) {
          // Local fallback
          const storeKey = 'aura_time_spent';
          const savedStr = localStorage.getItem(storeKey);
          const saved = savedStr ? JSON.parse(savedStr) : {};
          if (!saved[courseId]) saved[courseId] = { courseName: courseNode.name, seconds: 0 };
          saved[courseId].seconds += timeSpent;
          localStorage.setItem(storeKey, JSON.stringify(saved));
          return;
        }

        // Cloud sync (upsert)
        // 1. Get current
        const { data } = await supabase
          .from('course_stats')
          .select('seconds')
          .eq('course_id', courseId)
          .single();
        
        const currentSeconds = data?.seconds || 0;

        // 2. Add and update
        await supabase.from('course_stats').upsert({
          user_id: profile.id,
          course_id: courseId,
          seconds: currentSeconds + timeSpent,
          updated_at: new Date().toISOString()
        }, { onConflict: 'course_id' });
      };
      
      syncTime();
    };
  }, [id, courseNode, profile]);

  // Migration Bridge for Time Spent (only once per course)
  useEffect(() => {
    if (!profile || !id) return;
    const courseId = id;

    async function migrateTime() {
      if (!profile) return; // double check for TS
      const storeKey = 'aura_time_spent';
      const savedStr = localStorage.getItem(storeKey);
      if (savedStr) {
        const saved = JSON.parse(savedStr);
        if (saved[courseId] && saved[courseId].seconds > 0) {
          console.log('Migrating local time spent for this course...');
          const { data } = await supabase.from('course_stats').select('seconds').eq('course_id', courseId).single();
          if (!data) {
             await supabase.from('course_stats').insert({
               user_id: profile.id,
               course_id: courseId,
               seconds: saved[courseId].seconds
             });
          }
          // Clear migration flag locally
          delete saved[courseId];
          localStorage.setItem(storeKey, JSON.stringify(saved));
        }
      }
    }
    migrateTime();
  }, [id, profile]);

  const [cloudStatus, setCloudStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [extractionProgress, setExtractionProgress] = useState({ current: 0, total: 0 });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFileName(selected.name);
    setIsGenerating(false);
    setIsUploading(true);
    setCloudStatus('uploading');
    setExtractionProgress({ current: 0, total: 0 });
    
    try {
      // 1. Parallel execution with separate tracking
      const [url, text] = await Promise.all([
        (async () => {
          try {
            const res = await uploadPDF(selected, id || 'general');
            setCloudStatus('done');
            return res;
          } catch (err) {
            setCloudStatus('error');
            throw err;
          }
        })(),
        extractTextFromPDF(selected, (current, total) => {
          setExtractionProgress({ current, total });
        })
      ]);
      
      if (url) setPdfUrl(url);
      setExtractedContent(text);

      // 3. Save to Local Buffer immediately (Backup)
      localStorage.setItem(storageKey, JSON.stringify({
        extractedContent: text,
        generations,
        pdfUrl: url,
        fileName: selected.name
      }));

      // 4. Atomic save to Cloud
      if (profile) {
        await saveToCloud({ 
          pdf_url: url, 
          extracted_content: text, 
          file_name: selected.name 
        });
      }
      
      alert('Document traité et sauvegardé avec succès !');
    } catch (error) {
      console.error('Error in handleFileUpload:', error);
      alert('Erreur lors du traitement du document.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleNaiveUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploadingNaive(true);
    try {
      const newAttachments = [...naiveAttachments];
      
      for (const file of files) {
        const url = await uploadPDF(file, `courses/${id}/attachments`);
        if (url) {
          newAttachments.push({
            id: crypto.randomUUID(),
            name: file.name,
            url: url
          });
        }
      }
      
      setNaiveAttachments(newAttachments);
      if (profile) await saveToCloud({ naive_attachments: newAttachments });
      alert(`${files.length} document(s) ajouté(s) à la bibliothèque !`);
    } catch (error) {
      console.error('Error uploading naive PDFs:', error);
      alert('Erreur lors du téléchargement des documents.');
    } finally {
      setIsUploadingNaive(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm('Supprimer ce document ?')) return;
    const updated = naiveAttachments.filter(a => a.id !== attachmentId);
    setNaiveAttachments(updated);
    if (profile) await saveToCloud({ naive_attachments: updated });
  };

  const handleGenerate = async () => {
    if (!extractedContent) return alert('Veuillez uploader un PDF en premier.');
    if (activeTab === 'explications' || activeTab === 'source') return; // QA and Source have no generation
    
    setIsGenerating(true);
    try {
      if (activeTab === 'flashcards' || activeTab === 'mcq' || activeTab === 'resume') {
        const result = await generateStudyMaterials(
          extractedContent.substring(0, 300000), 
          activeTab,
          profile?.preferences
        );
        const newGenerations = { ...generations, [activeTab]: result };
        setGenerations(newGenerations);

        // Instant local buffer
        localStorage.setItem(storageKey, JSON.stringify({
          extractedContent,
          generations: newGenerations,
          pdfUrl,
          fileName
        }));

        if (profile) await saveToCloud({ generations: newGenerations });
      }
    } catch (error) {
      console.error('Error generating materials:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const tabs = [
    { id: 'flashcards', label: '⚡ Flashcards (Anki)' },
    { id: 'mcq', label: '🎯 Examens Blancs (QCM)' },
    { id: 'explications', label: '🤖 Explications (IA)' },
    { id: 'resume', label: '✨ Résumé' },
  ];

  const updateData = (tab: GenerationTab, newData: any) => {
    const newGenerations = { ...generations, [tab]: newData };
    setGenerations(newGenerations);
    
    // Immediate Cloud Sync for manual updates (Flashcards edits, Chat history)
    if (profile) {
      saveToCloud({ generations: newGenerations });
    }
  };

  const handleSchedule = () => {
    if (id && courseNode) {
      scheduleCourse(id, courseNode.name);
      alert('Cours programmé avec la méthode des J (J+1, J+3, J+7, J+14, J+30) !');
    }
  };

  const handleUnschedule = () => {
    if (id) {
      removeCourseSchedules(id);
      alert('Cours retiré du calendrier de révisions.');
    }
  };

  if (dataLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: 'var(--text-secondary)' }}>
        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid var(--accent-primary)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
        <p>Récupération de vos ressources...</p>
      </div>
    );
  }

  return (
    <div className="fade-in subject-detail-container">
      <header className="subject-header">
        <div className="title-group">
          <button className="icon-button" onClick={() => navigate(courseNode?.parentId ? `/${courseNode.parentId}` : '/')}>
            <ArrowLeft size={24} />
          </button>
          <h1>{courseNode ? courseNode.name : id}</h1>
          {isScheduled && (
            <span style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', backgroundColor: 'var(--success)', color: 'white', borderRadius: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <Calendar size={12} /> <span className="desktop-only">Programmé</span>
            </span>
          )}
        </div>
        <div className="action-group">
          {isSpacedLoading ? (
            <button className="btn btn-outline" disabled>
              <RefreshCw className="animate-spin" size={18} /> <span className="desktop-only">Chargement...</span>
            </button>
          ) : isScheduled ? (
            <button 
              className="btn btn-outline"
              onClick={handleUnschedule}
            >
              <Calendar size={18} /> <span>Déprogrammer</span>
            </button>
          ) : (
            <button 
              className="btn btn-primary shadow-sm"
              onClick={handleSchedule}
            >
              <Calendar size={18} /> <span>Programmer</span>
            </button>
          )}
          <button 
            className="btn btn-outline" 
            style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
            onClick={() => {
              if (confirm('Voulez-vous vraiment supprimer ce cours ?')) {
                if (id) {
                  deleteNode(id);
                  removeCourseSchedules(id);
                }
                navigate(courseNode?.parentId ? `/${courseNode.parentId}` : '/');
              }
            }}
          >
            Supprimer
          </button>
        </div>
      </header>

      {/* Cloud Diagnostic Status (Only on error) */}
      {syncStatus === 'error' && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '0.6rem 1rem', 
          backgroundColor: 'var(--bg-secondary)', 
          borderRadius: '0.75rem', 
          fontSize: '0.8rem', 
          marginBottom: '1.5rem',
          borderLeft: `4px solid var(--danger)`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--danger)' }}></div>
              <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>
                Erreur Cloud
              </span>
            </div>
            <span style={{ opacity: 0.6 }}>ID: <code>{id}</code></span>
          </div>
          {syncError && (
            <span style={{ color: 'var(--danger)', fontWeight: 500 }}>
              ⚠️ {syncError}
            </span>
          )}
        </div>
      )}

      <div className="subject-content-grid">
        
        {/* Left Column: Source Material */}
        <div className="glass-panel source-column">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} className="text-accent" />
            Document Source
          </h3>
          
          {pdfUrl || extractedContent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-elevated)', borderRadius: '1rem', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '0.5rem', backgroundColor: '#ef444420', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={24} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p 
                    style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    title={fileName || 'Document mémorisé'}
                  >
                    {fileName || 'Document mémorisé'}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    ✅ Prêt pour l'étude
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => setActiveTab('source')}
                  className="btn btn-outline"
                  style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem' }}
                >
                  Lire le PDF
                </button>
                <label htmlFor="pdf-upload" className="btn btn-outline" style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem', cursor: 'pointer', textAlign: 'center' }}>
                  Remplacer
                </label>
                <input type="file" id="pdf-upload" accept=".pdf" onChange={handleFileUpload} style={{ display: 'none' }} />
              </div>
            </div>
          ) : (
            <div style={{ border: '2px dashed var(--border-color)', borderRadius: '0.75rem', padding: '2rem', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', marginBottom: '1rem' }}>
              <UploadCloud size={40} color="var(--text-secondary)" style={{ margin: '0 auto 1rem' }} />
              <p style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>Glissez-déposez le PDF ici</p>
              <input type="file" id="pdf-upload" accept=".pdf" onChange={handleFileUpload} style={{ display: 'none' }} />
              <label htmlFor="pdf-upload" className="btn btn-primary" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '1rem 2rem', alignItems: 'flex-start' }}>
                {isUploading ? (
                  <div style={{ fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {cloudStatus === 'uploading' ? <RefreshCw className="animate-spin" size={14} /> : cloudStatus === 'done' ? '✅' : '❌'}
                      <span>Cloud : {cloudStatus === 'uploading' ? 'Envoi...' : cloudStatus === 'done' ? 'Sauvegardé' : 'Erreur'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {extractionProgress.current < extractionProgress.total && extractionProgress.total > 0 ? <RefreshCw className="animate-spin" size={14} /> : '✅'}
                      <span>Lecture : {extractionProgress.current}/{extractionProgress.total} pages</span>
                    </div>
                  </div>
                ) : 'Uploader un PDF'}
              </label>
            </div>
          )}

          {/* Naive Attachments Section */}
          <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Documents Complémentaires
              <label htmlFor="naive-upload" style={{ cursor: 'pointer', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Plus size={14} /> Ajouter
                <input type="file" id="naive-upload" multiple accept=".pdf" onChange={handleNaiveUpload} style={{ display: 'none' }} />
              </label>
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {isUploadingNaive && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '0.5rem', fontSize: '0.85rem' }}>
                  <RefreshCw className="animate-spin" size={14} />
                  <span>Envoi en cours...</span>
                </div>
              )}
              
              {naiveAttachments.length === 0 && !isUploadingNaive ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>
                  Aucun PDF de consultation.
                </p>
              ) : (
                naiveAttachments.map(att => (
                  <div key={att.id} className="hover-lift" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                    <FileText size={18} style={{ color: 'var(--text-secondary)' }} />
                    <span 
                      style={{ flex: 1, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
                      title={att.name}
                      onClick={() => window.open(att.url, '_blank')}
                    >
                      {att.name}
                    </span>
                    <button 
                      onClick={() => handleDeleteAttachment(att.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', opacity: 0.5, cursor: 'pointer', padding: '0.2rem' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: AI Generations */}
        <div className="glass-panel generation-column">
          <div className="tabs-container">
            <button
               onClick={() => setActiveTab('source')}
               className={`tab-button ${activeTab === 'source' ? 'active' : ''}`}
             >
               📄 <span className="desktop-only">Source (PDF)</span><span className="mobile-only">PDF</span>
             </button>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as GenerationTab)}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              >
                {tab.label.split(' ')[0]} <span className="desktop-only">{tab.label.split(' ').slice(1).join(' ')}</span>
              </button>
            ))}
          </div>

          <div className="tab-content-area">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <BrainCircuit size={20} className="text-accent" />
                {tabs.find(t => t.id === activeTab)?.label.split('(')[0]}
              </h3>
              {activeTab !== 'explications' && activeTab !== 'source' && (
                <button 
                  className="btn btn-primary" 
                  onClick={handleGenerate}
                  disabled={isGenerating || !extractedContent}
                >
                  {isGenerating ? <RefreshCw className="animate-spin" size={16} /> : <span>Générer</span>}
                </button>
              )}
            </div>

            <div className="content-viewer">
              {/* PDF Source Tab */}
              <div style={{ display: activeTab === 'source' ? 'block' : 'none', height: '100%' }}>
                {!pdfUrl ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                    Aucun PDF disponible. Veuillez l'uploader à gauche.
                  </div>
                ) : (
                  <iframe 
                    src={pdfUrl} 
                    style={{ width: '100%', height: '100%', border: 'none', borderRadius: '0.5rem' }} 
                    title="Source PDF"
                  />
                )}
              </div>

              {/* Explications (IA) Tab */}
              <div style={{ display: activeTab === 'explications' ? 'block' : 'none', height: '100%' }}>
                <InteractiveQA 
                  data={generations.explications} 
                  onUpdate={d => updateData('explications', d)} 
                  documentContext={extractedContent}
                  preferences={profile?.preferences} 
                />
              </div>

              {/* Generalized Generation Tabs (Flashcards, MCQ, Resume) */}
              {tabs.map(tab => {
                const content = generations[tab.id as GenerationTab];
                if (tab.id === 'explications') return null; // Handled above

                return (
                  <div key={tab.id} style={{ display: activeTab === tab.id ? 'block' : 'none', height: '100%' }}>
                    {!content ? (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                        Cliquez sur "Générer Maintenant" pour traiter le document.
                      </div>
                    ) : (
                      <>
                        {tab.id === 'flashcards' && <InteractiveFlashcard data={content} onUpdate={(d) => updateData('flashcards', d)} courseId={id} />}
                        {tab.id === 'mcq' && <InteractiveMCQ data={content} courseId={id} courseName={courseNode?.name} />}
                        {tab.id === 'resume' && <StudyResume content={typeof content === 'string' ? content : JSON.stringify(content)} courseId={id} />}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
