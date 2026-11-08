import React, { useState, useEffect, useMemo } from 'react';
import { useFileSystem, type FileNode } from '../hooks/useFileSystem';
import { Search, Zap, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { FolderRevisionModal } from '../components/library/FolderRevisionModal';
import { OccludedImageViewer, type OcclusionRect } from '../components/library/OccludedImageViewer';

interface Flashcard {
  front: string;
  back: string;
  image?: string;
  imageSide?: 'front' | 'back' | 'both';
  occlusions?: OcclusionRect[];
}

interface FlashcardSource {
  courseId: string;
  courseName: string;
  folderPath: string[];
  card: Flashcard;
}

const PAGE_SIZE = 40;

export default function FlashcardsExplorer() {
  const { nodes, getNode } = useFileSystem();
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [allCards, setAllCards] = useState<FlashcardSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  const getFolderPath = (node: FileNode): string[] => {
    const path: string[] = [];
    let current = getNode(node.parentId);
    while (current) {
      path.unshift(current.name);
      current = getNode(current.parentId);
    }
    return path;
  };

  const loadAllCards = async () => {
    setLoading(true);
    const cards: FlashcardSource[] = [];
    const processedCourseIds = new Set<string>();

    // 1. Fetch from Supabase (Cloud)
    if (profile) {
      try {
        const { data, error } = await supabase
          .from('course_data')
          .select('course_id, generations');

        if (!error && data) {
          data.forEach(row => {
            const courseNode = nodes.find(n => n.id === row.course_id);
            if (courseNode) {
              const flashcardsData = row.generations?.flashcards;
              if (flashcardsData) {
                const parsedCards = parseFlashcards(flashcardsData);
                if (parsedCards) {
                  const folderPath = getFolderPath(courseNode);
                  parsedCards.forEach((card: Flashcard) => {
                    cards.push({ courseId: courseNode.id, courseName: courseNode.name, folderPath, card });
                  });
                  processedCourseIds.add(row.course_id);
                }
              }
            }
          });
        }
      } catch (e) {
        console.error('Error fetching cloud flashcards:', e);
      }
    }

    // 2. Supplement with Local Storage (Local Buffer / Non-synced)
    nodes.filter(n => n.type === 'course').forEach(courseNode => {
      if (processedCourseIds.has(courseNode.id)) return; // Skip if already loaded from cloud

      const dataStr = localStorage.getItem(`aura_subject_${courseNode.id}`);
      if (dataStr) {
        try {
          const parsed = JSON.parse(dataStr);
          const flashcardsData = parsed.generations?.flashcards;
          if (flashcardsData) {
            const parsedCards = parseFlashcards(flashcardsData);
            if (parsedCards) {
              const folderPath = getFolderPath(courseNode);
              parsedCards.forEach((card: Flashcard) => {
                cards.push({ courseId: courseNode.id, courseName: courseNode.name, folderPath, card });
              });
            }
          }
        } catch (e) {}
      }
    });
    
    setAllCards(cards);
    setLoading(false);
  };

  const parseFlashcards = (data: any): Flashcard[] | null => {
    try {
      let jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
      
      // Robust JSON extraction
      const startIdx = jsonStr.indexOf('[');
      const endIdx = jsonStr.lastIndexOf(']');
      
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        jsonStr = jsonStr.substring(startIdx, endIdx + 1);
      } else {
        jsonStr = jsonStr.replace(/```json\n?|```/g, '').trim();
      }
      
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed : null;
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    if (nodes.length > 0) {
      loadAllCards();
    } else {
       setLoading(false);
    }
  }, [profile, nodes]);

  // Reset display count whenever search changes
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [searchQuery]);

  // Memoized search across ALL cards
  const filteredCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allCards;
    return allCards.filter(source =>
      source.card.front.toLowerCase().includes(q) ||
      source.card.back.toLowerCase().includes(q) ||
      source.courseName.toLowerCase().includes(q) ||
      source.folderPath.some(folder => folder.toLowerCase().includes(q))
    );
  }, [allCards, searchQuery]);

  // Sliced view for DOM rendering performance
  const visibleCards = useMemo(() => {
    return filteredCards.slice(0, displayCount);
  }, [filteredCards, displayCount]);

  const hasMore = visibleCards.length < filteredCards.length;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header style={{ marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>
            Flashcards Globales
          </h1>
          <p className="subtitle" style={{ margin: 0 }}>
            {filteredCards.length} flashcard{filteredCards.length > 1 ? 's' : ''} disponible{filteredCards.length > 1 ? 's' : ''}
            {filteredCards.length > visibleCards.length && ` (affichage des ${visibleCards.length} premières)`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => setIsRevisionModalOpen(true)}
            className="btn btn-primary"
          >
            <Zap size={16} /> Révision Globale (SM-2)
          </button>
        </div>
      </header>

      <div style={{ marginBottom: '1.5rem', position: 'relative', maxWidth: '560px' }}>
        <input 
          type="text"
          placeholder="Rechercher un mot-clé, concept ou dossier..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="input"
          style={{ 
            width: '100%', 
            padding: '0.625rem 1rem 0.625rem 2.5rem', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid var(--border-color)', 
            backgroundColor: 'var(--bg-secondary)', 
            color: 'var(--text-primary)', 
            fontSize: '0.875rem' 
          }}
        />
        <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Chargement de vos flashcards...
          </div>
        ) : filteredCards.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
            Aucune flashcard ne correspond à "{searchQuery}".
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
              {visibleCards.map((source, idx) => (
                <div key={idx} className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem', borderRadius: 'var(--radius-lg)' }}>
                  
                  {/* Breadcrumb Info */}
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {source.folderPath.map((folder, fidx) => (
                      <React.Fragment key={fidx}>
                        <span style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-sm)' }}>{folder}</span>
                        <span style={{ opacity: 0.4 }}>/</span>
                      </React.Fragment>
                    ))}
                    <span style={{ color: 'var(--accent-primary)', backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent-glow)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)', fontWeight: 500 }}>{source.courseName}</span>
                  </div>

                  {/* Card Front */}
                  <div style={{ marginBottom: '0.875rem', paddingBottom: '0.875rem', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>Question</span>
                    {source.card.image && (source.card.imageSide === 'front' || source.card.imageSide === 'both' || !source.card.imageSide) && (
                      <div style={{ marginBottom: '0.625rem', display: 'flex', justifyContent: 'center' }}>
                        <OccludedImageViewer
                          imageUrl={source.card.image}
                          occlusions={source.card.occlusions}
                          isRevealed={false}
                          maxHeight="150px"
                          alt="Question"
                        />
                      </div>
                    )}
                    <p style={{ fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.5, fontSize: '0.9375rem' }}>{source.card.front}</p>
                  </div>

                  {/* Card Back */}
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--success)', marginBottom: '0.35rem', display: 'block' }}>Réponse</span>
                    {source.card.image && (source.card.imageSide === 'back' || source.card.imageSide === 'both') && (
                      <div style={{ marginBottom: '0.625rem', display: 'flex', justifyContent: 'center' }}>
                        <OccludedImageViewer
                          imageUrl={source.card.image}
                          occlusions={source.card.occlusions}
                          isRevealed={true}
                          maxHeight="150px"
                          alt="Réponse"
                        />
                      </div>
                    )}
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5, fontSize: '0.875rem' }}>{source.card.back}</p>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setDisplayCount(prev => prev + PAGE_SIZE)}
                  className="btn btn-outline"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1.5rem',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-full)'
                  }}
                >
                  <ChevronDown size={16} /> Afficher 40 flashcards de plus ({filteredCards.length - visibleCards.length} restantes)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Global Spaced Repetition Revision Modal */}
      {isRevisionModalOpen && (
        <FolderRevisionModal
          isOpen={isRevisionModalOpen}
          onClose={() => {
            setIsRevisionModalOpen(false);
            loadAllCards(); // reload cards when revision finishes
          }}
          folderId={null}
          folderName="Toute la bibliothèque"
          allNodes={nodes}
        />
      )}
    </div>
  );
}
