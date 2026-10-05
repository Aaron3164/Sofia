import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Save, X, Trash2, Plus, Image as ImageIcon, Sparkles } from 'lucide-react';
import { OccludedImageViewer, type OcclusionRect } from './OccludedImageViewer';
import { ImageOcclusionModal } from './ImageOcclusionModal';
import { compressImage, getImageFromClipboard } from '../../lib/image-utils';

export interface Flashcard {
  front: string;
  back: string;
  image?: string;
  imageSide?: 'front' | 'back' | 'both';
  occlusions?: OcclusionRect[];
}

export const InteractiveFlashcard: React.FC<{ 
  data: string | Flashcard[], 
  onUpdate?: (data: Flashcard[]) => void,
  courseId?: string
}> = ({ data, onUpdate, courseId }) => {
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

  // Global Keyboard Navigation (Space for Flip, ArrowLeft / ArrowRight for Next/Prev)
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
  }, [isEditing, isOcclusionModalOpen, cards.length]);

  const showFrontImage = Boolean(
    currentCard.image && 
    (currentCard.imageSide === 'front' || currentCard.imageSide === 'both' || !currentCard.imageSide)
  );

  const showBackImage = Boolean(
    currentCard.image && 
    (currentCard.imageSide === 'back' || currentCard.imageSide === 'both' || !currentCard.imageSide)
  );

  const cardMinHeight = (showFrontImage || showBackImage) ? '420px' : '300px';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      
      {/* Top Bar Navigation & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '560px', marginBottom: '1rem', alignItems: 'center' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Carte {currentIndex + 1} sur {cards.length}
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
          style={{ width: '100%', maxWidth: '560px', padding: '1.5rem', borderRadius: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
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

          {/* Image & Anki Occlusion Section */}
          <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ImageIcon size={16} color="var(--accent-primary)" /> Illustration & Masquage Anki
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
                        : 'Masquer des zones (Style Anki)'
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
            maxWidth: '560px',
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
              padding: '1.75rem',
              textAlign: 'center', 
              backgroundColor: 'var(--bg-elevated)', 
              borderRadius: '1.5rem',
              border: '1px solid var(--border-color)', 
              overflowY: 'auto'
            }}>
              {showFrontImage && currentCard.image && (
                <div style={{ marginBottom: '1rem', width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <OccludedImageViewer
                    imageUrl={currentCard.image}
                    occlusions={currentCard.occlusions}
                    isRevealed={false}
                    maxHeight="220px"
                    alt="Question Illustration"
                  />
                </div>
              )}
              <div style={{ fontSize: '1.2rem', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {currentCard.front}
              </div>
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
              padding: '1.75rem',
              textAlign: 'center', 
              backgroundColor: 'var(--accent-primary)', 
              color: 'white', 
              borderRadius: '1.5rem',
              transform: 'rotateX(180deg)', 
              overflowY: 'auto'
            }}>
              {showBackImage && currentCard.image && (
                <div style={{ marginBottom: '1rem', width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <OccludedImageViewer
                    imageUrl={currentCard.image}
                    occlusions={currentCard.occlusions}
                    isRevealed={true}
                    maxHeight="220px"
                    alt="Réponse Illustration"
                  />
                </div>
              )}
              <div style={{ fontSize: '1.1rem', lineHeight: 1.5, color: '#ffffff' }}>
                {currentCard.back}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      {!isEditing && (
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button className="btn btn-outline" onClick={handlePrev}>Précédente</button>
          <button className="btn btn-outline" onClick={() => setIsFlipped(!isFlipped)}>
            {isFlipped ? 'Voir Question' : 'Voir Réponse'}
          </button>
          <button className="btn btn-primary" onClick={handleNext}>Suivante</button>
        </div>
      )}

      {/* Anki Occlusion Editor Modal */}
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
