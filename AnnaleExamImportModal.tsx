import React, { useState, useRef } from 'react';
import { 
  FileText, UploadCloud, X, Check, AlertCircle, Plus, Trash2, 
  Image as ImageIcon, ArrowRight, RefreshCw, KeyRound, Sparkles, GraduationCap 
} from 'lucide-react';
import { parseAnnalePDF, parseCorrectionGridText, type ExtractedQuestion, type AnnaleParseResult } from '../../lib/annale-parser';
import { compressImage, getImageFromClipboard } from '../../lib/image-utils';
import './AnnaleExamImportModal.css';

interface AnnaleExamImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (questions: ExtractedQuestion[]) => void;
}

export const AnnaleExamImportModal: React.FC<AnnaleExamImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  // Parsed Questions state
  const [questions, setQuestions] = useState<ExtractedQuestion[]>([]);
  const [unassignedImages, setUnassignedImages] = useState<{ id: string; url: string; pageNumber: number }[]>([]);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Quick Correction Grid panel
  const [showGridInput, setShowGridInput] = useState(false);
  const [gridInputText, setGridInputText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Veuillez sélectionner un fichier PDF valide.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress({ current: 0, total: 0 });

    try {
      const result: AnnaleParseResult = await parseAnnalePDF(
        file,
        (progressText, current, total) => {
          setLoadingText(progressText);
          setProgress({ current, total });
        }
      );

      if (result.questions.length === 0) {
        setError("Aucune question n'a pu être extraite. Le document ne semble pas contenir de texte lisible ou est une image scannée sans couche de texte.");
        setIsLoading(false);
        return;
      }

      setQuestions(result.questions);
      setUnassignedImages(result.unassignedImages);
      setStep('review');
    } catch (err: any) {
      console.error('Failed to parse annale PDF:', err);
      setError(err.message || "Erreur lors de la lecture du fichier PDF.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isLoading) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleApplyGrid = () => {
    if (!gridInputText.trim()) return;
    const gridMap = parseCorrectionGridText(gridInputText);

    if (gridMap.size === 0) {
      alert("Format de grille non reconnu. Exemple attendu :\n1: AC\n2: BDE\n3: A");
      return;
    }

    setQuestions(prev => prev.map(q => {
      if (gridMap.has(q.questionNumber)) {
        return {
          ...q,
          correctAnswers: gridMap.get(q.questionNumber) || []
        };
      }
      return q;
    }));

    setShowGridInput(false);
    setGridInputText('');
  };

  const handleToggleAnswer = (qIndex: number, letter: string) => {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx !== qIndex) return q;
      const current = q.correctAnswers || [];
      const has = current.includes(letter);
      const nextAnswers = has 
        ? current.filter(l => l !== letter) 
        : [...current, letter].sort();
      return { ...q, correctAnswers: nextAnswers };
    }));
  };

  const handleQuestionTextChange = (qIndex: number, text: string) => {
    setQuestions(prev => prev.map((q, idx) => idx === qIndex ? { ...q, question: text } : q));
  };

  const handleOptionTextChange = (qIndex: number, optIndex: number, text: string) => {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx !== qIndex) return q;
      const newOpts = [...q.options];
      newOpts[optIndex] = text;
      return { ...q, options: newOpts };
    }));
  };

  const handleDeleteQuestion = (qIndex: number) => {
    setQuestions(prev => prev.filter((_, idx) => idx !== qIndex));
  };

  const handleAddQuestion = () => {
    const nextNum = questions.length > 0 ? Math.max(...questions.map(q => q.questionNumber)) + 1 : 1;
    setQuestions(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        questionNumber: nextNum,
        question: `Nouvelle question ${nextNum}`,
        options: [
          'A. Première proposition',
          'B. Deuxième proposition',
          'C. Troisième proposition',
          'D. Quatrième proposition',
          'E. Cinquième proposition'
        ],
        correctAnswers: ['A']
      }
    ]);
  };

  const handleAddImageToQuestion = async (qIndex: number, file: File) => {
    try {
      const compressed = await compressImage(file, 1200, 1200, 0.82);
      setQuestions(prev => prev.map((q, idx) => {
        if (idx !== qIndex) return q;
        const currentImgs = q.images || [];
        return { ...q, images: [...currentImgs, compressed] };
      }));
    } catch (e) {
      console.error('Failed to compress image:', e);
    }
  };

  const handleRemoveImageFromQuestion = (qIndex: number, imgIdx: number) => {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx !== qIndex) return q;
      const currentImgs = [...(q.images || [])];
      currentImgs.splice(imgIdx, 1);
      return { ...q, images: currentImgs };
    }));
  };

  const handleAssignUnassignedImage = (img: { id: string; url: string }, qIndex: number) => {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx !== qIndex) return q;
      return { ...q, images: [...(q.images || []), img.url] };
    }));
    setUnassignedImages(prev => prev.filter(item => item.id !== img.id));
  };

  const handleFinalStart = () => {
    if (questions.length === 0) return;
    onSuccess(questions);
    onClose();
  };

  const questionsWithAnswersCount = questions.filter(q => q.correctAnswers && q.correctAnswers.length > 0).length;
  const totalImagesCount = questions.reduce((acc, q) => acc + (q.images?.length || 0), 0);

  return (
    <div className="annale-modal-overlay" onClick={onClose}>
      <div className="annale-modal-container" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="annale-modal-header">
          <div className="annale-header-info">
            <div className="annale-header-icon">
              <GraduationCap size={22} />
            </div>
            <div>
              <h2>Importer une Annale (QCM)</h2>
              <p>Retranscription mot pour mot • Assistance IA • Schémas & figures inclus</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="annale-close-btn"
            title="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="annale-modal-body">
          {error && (
            <div className="annale-soft-alert">
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>Impossible de traiter ce fichier :</strong> {error}
              </div>
            </div>
          )}

          {step === 'upload' && !isLoading && (
            <div 
              className="annale-dropzone-wrapper"
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="application/pdf" 
                style={{ display: 'none' }} 
                onChange={e => {
                  if (e.target.files?.[0]) handleFile(e.target.files[0]);
                }}
              />
              
              <div className="annale-dropzone-icon-pulse">
                <UploadCloud size={32} />
              </div>

              <div className="annale-dropzone-content">
                <h3>Glissez votre sujet d'annale PDF ici</h3>
                <p>ou cliquez pour sélectionner un fichier sur votre ordinateur</p>
              </div>

              <div className="annale-dropzone-features">
                <span className="annale-dropzone-chip">
                  <Sparkles size={13} className="text-accent" />
                  Format mot pour mot
                </span>
                <span className="annale-dropzone-chip">
                  <span>🖼️</span>
                  Extraction des schémas & radios
                </span>
                <span className="annale-dropzone-chip">
                  <span>✅</span>
                  Détection des corrigés (cases cochées)
                </span>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="annale-progress-card">
              <div className="annale-spinner-glow">
                <RefreshCw className="animate-spin text-accent" size={40} />
              </div>

              <div style={{ maxWidth: '420px', width: '100%' }}>
                <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {loadingText || 'Analyse de votre annale...'}
                </h4>
                {progress.total > 0 && (
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Traitement de la page {progress.current} sur {progress.total}
                  </p>
                )}
              </div>

              <div className="annale-progress-bar-container">
                <div 
                  className="annale-progress-bar-fill" 
                  style={{ width: `${progress.total > 0 ? Math.max(15, (progress.current / progress.total) * 100) : 35}%` }}
                />
              </div>

              <div className="annale-steps-indicator">
                <div className={`annale-step-item ${progress.current > 0 ? 'active' : ''}`}>
                  <div className="annale-step-dot" />
                  <span>1. Extraction du texte et des schémas du PDF</span>
                </div>
                <div className={`annale-step-item ${loadingText.includes('Sofia') ? 'active' : ''}`}>
                  <div className="annale-step-dot" />
                  <span>2. Structuration mot pour mot et analyse des corrigés par Sofia IA</span>
                </div>
                <div className="annale-step-item">
                  <div className="annale-step-dot" />
                  <span>3. Préparation de votre examen blanc interactif</span>
                </div>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Badge overview & top controls */}
              <div className="annale-review-bar">
                <div className="annale-badge-list">
                  <span className="annale-pill-badge accent">
                    <FileText size={14} />
                    {questions.length} questions
                  </span>
                  <span className={`annale-pill-badge ${questionsWithAnswersCount === questions.length ? 'success' : ''}`}>
                    <Check size={14} />
                    {questionsWithAnswersCount}/{questions.length} corrigées
                  </span>
                  {totalImagesCount > 0 && (
                    <span className="annale-pill-badge">
                      <ImageIcon size={14} />
                      {totalImagesCount} schéma{totalImagesCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <button 
                    className="btn btn-outline" 
                    onClick={() => setShowGridInput(!showGridInput)}
                    style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <KeyRound size={14} />
                    <span>Coller une grille</span>
                  </button>
                  <button 
                    className="btn btn-outline" 
                    onClick={handleAddQuestion}
                    style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Plus size={14} />
                    <span>Ajouter une question</span>
                  </button>
                </div>
              </div>

              {/* Paste correction grid drawer */}
              {showGridInput && (
                <div style={{
                  padding: '1.25rem',
                  borderRadius: '1rem',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--accent-primary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <KeyRound size={16} className="text-accent" />
                      Coller la grille de correction officielle
                    </span>
                    <button 
                      onClick={() => setShowGridInput(false)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Exemple accepté : <code>1: AC</code> ou <code>Q1: A, C</code> ou <code>1. BDE</code> (une question par ligne).
                  </p>
                  <textarea 
                    value={gridInputText}
                    onChange={e => setGridInputText(e.target.value)}
                    placeholder="1: AC&#10;2: BD&#10;3: ACE..."
                    rows={4}
                    className="annale-textarea"
                    style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button className="btn btn-primary" onClick={handleApplyGrid} style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}>
                      Appliquer aux questions
                    </button>
                  </div>
                </div>
              )}

              {/* Unassigned images gallery if any */}
              {unassignedImages.length > 0 && (
                <div style={{
                  padding: '1.25rem',
                  borderRadius: '1rem',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ImageIcon size={16} className="text-accent" />
                    <span>{unassignedImages.length} schéma(s) extrait(s) à assigner :</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                    {unassignedImages.map(img => (
                      <div key={img.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center' }}>
                        <div 
                          onClick={() => setZoomedImage(img.url)}
                          className="annale-image-thumb"
                          style={{ width: '90px', height: '65px' }}
                        >
                          <img src={img.url} alt="Extraite" />
                        </div>
                        <select 
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '0.4rem', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                          onChange={e => {
                            const qIdx = parseInt(e.target.value, 10);
                            if (!isNaN(qIdx)) handleAssignUnassignedImage(img, qIdx);
                          }}
                          defaultValue=""
                        >
                          <option value="" disabled>Assigner...</option>
                          {questions.map((q, idx) => (
                            <option key={q.id} value={idx}>Q{q.questionNumber || idx + 1}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Questions list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {questions.map((q, qIndex) => {
                  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].slice(0, Math.max(5, q.options.length));

                  return (
                    <div 
                      key={q.id} 
                      className="annale-question-card"
                      onPaste={(e) => {
                        const file = getImageFromClipboard(e);
                        if (file) {
                          handleAddImageToQuestion(qIndex, file);
                        }
                      }}
                    >
                      {/* Question Header & Stem */}
                      <div className="annale-question-header">
                        <div className="annale-q-badge">
                          <span>Question {q.questionNumber || qIndex + 1}</span>
                          {q.pageNumber && (
                            <span className="annale-page-tag">
                              (Page {q.pageNumber})
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={() => handleDeleteQuestion(qIndex)}
                          style={{ color: 'var(--danger)', padding: '0.3rem', background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6 }}
                          title="Supprimer cette question"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <textarea 
                        value={q.question}
                        onChange={e => handleQuestionTextChange(qIndex, e.target.value)}
                        rows={2}
                        placeholder="Énoncé de la question..."
                        className="annale-textarea"
                      />

                      {/* Attached Images */}
                      {q.images && q.images.length > 0 && (
                        <div className="annale-image-gallery">
                          {q.images.map((imgSrc, imgIdx) => (
                            <div key={imgIdx} className="annale-image-thumb">
                              <img 
                                src={imgSrc} 
                                alt={`Question ${qIndex + 1} illustration`} 
                                onClick={() => setZoomedImage(imgSrc)}
                                title="Agrandir l'image"
                              />
                              <button 
                                className="annale-image-delete-btn"
                                onClick={() => handleRemoveImageFromQuestion(qIndex, imgIdx)}
                                title="Supprimer cette image"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Image Button / Paste Tip */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <label 
                          htmlFor={`img-upload-${qIndex}`}
                          className="btn btn-outline"
                          style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        >
                          <ImageIcon size={14} />
                          <span>{q.images && q.images.length > 0 ? 'Ajouter un schéma' : 'Ajouter un schéma'}</span>
                        </label>
                        <input 
                          type="file" 
                          id={`img-upload-${qIndex}`} 
                          accept="image/*" 
                          style={{ display: 'none' }} 
                          onChange={e => {
                            if (e.target.files?.[0]) {
                              handleAddImageToQuestion(qIndex, e.target.files[0]);
                            }
                          }}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          💡 Vous pouvez aussi coller une capture avec <code>Ctrl+V</code>
                        </span>
                      </div>

                      {/* Options & Correct Answer Selection */}
                      <div className="annale-options-list">
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Propositions (Cliquez sur la lettre pour cocher la bonne réponse) :</span>
                          <span style={{ color: 'var(--success)' }}>
                            {q.correctAnswers?.length || 0} bonne{ (q.correctAnswers?.length || 0) > 1 ? 's' : '' } réponse{ (q.correctAnswers?.length || 0) > 1 ? 's' : '' }
                          </span>
                        </div>

                        {q.options.map((option, optIdx) => {
                          const letter = letters[optIdx] || String.fromCharCode(65 + optIdx);
                          const isCorrect = q.correctAnswers?.includes(letter);

                          return (
                            <div key={optIdx} className="annale-option-row">
                              <button 
                                type="button"
                                className={`annale-option-letter-btn ${isCorrect ? 'is-correct' : ''}`}
                                onClick={() => handleToggleAnswer(qIndex, letter)}
                                title={isCorrect ? 'Réponse correcte (cliquer pour décocher)' : 'Cliquer pour marquer comme réponse correcte'}
                              >
                                {isCorrect ? <Check size={16} /> : letter}
                              </button>
                              <input 
                                type="text"
                                value={option}
                                onChange={e => handleOptionTextChange(qIndex, optIdx, e.target.value)}
                                className={`annale-option-input ${isCorrect ? 'is-correct' : ''}`}
                              />
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

        {/* Footer */}
        <div className="annale-modal-footer">
          {step === 'review' ? (
            <>
              <button 
                className="btn btn-outline" 
                onClick={() => setStep('upload')}
                style={{ fontSize: '0.88rem' }}
              >
                Changer de fichier
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleFinalStart}
                disabled={questions.length === 0}
                style={{ fontSize: '0.92rem', padding: '0.65rem 1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <span>Lancer l'entraînement ({questions.length} QCM)</span>
                <ArrowRight size={18} />
              </button>
            </>
          ) : (
            <>
              <div />
              <button className="btn btn-outline" onClick={onClose} style={{ fontSize: '0.88rem' }}>
                Annuler
              </button>
            </>
          )}
        </div>

      </div>

      {/* Lightbox zoomed image */}
      {zoomedImage && (
        <div 
          onClick={() => setZoomedImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            cursor: 'zoom-out'
          }}
        >
          <img 
            src={zoomedImage} 
            alt="Zoom illustration" 
            style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: '0.75rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} 
          />
        </div>
      )}
    </div>
  );
};
