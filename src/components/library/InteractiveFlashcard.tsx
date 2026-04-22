import React, { useState } from 'react';
import { Edit2, Save, X, Trash2, Plus } from 'lucide-react';

interface Flashcard {
  front: string;
  back: string;
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
  React.useEffect(() => {
    if (courseId) {
      sessionStorage.setItem(`aura_flashcard_idx_${courseId}`, currentIndex.toString());
    }
  }, [currentIndex, courseId]);

  // Reset state on new generation
  React.useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    if (courseId) {
      sessionStorage.removeItem(`aura_flashcard_idx_${courseId}`);
    }
  }, [data]);

  const [isFlipped, setIsFlipped] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');

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

  const currentCard = cards[currentIndex];

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
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const newCards = [...cards];
    newCards[currentIndex] = { front: editFront, back: editBack };
    onUpdate?.(newCards);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirm('Voulez-vous vraiment supprimer cette flashcard ?')) {
      const newCards = cards.filter((_, i) => i !== currentIndex);
      onUpdate?.(newCards);
      
      const newIndex = currentIndex >= newCards.length ? Math.max(0, newCards.length - 1) : currentIndex;
      setCurrentIndex(newIndex);
      setIsEditing(false);
      setIsFlipped(false);
    }
  };

  const handleAdd = () => {
    const newCards = [...cards, { front: 'Nouvelle Question', back: 'Nouvelle Réponse' }];
    onUpdate?.(newCards);
    setCurrentIndex(newCards.length - 1);
    setIsFlipped(false);
    
    // Auto-enter edit mode for the new card
    setTimeout(() => {
        setEditFront('Nouvelle Question');
        setEditBack('Nouvelle Réponse');
        setIsEditing(true);
    }, 50);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '500px', marginBottom: '1rem', alignItems: 'center' }}>
        <div style={{ color: 'var(--text-secondary)' }}>
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
        <div className="glass-panel fade-in" style={{ width: '100%', maxWidth: '500px', padding: '1.5rem', borderRadius: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
           <div>
             <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Question (Recto)</label>
             <textarea 
               value={editFront} 
               onChange={e => setEditFront(e.target.value)}
               style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '80px', resize: 'vertical' }}
             />
           </div>
           <div>
             <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Réponse (Verso)</label>
             <textarea 
               value={editBack} 
               onChange={e => setEditBack(e.target.value)}
               style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '120px', resize: 'vertical' }}
             />
           </div>
           <button className="btn btn-primary" onClick={handleSaveEdit} style={{ width: '100%', justifyContent: 'center' }}>Enregistrer les modifications</button>
        </div>
      ) : (
        <div 
          className="glass-panel hover-lift"
          onClick={() => setIsFlipped(!isFlipped)}
          style={{
            width: '100%',
            maxWidth: '500px',
            height: '300px',
            perspective: '1000px',
            cursor: 'pointer',
            borderRadius: '1.5rem',
            position: 'relative',
          }}
        >
          <div style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateX(180deg)' : 'none'
          }}>
            {/* Recto */}
            <div style={{
              position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
              textAlign: 'center', fontSize: '1.25rem', fontWeight: 500,
              backgroundColor: 'var(--bg-elevated)', borderRadius: '1.5rem',
              border: '1px solid var(--border-color)', overflowY: 'auto'
            }}>
              {currentCard.front}
            </div>
            
            {/* Verso */}
            <div style={{
              position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
              textAlign: 'center', fontSize: '1.1rem',
              backgroundColor: 'var(--accent-primary)', color: 'white', borderRadius: '1.5rem',
              transform: 'rotateX(180deg)', overflowY: 'auto'
            }}>
              {currentCard.back}
            </div>
          </div>
        </div>
      )}

      {!isEditing && (
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button className="btn btn-outline" onClick={handlePrev}>Précédente</button>
          <button className="btn btn-outline" onClick={() => setIsFlipped(!isFlipped)}>
            {isFlipped ? 'Voir Question' : 'Voir Réponse'}
          </button>
          <button className="btn btn-primary" onClick={handleNext}>Suivante</button>
        </div>
      )}
    </div>
  );
};
