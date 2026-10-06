import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  AlertCircle, 
  Loader2, 
  ShieldCheck,
  Cloud
} from 'lucide-react';
import { 
  extractGoogleDriveFileId, 
  getGoogleDrivePreviewUrl, 
  fetchGoogleDrivePDFBuffer
} from '../../lib/google-drive';
import { extractTextFromPDF } from '../../lib/pdf-extractor';
import { useFileSystem } from '../../hooks/useFileSystem';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import './GoogleDriveImportModal.css';

interface GoogleDriveImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFolderId?: string | null;
  currentCourseId?: string;
  onSuccess?: (result: { courseId: string; fileName: string; pdfUrl: string; extractedContent: string }) => void;
}

export const GoogleDriveImportModal: React.FC<GoogleDriveImportModalProps> = ({
  isOpen,
  onClose,
  currentFolderId = null,
  currentCourseId,
  onSuccess
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNode } = useFileSystem();

  // Link State
  const [driveUrl, setDriveUrl] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  
  // Processing & Loading State
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  /**
   * Enregistre un cours issu de Google Drive dans Sofia (Supabase + LocalStorage)
   * sans JAMAIS le téléverser sur Cloudflare R2 (0 Mo R2).
   */
  const saveDriveCourse = async (
    fileId: string, 
    fileName: string, 
    extractedContent: string
  ): Promise<string> => {
    const previewUrl = getGoogleDrivePreviewUrl(fileId);
    let targetCourseId = currentCourseId;

    if (!targetCourseId) {
      // Créer un nouveau nœud de cours dans l'arborescence
      const cleanName = fileName.replace(/\.[^/.]+$/, ''); // Retirer l'extension .pdf si présente
      const newNode = await addNode(cleanName, 'course', currentFolderId);
      targetCourseId = newNode.id;
    }

    // Sauvegarde en LocalStorage (Buffer immédiat)
    const storageKey = `subject_data_${targetCourseId}`;
    const localData = {
      extractedContent,
      generations: { flashcards: null, mcq: null, explications: null, resume: null },
      pdfUrl: previewUrl,
      fileName,
      naiveAttachments: []
    };
    localStorage.setItem(storageKey, JSON.stringify(localData));

    // Sauvegarde atomique sur Supabase si l'utilisateur est authentifié
    if (user) {
      try {
        await supabase.from('course_data').upsert({
          user_id: user.id,
          course_id: targetCourseId,
          pdf_url: previewUrl,
          file_name: fileName,
          extracted_content: extractedContent,
          updated_at: new Date().toISOString()
        }, { onConflict: 'course_id' });
      } catch (err) {
        console.warn('Erreur lors de la sauvegarde Cloud Supabase:', err);
      }
    }

    return targetCourseId;
  };

  /**
   * Importation via lien Google Drive direct
   */
  const handleImportByLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const fileId = extractGoogleDriveFileId(driveUrl);
    if (!fileId) {
      setErrorMessage('Lien Google Drive invalide. Veuillez coller une URL contenant un ID de fichier ou l\'ID direct.');
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Connexion à Google Drive & téléchargement en mémoire...');
    setProgress({ current: 0, total: 0 });

    try {
      // 1. Récupération du buffer en mémoire (aucun upload sur R2 !)
      const buffer = await fetchGoogleDrivePDFBuffer(fileId);
      
      // 2. Extraction du texte pour l'IA Sofia
      setStatusMessage('Lecture du PDF et extraction du texte pour Sofia IA...');
      const text = await extractTextFromPDF(buffer, (current, total) => {
        setProgress({ current, total });
      }).catch(err => {
        console.warn('Extraction partielle ou erreur OCR:', err);
        return 'Document importé depuis Google Drive.';
      });

      // 3. Enregistrement du cours
      setStatusMessage('Création du cours Sofia...');
      const finalTitle = courseTitle.trim() || 'Cours Google Drive';
      const targetCourseId = await saveDriveCourse(fileId, finalTitle, text);

      if (onSuccess) {
        onSuccess({
          courseId: targetCourseId,
          fileName: finalTitle,
          pdfUrl: getGoogleDrivePreviewUrl(fileId),
          extractedContent: text
        });
      } else if (!currentCourseId) {
        navigate(`/subject/${targetCourseId}`);
      }

      onClose();
    } catch (err: any) {
      console.error('Erreur import lien Google Drive:', err);
      setErrorMessage(err.message || 'Impossible d\'importer le document depuis Google Drive.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="gdrive-modal-overlay" onClick={onClose}>
      <div className="gdrive-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="gdrive-header">
          <div className="gdrive-header-title">
            <div className="gdrive-icon-badge">
              <svg width="22" height="22" viewBox="0 0 87.3 78" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z" fill="#0066da"/>
                <path d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44C.4 49.9 0 51.45 0 53h27.5L43.65 25z" fill="#00ac47"/>
                <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 10.15 7.9 13.65z" fill="#ea4335"/>
                <path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.4-4.5 1.2L43.65 25z" fill="#00832d"/>
                <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.4 4.5-1.2L59.8 53z" fill="#2684fc"/>
                <path d="M73.4 26.5 60.7 4.5C59.9 3.1 58.75 2 57.4 1.2L43.65 25l16.15 28h27.5c0-1.55-.4-3.1-1.2-4.5l-12.7-22z" fill="#ffba00"/>
              </svg>
            </div>
            <div>
              <h3>Importer depuis Google Drive</h3>
              <p>
                <ShieldCheck size={14} /> 0 Mo de stockage R2 • Fichier hébergé sur Drive
              </p>
            </div>
          </div>
          <button className="gdrive-close-btn" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="gdrive-content">
          {errorMessage && (
            <div className="gdrive-status-box" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.25)', color: '#f87171' }}>
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {isProcessing ? (
            <div className="gdrive-picker-cta" style={{ borderStyle: 'solid' }}>
              <Loader2 className="animate-spin" size={36} color="var(--accent-primary)" />
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{statusMessage}</h4>
                {progress.total > 0 && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Lecture : {progress.current} / {progress.total} pages
                    <div className="gdrive-progress-bar">
                      <div 
                        className="gdrive-progress-fill" 
                        style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }} 
                      />
                    </div>
                  </div>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Ce traitement est effectué temporairement en mémoire vive sans toucher à Cloudflare R2.
              </p>
            </div>
          ) : (
            <form onSubmit={handleImportByLink} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="gdrive-field">
                <label>Lien de partage du fichier PDF Google Drive *</label>
                <input 
                  type="text"
                  className="gdrive-input"
                  placeholder="https://drive.google.com/file/d/1BxiMVs.../view?usp=sharing"
                  value={driveUrl}
                  onChange={e => setDriveUrl(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              {!currentCourseId && (
                <div className="gdrive-field">
                  <label>Nom du cours (optionnel)</label>
                  <input 
                    type="text"
                    className="gdrive-input"
                    placeholder="Ex: Anatomie Cardiaque - Chapitre 1"
                    value={courseTitle}
                    onChange={e => setCourseTitle(e.target.value)}
                  />
                </div>
              )}

              <div className="gdrive-tip-box">
                <strong>💡 Comment obtenir le lien ?</strong>
                <ol style={{ margin: '0.4rem 0 0', paddingLeft: '1.2rem', lineHeight: '1.5' }}>
                  <li>Sur Google Drive, faites un clic droit sur votre PDF &gt; <em>Partager</em>.</li>
                  <li>Sous "Accès général", sélectionnez <strong>"Tous les utilisateurs disposant du lien"</strong>.</li>
                  <li>Cliquez sur <strong>"Copier le lien"</strong> et collez-le ici.</li>
                </ol>
              </div>

              <div className="gdrive-footer" style={{ padding: '0.5rem 0 0', border: 'none', background: 'transparent' }}>
                <button type="button" className="btn btn-outline" onClick={onClose}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary shadow-md">
                  <Cloud size={16} /> Importer le Cours
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
