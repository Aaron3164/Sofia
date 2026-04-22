import React, { useState, useEffect } from 'react';
import { useFileSystem, type FileNode } from '../hooks/useFileSystem';
import { Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface Flashcard {
  front: string;
  back: string;
}

interface FlashcardSource {
  courseId: string;
  courseName: string;
  folderPath: string[];
  card: Flashcard;
}

export default function FlashcardsExplorer() {
  const { nodes, getNode } = useFileSystem();
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [allCards, setAllCards] = useState<FlashcardSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

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
    setIsSyncing(true);
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
    setIsSyncing(false);
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

  const filteredCards = allCards.filter(source => {
    const query = searchQuery.toLowerCase();
    return (
      source.card.front.toLowerCase().includes(query) ||
      source.card.back.toLowerCase().includes(query) ||
      source.courseName.toLowerCase().includes(query) ||
      source.folderPath.some(folder => folder.toLowerCase().includes(query))
    );
  });

  return (
    <div className="page-container" style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            ⚡ Flashcards Globales
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Parcours et recherche parmi tes {allCards.length} flashcards disponibles.
          </p>
        </div>
        <button 
          onClick={() => loadAllCards()} 
          disabled={isSyncing}
          className="btn btn-outline"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {isSyncing ? <div className="animate-spin" style={{ width: '16px', height: '16px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }}></div> : <div style={{ transform: 'rotate(0deg)' }}>🔄</div>}
          {isSyncing ? 'Synchronisation...' : 'Actualiser'}
        </button>
      </header>

      <div style={{ marginBottom: '2rem', position: 'relative', maxWidth: '800px' }}>
        <input 
          type="text"
          placeholder="Rechercher un mot-clé, concept ou dossier..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="input-field shadow-sm"
          style={{ 
            width: '100%', 
            padding: '1.25rem 1.25rem 1.25rem 3.5rem', 
            borderRadius: '1rem', 
            border: '1px solid var(--border-color)', 
            backgroundColor: 'var(--bg-elevated)', 
            color: 'var(--text-primary)', 
            fontSize: '1rem' 
          }}
        />
        <Search size={24} color="var(--text-secondary)" style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Chargement de vos flashcards...
          </div>
        ) : filteredCards.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-elevated)', borderRadius: '1.5rem', border: '1px solid var(--border-color)' }}>
            Aucune flashcard ne correspond à "{searchQuery}".
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
            {filteredCards.map((source, idx) => (
              <div key={idx} className="glass-panel hover-lift" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-elevated)' }}>
                
                {/* Breadcrumb Info */}
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {source.folderPath.map((folder, fidx) => (
                    <React.Fragment key={fidx}>
                      <span style={{ backgroundColor: 'var(--bg-primary)', padding: '0.2rem 0.5rem', borderRadius: '0.25rem' }}>📁 {folder}</span>
                      <span style={{ opacity: 0.5 }}>/</span>
                    </React.Fragment>
                  ))}
                  <span style={{ color: 'white', backgroundColor: 'var(--accent-primary)', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontWeight: 500 }}>📄 {source.courseName}</span>
                </div>

                {/* Card Front */}
                <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px dashed var(--border-color)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Question</span>
                  <p style={{ fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.5, fontSize: '1.05rem' }}>{source.card.front}</p>
                </div>

                {/* Card Back */}
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--success)', marginBottom: '0.5rem', display: 'block' }}>Réponse</span>
                  <p style={{ color: 'var(--text-primary)', lineHeight: 1.5, fontSize: '0.95rem' }}>{source.card.back}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
