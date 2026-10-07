import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Save, X, Trash2, Plus, Image as ImageIcon, Sparkles, Clock, CheckCircle2 } from 'lucide-react';
import { OccludedImageViewer, type OcclusionRect } from './OccludedImageViewer';
import { ImageOcclusionModal } from './ImageOcclusionModal';
import { compressImage, getImageFromClipboard } from '../../lib/image-utils';
import { 
  calculateNextSchedule, 
  getSchedulePreviews, 
  type CardRating, 
  type SpacedCardData 
} from '../../lib/spaced-repetition';

export interface Flashcard extends SpacedCardData {
  id?: string;
  front: string;
  back: string;
  image?: string;
  imageSide?: 'front' | 'back' | 'both';
  occlusions?: OcclusionRect[];
}

export const InteractiveFlashcard: React.FC<{ 
  data: string | Flashcard[], 
  onUpdate?: (data: Flashcard[]) => void,
  courseId?: string,
  mode?: 'standard' | 'spaced-repetition'
}> = ({ data, onUpdate, courseId, mode = 'standard' }) => {
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (courseId) {
      const saved = sessionStorage.getItem(`aura_flashcard_idx_${courseId}`);
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });
  
  // Persist index when it changes
  useEffect(() => {
    if (courseId) {
      sessionStorage.setItem(`aura_flashcard_idx_${courseId}`, currentIndex.toString());
    }
  }, [currentIndex, courseId]);

  const isManualChangeRef = useRef(false);

  // Reset state on new generation
  useEffect(() => {
    if (isManualChangeRef.current) {
      isManualChangeRef.current = false;
      return;
    }
    setCurrentIndex(0);
    setIsFlipped(false);
    if (courseId) {
      sessionStorage.removeItem(`aura_flashcard_idx_${courseId}`);
    }
  }, [data, courseId]);

  const [isFlipped, setIsFlipped] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form editing states
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');
  const [editImage, setEditImage] = useState<string | undefined>(undefined);
  const [editImageSide, setEditImageSide] = useState<'front' | 'back' | 'both'>('both');
  const [editOcclusions, setEditOcclusions] = useState<OcclusionRect[]>([]);
  
  // Occlusion Modal state
  const [isOcclusionModalOpen, setIsOcclusionModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  let cards: Flashcard[] = [];
  try {
    if (typeof data === 'string') {
      let jsonStr = data;
      // Robust JSON extraction
      const startIdx = jsonStr.indexOf('[');
      const endIdx = jsonStr.lastIndexOf(']');
      
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        jsonStr = jsonStr.substring(startIdx, endIdx + 1);
      } else {
        jsonStr = jsonStr.replace(/```json\n?|```/g, '').trim();
      }
      
      const parsedData = JSON.parse(jsonStr);
      cards = Array.isArray(parsedData) ? parsedData : [];
    } else {
      cards = data;
    }
  } catch (e) {
    return <div className="text-danger">Échec de l'analyse des Flashcards. Les données reçues ne sont pas au format attendu.</div>;
  }

  // Handle zero cards
  if (cards.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Aucune Flashcard disponible.</p>
        {onUpdate && (
          <button 
            className="btn btn-primary"
            onClick={() => {
              isManualChangeRef.current = true;
              onUpdate([{ front: 'Nouvelle Question', back: 'Nouvelle Réponse' }]);
              setCurrentIndex(0);
            }}
          >
            <Plus size={18}/> Créer une Flashcard
          </button>
        )}
      </div>
    );
  }

  const currentCard = cards[currentIndex] || cards[0];

  const handleNext = () => {
    setIsFlipped(false);
    setIsEditing(false);
    setTimeout(() => setCurrentIndex((prev) => (prev + 1) % cards.length), 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setIsEditing(false);
    setTimeout(() => setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length), 150);
  };

  const startEdit = () => {
    setEditFront(currentCard.front);
    setEditBack(currentCard.back);
    setEditImage(currentCard.image);
    setEditImageSide(currentCard.imageSide || 'both');
    setEditOcclusions(currentCard.occlusions ? [...currentCard.occlusions] : []);
    setIsEditing(true);
  };

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const compressed = await compressImage(file);
      setEditImage(compressed);
      setEditOcclusions([]);
    } catch (err) {
      console.error('Erreur chargement image:', err);
    }
  };

  const handlePasteInEditor = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const file = getImageFromClipboard(e);
    if (file) {
      e.preventDefault();
      try {
        const compressed = await compressImage(file);
        setEditImage(compressed);
        setEditOcclusions([]);
      } catch (err) {
        console.error('Erreur collage image:', err);
      }
    }
  };

  const handleDropInEditor = async (e: React.DragEvent<HTMLDivElement>) => {
    const files = Array.from(e.dataTransfer.files);
    const imgFile = files.find(f => f.type.startsWith('image/'));
    if (imgFile) {
      e.preventDefault();
      e.stopPropagation();
      try {
        const compressed = await compressImage(imgFile);
        setEditImage(compressed);
        setEditOcclusions([]);
      } catch (err) {
        console.error('Erreur drop image:', err);
      }
    }
  };

  const handleSaveEdit = () => {
    const newCards = [...cards];
    newCards[currentIndex] = { 
      front: editFront, 
      back: editBack,
      image: editImage,
      imageSide: editImage ? editImageSide : undefined,
      occlusions: editImage && editOcclusions.length > 0 ? editOcclusions : undefined
    };
    isManualChangeRef.current = true;
    onUpdate?.(newCards);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirm('Voulez-vous vraiment supprimer cette flashcard ?')) {
      const newCards = cards.filter((_, i) => i !== currentIndex);
      isManualChangeRef.current = true;
      onUpdate?.(newCards);
      
      const newIndex = currentIndex >= newCards.length ? Math.max(0, newCards.length - 1) : currentIndex;
      setCurrentIndex(newIndex);
      setIsEditing(false);
      setIsFlipped(false);
    }
  };

  const handleAdd = () => {
    const insertIndex = currentIndex + 1;
    const newCard: Flashcard = { front: 'Nouvelle Question', back: 'Nouvelle Réponse' };
    const newCards = [...cards.slice(0, insertIndex), newCard, ...cards.slice(insertIndex)];

    isManualChangeRef.current = true;
    onUpdate?.(newCards);

    setCurrentIndex(insertIndex);
    setIsFlipped(false);
    setEditFront('Nouvelle Question');
    setEditBack('Nouvelle Réponse');
    setEditImage(undefined);
    setEditOcclusions([]);
    setEditImageSide('both');
    setIsEditing(true);
  };

  const handleRate = (rating: CardRating) => {
    const nextSchedule = calculateNextSchedule(currentCard, rating);
    const newCards = [...cards];
    newCards[currentIndex] = { 
      ...currentCard, 
      ...nextSchedule 
    };
    isManualChangeRef.current = true;
    onUpdate?.(newCards);

    setIsFlipped(false);
    setIsEditing(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % cards.length);
    }, 150);
  };

  // Global Keyboard Navigation (Space for Flip, 1/2/3/4 for SM-2 Rating, ArrowLeft / ArrowRight for Next/Prev)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
         activeElement.tagName === 'TEXTAREA' ||
         (activeElement as HTMLElement).isContentEditable)
      ) {
        return;
      }

      if (isEditing || isOcclusionModalOpen) return;

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (mode === 'spaced-repetition' && isFlipped && (e.key === '1' || e.key === '&' || e.code === 'Digit1' || e.code === 'Numpad1')) {
        e.preventDefault();
        handleRate(1);
      } else if (mode === 'spaced-repetition' && isFlipped && (e.key === '2' || e.key === 'é' || e.code === 'Digit2' || e.code === 'Numpad2')) {
        e.preventDefault();
        handleRate(2);
      } else if (mode === 'spaced-repetition' && isFlipped && (e.key === '3' || e.key === '"' || e.code === 'Digit3' || e.code === 'Numpad3')) {
        e.preventDefault();
        handleRate(3);
      } else if (mode === 'spaced-repetition' && isFlipped && (e.key === '4' || e.key === "'" || e.code === 'Digit4' || e.code === 'Numpad4')) {
        e.preventDefault();
        handleRate(4);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsFlipped(false);
        setIsEditing(false);
        setTimeout(() => setCurrentIndex((prev) => (prev + 1) % cards.length), 100);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsFlipped(false);
        setIsEditing(false);
        setTimeout(() => setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length), 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditing, isOcclusionModalOpen, cards.length, isFlipped, currentCard]);

  const showFrontImage = Boolean(
    currentCard.image && 
    (currentCard.imageSide === 'front' || currentCard.imageSide === 'both' || !currentCard.imageSide)
  );

  const showBackImage = Boolean(
    currentCard.image && 
    (currentCard.imageSide === 'back' || currentCard.imageSide === 'both' || !currentCard.imageSide)
  );

  const hasImage = showFrontImage || showBackImage;
  const cardMaxWidth = hasImage ? '860px' : '560px';
  const cardMinHeight = hasImage ? '540px' : '320px';
  const previews = getSchedulePreviews(currentCard);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      
      {/* Top Bar Navigation & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: isEditing ? '650px' : cardMaxWidth, marginBottom: '1rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
            Carte {currentIndex + 1} sur {cards.length}
          </span>
          {/* Spaced Repetition State Badge */}
          {mode === 'spaced-repetition' && (() => {
            const state = currentCard.state || 'new';
            if (state === 'review') {
              return (
                <span style={{ 
                  fontSize: '0.75rem', 
                  padding: '0.15rem 0.55rem', 
                  borderRadius: '9999px', 
                  background: 'rgba(16, 185, 129, 0.15)', 
                  color: '#10b981', 
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <CheckCircle2 size={12} /> Révision ({currentCard.interval || 1}j)
                </span>
              );
            }
            if (state === 'learning') {
              return (
                <span style={{ 
                  fontSize: '0.75rem', 
                  padding: '0.15rem 0.55rem', 
                  borderRadius: '9999px', 
                  background: 'rgba(245, 158, 11, 0.15)', 
                  color: '#f59e0b', 
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <Clock size={12} /> Apprentissage ({(currentCard.step || 0) + 1}/2)
                </span>
              );
            }
            if (state === 'relearning') {
              return (
                <span style={{ 
                  fontSize: '0.75rem', 
                  padding: '0.15rem 0.55rem', 
                  borderRadius: '9999px', 
                  background: 'rgba(239, 68, 68, 0.15)', 
                  color: '#ef4444', 
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <Clock size={12} /> Réapprentissage
                </span>
              );
            }
            return (
              <span style={{ 
                fontSize: '0.75rem', 
                padding: '0.15rem 0.55rem', 
                borderRadius: '9999px', 
                background: 'rgba(99, 102, 241, 0.15)', 
                color: 'var(--accent-primary)', 
                fontWeight: 600 
              }}>
                🌱 Nouvelle
              </span>
            );
          })()}
        </div>
        {onUpdate && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {isEditing ? (
               <>
                 <button style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', opacity: 0.8 }} onClick={handleDelete} title="Supprimer">
                   <Trash2 size={20} />
                 </button>
                 <button style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', opacity: 0.8 }} onClick={() => setIsEditing(false)} title="Annuler">
                   <X size={20} />
                 </button>
                 <button style={{ background: 'transparent', border: 'none', color: 'var(--success)', cursor: 'pointer', opacity: 0.8 }} onClick={handleSaveEdit} title="Enregistrer">
                   <Save size={20} />
                 </button>
               </>
            ) : (
               <>
                 <button style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', opacity: 0.8 }} onClick={startEdit} title="Éditer cette carte">
                   <Edit2 size={20} />
                 </button>
                 <button style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', opacity: 0.8 }} onClick={handleAdd} title="Ajouter une carte">
                   <Plus size={20} />
                 </button>
               </>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <div 
          className="glass-panel fade-in" 
          onPaste={handlePasteInEditor}
          onDrop={handleDropInEditor}
          onDragOver={(e) => e.preventDefault()}
          style={{ width: '100%', maxWidth: '650px', padding: '1.5rem', borderRadius: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          {/* Question / Front */}
          <div>
            <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>
              Question (Recto)
            </label>
            <textarea 
              value={editFront} 
              onChange={e => setEditFront(e.target.value)}
              placeholder="Écrivez la question ou le terme à réviser..."
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '75px', resize: 'vertical' }}
            />
          </div>

          {/* Answer / Back */}
          <div>
            <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>
              Réponse (Verso)
            </label>
            <textarea 
              value={editBack} 
              onChange={e => setEditBack(e.target.value)}
              placeholder="Écrivez la réponse détaillée ou l'explication..."
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '85px', resize: 'vertical' }}
            />
          </div>

          {/* Image & Image Occlusion Section */}
          <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ImageIcon size={16} color="var(--accent-primary)" /> Illustration & Masquage d'image
              </span>

              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                onChange={handleImageFileSelect} 
                style={{ display: 'none' }} 
              />

              {!editImage ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-outline"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <ImageIcon size={14} /> Importer une image
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-outline"
                    style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                  >
                    Remplacer
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditImage(undefined); setEditOcclusions([]); }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.3rem' }}
                    title="Supprimer l'image"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* If no image: Paste/Drop hint zone */}
            {!editImage ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '1.5px dashed var(--border-color)',
                  borderRadius: '0.75rem',
                  padding: '1.25rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'var(--bg-primary)',
                  transition: 'border-color 0.2s'
                }}
              >
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Glissez-déposez une image ici, ou collez-la avec <kbd style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', fontSize: '0.75rem' }}>Ctrl+V</kbd>
                </p>
              </div>
            ) : (
              /* Image Config Box */
              <div style={{ backgroundColor: 'var(--bg-primary)', padding: '0.9rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  {/* Miniature with occlusion overlay */}
                  <div style={{ position: 'relative', width: '90px', height: '90px', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                    <img src={editImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {editOcclusions.map(r => (
                      <div 
                        key={r.id} 
                        style={{
                          position: 'absolute',
                          left: `${r.x}%`,
                          top: `${r.y}%`,
                          width: `${r.width}%`,
                          height: `${r.height}%`,
                          backgroundColor: 'var(--accent-primary)',
                          opacity: 0.85
                        }} 
                      />
                    ))}
                  </div>

                  {/* Actions & Occlusion trigger */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setIsOcclusionModalOpen(true)}
                      className="btn btn-primary"
                      style={{
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        backgroundColor: 'var(--accent-primary)'
                      }}
                    >
                      <Sparkles size={15} /> 
                      {editOcclusions.length > 0 
                        ? `Modifier les masques (${editOcclusions.length} défini${editOcclusions.length > 1 ? 's' : ''})` 
                        : 'Masquer des zones'
                      }
                    </button>

                    {/* Side choice */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <span>Afficher sur :</span>
                      <select 
                        value={editImageSide} 
                        onChange={(e) => setEditImageSide(e.target.value as 'front' | 'back' | 'both')}
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.35rem',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-elevated)',
                          color: 'var(--text-primary)',
                          fontSize: '0.78rem'
                        }}
                      >
                        <option value="both">Recto et Verso</option>
                        <option value="front">Recto uniquement</option>
                        <option value="back">Verso uniquement</option>
                      </select>
                    </div>
                  </div>
                </div>

                {editOcclusions.length > 0 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-elevated)', padding: '0.4rem 0.6rem', borderRadius: '0.4rem' }}>
                    💡 Les {editOcclusions.length} masque(s) cacheront l'image au Recto et s'ouvriront au Verso.
                  </div>
                )}
              </div>
            )}
          </div>

          <button className="btn btn-primary" onClick={handleSaveEdit} style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
            Enregistrer les modifications
          </button>
        </div>
      ) : (
        /* Flashcard Flipping 3D View */
        <div 
          className="glass-panel hover-lift"
          onClick={() => setIsFlipped(!isFlipped)}
          style={{
            width: '100%',
            maxWidth: cardMaxWidth,
            minHeight: cardMinHeight,
            perspective: '1000px',
            cursor: 'pointer',
            borderRadius: '1.5rem',
            position: 'relative',
          }}
        >
          <div style={{
            width: '100%',
            height: '100%',
            minHeight: cardMinHeight,
            position: 'relative',
            transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateX(180deg)' : 'none'
          }}>
            {/* Recto (Question Side) */}
            <div style={{
              position: 'absolute', 
              inset: 0,
              width: '100%', 
              height: '100%', 
              backfaceVisibility: 'hidden',
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: showFrontImage ? '1rem' : '1.75rem',
              textAlign: 'center', 
              backgroundColor: 'var(--bg-elevated)', 
              borderRadius: '1.5rem',
              border: '1px solid var(--border-color)', 
              overflowY: 'auto'
            }}>
              {showFrontImage && currentCard.image && (
                <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
                  <OccludedImageViewer
                    imageUrl={currentCard.image}
                    occlusions={currentCard.occlusions}
                    isRevealed={false}
                    maxHeight="480px"
                    alt="Question Illustration"
                  />
                </div>
              )}
              {currentCard.front && (
                <div style={{ 
                  fontSize: showFrontImage ? '1.05rem' : '1.25rem', 
                  fontWeight: 500, 
                  color: 'var(--text-primary)', 
                  lineHeight: 1.5,
                  marginTop: showFrontImage ? '0.6rem' : 0,
                  padding: showFrontImage ? '0.4rem 1rem' : 0,
                  backgroundColor: showFrontImage ? 'var(--bg-primary)' : 'transparent',
                  borderRadius: showFrontImage ? '0.75rem' : 0,
                  border: showFrontImage ? '1px solid var(--border-color)' : 'none',
                  maxWidth: '95%'
                }}>
                  {currentCard.front}
                </div>
              )}
            </div>
            
            {/* Verso (Answer Side) */}
            <div style={{
              position: 'absolute', 
              inset: 0,
              width: '100%', 
              height: '100%', 
              backfaceVisibility: 'hidden',
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: showBackImage ? '1rem' : '1.75rem',
              textAlign: 'center', 
              backgroundColor: 'var(--accent-primary)', 
              color: 'white', 
              borderRadius: '1.5rem',
              transform: 'rotateX(180deg)', 
              overflowY: 'auto'
            }}>
              {showBackImage && currentCard.image && (
                <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
                  <OccludedImageViewer
                    imageUrl={currentCard.image}
                    occlusions={currentCard.occlusions}
                    isRevealed={true}
                    maxHeight="480px"
                    alt="Réponse Illustration"
                  />
                </div>
              )}
              {currentCard.back && (
                <div style={{ 
                  fontSize: showBackImage ? '1rem' : '1.15rem', 
                  lineHeight: 1.5, 
                  color: '#ffffff',
                  marginTop: showBackImage ? '0.6rem' : 0,
                  padding: showBackImage ? '0.4rem 1rem' : 0,
                  backgroundColor: showBackImage ? 'rgba(0, 0, 0, 0.25)' : 'transparent',
                  borderRadius: showBackImage ? '0.75rem' : 0,
                  maxWidth: '95%'
                }}>
                  {currentCard.back}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons & Spaced Repetition Grading */}
      {!isEditing && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: cardMaxWidth, marginTop: '1.75rem', gap: '0.85rem' }}>
          {isFlipped ? (
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center', gap: '0.75rem' }}>
              {mode === 'spaced-repetition' ? (
                <>
                  {/* Anki SM-2 Grading Buttons Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', width: '100%' }}>
                    {/* 1. À revoir (Again) */}
                    <button
                      className="hover-lift"
                      onClick={() => handleRate(1)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.85rem 0.5rem',
                        borderRadius: '1rem',
                        backgroundColor: 'rgba(239, 68, 68, 0.12)',
                        border: '1.5px solid rgba(239, 68, 68, 0.4)',
                        color: '#ef4444',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                      title="Touche 1 : À revoir"
                    >
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                        <span style={{ opacity: 0.6, marginRight: '0.25rem' }}>1</span> À revoir
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.9, background: 'rgba(239, 68, 68, 0.15)', padding: '0.15rem 0.5rem', borderRadius: '0.4rem' }}>
                        {previews.again.label}
                      </span>
                    </button>

                    {/* 2. Difficile (Hard) */}
                    <button
                      className="hover-lift"
                      onClick={() => handleRate(2)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.85rem 0.5rem',
                        borderRadius: '1rem',
                        backgroundColor: 'rgba(245, 158, 11, 0.12)',
                        border: '1.5px solid rgba(245, 158, 11, 0.4)',
                        color: '#f59e0b',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                      title="Touche 2 : Difficile"
                    >
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                        <span style={{ opacity: 0.6, marginRight: '0.25rem' }}>2</span> Difficile
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.9, background: 'rgba(245, 158, 11, 0.15)', padding: '0.15rem 0.5rem', borderRadius: '0.4rem' }}>
                        {previews.hard.label}
                      </span>
                    </button>

                    {/* 3. Correct (Good) */}
                    <button
                      className="hover-lift"
                      onClick={() => handleRate(3)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.85rem 0.5rem',
                        borderRadius: '1rem',
                        backgroundColor: 'rgba(16, 185, 129, 0.12)',
                        border: '1.5px solid rgba(16, 185, 129, 0.4)',
                        color: '#10b981',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                      title="Touche 3 : Correct"
                    >
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                        <span style={{ opacity: 0.6, marginRight: '0.25rem' }}>3</span> Correct
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.9, background: 'rgba(16, 185, 129, 0.15)', padding: '0.15rem 0.5rem', borderRadius: '0.4rem' }}>
                        {previews.good.label}
                      </span>
                    </button>

                    {/* 4. Facile (Easy) */}
                    <button
                      className="hover-lift"
                      onClick={() => handleRate(4)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.85rem 0.5rem',
                        borderRadius: '1rem',
                        backgroundColor: 'rgba(99, 102, 241, 0.12)',
                        border: '1.5px solid rgba(99, 102, 241, 0.4)',
                        color: '#6366f1',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                      title="Touche 4 : Facile"
                    >
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                        <span style={{ opacity: 0.6, marginRight: '0.25rem' }}>4</span> Facile
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.9, background: 'rgba(99, 102, 241, 0.15)', padding: '0.15rem 0.5rem', borderRadius: '0.4rem' }}>
                        {previews.easy.label}
                      </span>
                    </button>
                  </div>

                  {/* Sub-navigation controls */}
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.25rem' }}>
                    <button 
                      className="btn btn-outline" 
                      onClick={handlePrev} 
                      style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}
                    >
                      Précédente
                    </button>
                    <button 
                      className="btn btn-outline" 
                      onClick={() => setIsFlipped(false)} 
                      style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}
                    >
                      Voir Question (Recto)
                    </button>
                    <button 
                      className="btn btn-outline" 
                      onClick={handleNext} 
                      style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}
                    >
                      Suivante sans noter
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <button className="btn btn-outline" onClick={handlePrev}>Précédente</button>
                  <button className="btn btn-outline" onClick={() => setIsFlipped(false)}>Voir Question (Recto)</button>
                  <button className="btn btn-outline" onClick={handleNext}>Suivante</button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button className="btn btn-outline" onClick={handlePrev}>Précédente</button>
              <button 
                className="btn btn-primary shadow-sm" 
                onClick={() => setIsFlipped(true)}
                style={{ padding: '0.65rem 1.75rem', fontWeight: 600 }}
              >
                Afficher la Réponse
              </button>
              <button className="btn btn-outline" onClick={handleNext}>Suivante</button>
            </div>
          )}
        </div>
      )}

      {/* Image Occlusion Editor Modal */}
      {isOcclusionModalOpen && editImage && (
        <ImageOcclusionModal
          isOpen={isOcclusionModalOpen}
          imageUrl={editImage}
          initialOcclusions={editOcclusions}
          onSave={(newOcclusions) => {
            setEditOcclusions(newOcclusions);
          }}
          onClose={() => setIsOcclusionModalOpen(false)}
        />
      )}
    </div>
  );
};
