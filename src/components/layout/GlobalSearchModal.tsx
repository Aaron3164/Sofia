import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { globalSearch } from '../../lib/gemini';
import { useFileSystem, type FileNode } from '../../hooks/useFileSystem';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export const GlobalSearchModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<string | null>(null);
  const { nodes } = useFileSystem();
  const { profile } = useAuth();
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      // Esc to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    const handleCustomOpen = () => setIsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-global-search', handleCustomOpen);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-global-search', handleCustomOpen);
    };
  }, [isOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults(null);
    }
  }, [isOpen]);

// Helper function to rank courses by keyword match
function rankCourses(courses: { name: string; content: string }[], query: string): { name: string; content: string }[] {
  const cleanQuery = query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // remove accents
  
  const tokens = cleanQuery.split(/[\s,.'";:!?()\-+/]+/);
  
  const stopWords = new Set([
    'dans', 'quels', 'cours', 'on', 'parle', 'de', 'la', 'le', 'les', 'des', 
    'du', 'en', 'est', 'un', 'une', 'et', 'ou', 'je', 'tu', 'il', 'nous', 
    'vous', 'ils', 'elle', 'elles', 'a', 'par', 'pour', 'sur', 'dans', 'avec',
    'qui', 'que', 'quoi', 'dont', 'ou', 'où'
  ]);
  
  const keywords = tokens.filter(t => t.length > 1 && !stopWords.has(t));
  
  if (keywords.length === 0) {
    return courses;
  }

  return courses.map(course => {
    let score = 0;
    const fileNameLower = (course.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const contentLower = (course.content || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    for (const keyword of keywords) {
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedKeyword, 'gi');
      
      const nameMatches = fileNameLower.match(regex);
      if (nameMatches) {
        score += nameMatches.length * 100; // high weight for filename matches
      }
      
      const contentMatches = contentLower.match(regex);
      if (contentMatches) {
        score += contentMatches.length;
      }
    }

    return { ...course, searchScore: score };
  }).sort((a, b) => (b.searchScore || 0) - (a.searchScore || 0));
}

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setResults(null);

    try {
      // 1. Fetch Cloud Progress - Get extracted content from Supabase
      const { data: cloudData, error: cloudError } = await supabase
        .from('course_data')
        .select('course_id, file_name, extracted_content')
        .not('extracted_content', 'is', null);

      if (cloudError) console.warn("Erreur chargement Cloud Search:", cloudError);

      // 2. Gather all sources
      const allSources: { name: string; content: string }[] = [];

      if (cloudData) {
        for (const row of cloudData) {
          allSources.push({
            name: row.file_name || 'Sans titre',
            content: row.extracted_content || ''
          });
        }
      }

      // Supplement with Local Data for nodes not yet in cloud or for faster access
      const localCourseIds = nodes.filter((n: FileNode) => n.type === 'course').map(n => n.id);
      for (const courseId of localCourseIds) {
        if (cloudData?.some((c: any) => c.course_id === courseId)) continue;

        const saved = localStorage.getItem(`aura_subject_${courseId}`);
        if (saved) {
           try {
             const parsed = JSON.parse(saved);
             if (parsed.extractedContent) {
                const courseName = nodes.find(n => n.id === courseId)?.name || 'Anonyme';
                allSources.push({
                  name: courseName,
                  content: parsed.extractedContent
                });
             }
           } catch (e) {}
        }
      }

      if (allSources.length === 0) {
        setResults("Il semble que vous n'ayez aucun contenu de cours enregistré. Importez d'abord des fichiers dans votre bibliothèque.");
        setIsSearching(false);
        return;
      }

      // 3. Rank by relevance
      const rankedSources = rankCourses(allSources, query);

      // 4. Build context under budget (800k characters)
      const contextBudget = 800000;
      let currentLength = 0;
      let fullContext = '';

      for (const source of rankedSources) {
        if (currentLength >= contextBudget) break;

        // Truncate individual courses that are abnormally long (to 250k chars)
        // so they don't consume the entire budget.
        const contentSnippet = source.content.length > 250000
          ? source.content.substring(0, 250000) + "\n[Contenu tronqué pour cause de longueur...]"
          : source.content;

        const snippet = `\n\n--- COURS: ${source.name} ---\n${contentSnippet}`;
        fullContext += snippet;
        currentLength += snippet.length;
      }

      const gResult = await globalSearch(query, fullContext, profile?.preferences);
      setResults(gResult);
    } catch (error: any) {
      console.error("Global Search Error:", error);
      if (error?.message?.includes('Quota')) {
         setResults("Limite de l'IA atteinte pour aujourd'hui. Réessayez demain ou passez au pack Premium.");
      } else {
         setResults("Une erreur est survenue lors de la recherche globale. Veuillez vérifier votre connexion ou votre clé API.");
      }
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '10vh', padding: '1rem'
      }}
      onClick={() => setIsOpen(false)}
    >
      <div 
        className="glass-panel fade-in"
        style={{
          width: '100%', maxWidth: '700px', backgroundColor: 'var(--bg-primary)',
          borderRadius: '1rem', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          maxHeight: '80vh', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
        onClick={e => e.stopPropagation()} // Prevent close on modal click
      >
        <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <Search size={24} style={{ color: '#94a3b8', marginRight: '1rem' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Que cherchez-vous dans vos cours ?..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1, border: 'none', outline: 'none', backgroundColor: 'transparent',
              fontSize: '1.2rem', color: 'var(--text-primary)'
            }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '0.2rem 0.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '0.25rem', border: '1px solid var(--border-color)' }}>
              Cmd K
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '0.2rem 0.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '0.25rem', border: '1px solid var(--border-color)' }}>
              Entrée pour chercher
            </span>
          </div>
          <button type="button" onClick={() => setIsOpen(false)} style={{ marginLeft: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={24} />
          </button>
        </form>

        {(isSearching || results) && (
          <div style={{ padding: '2rem', overflowY: 'auto', backgroundColor: 'var(--bg-secondary)' }}>
            {isSearching ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: 'var(--text-secondary)' }}>
                <Loader2 size={32} className="spin" color="var(--accent-primary)" />
                <p>Gemini analyse tous vos cours, cela peut prendre quelques secondes...</p>
              </div>
            ) : (
              <div className="flashcard-content" style={{ color: 'var(--text-primary)', lineHeight: 1.6 }}>
                {results ? renderMarkdown(results) : null}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Simple Markdown parser
const formatRichText = (text: string) => {
  // First handle bold **
  let parts = text.split(/(\*\*.*?\*\*)/g);
  let elements = parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={`b-${i}`}>{p.slice(2, -2)}</strong>;
    return p;
  });

  // Then handle highlighting ==
  // We need to process the text nodes within elements
  const finalElements: (string | React.ReactNode)[] = [];
  elements.forEach((el, idx) => {
    if (typeof el === 'string') {
      const subParts = el.split(/(==.*?==)/g);
      subParts.forEach((sp, si) => {
        if (sp.startsWith('==') && sp.endsWith('==')) {
          finalElements.push(<mark key={`m-${idx}-${si}`} style={{ backgroundColor: '#fef08a', color: '#1e293b', padding: '0 0.2rem', borderRadius: '0.2rem' }}>{sp.slice(2, -2)}</mark>);
        } else {
          finalElements.push(sp);
        }
      });
    } else {
      finalElements.push(el);
    }
  });

  return finalElements;
};

const renderMarkdown = (text: string) => {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('### ')) return <h3 key={i} style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>{line.replace('### ', '')}</h3>;
    if (line.startsWith('## ')) return <h2 key={i} style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>{line.replace('## ', '')}</h2>;
    if (line.startsWith('# ')) return <h1 key={i} style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>{line.replace('# ', '')}</h1>;
    if (line.startsWith('- ')) return <li key={i} style={{ marginLeft: '1.5rem', marginBottom: '0.25rem' }}>{formatRichText(line.replace('- ', ''))}</li>;
    if (line.startsWith('* ')) return <li key={i} style={{ marginLeft: '1.5rem', marginBottom: '0.25rem' }}>{formatRichText(line.replace('* ', ''))}</li>;
    if (line.trim() === '') return <div key={i} style={{ height: '0.5rem' }} />;
    return <p key={i} style={{ marginBottom: '0.5rem' }}>{formatRichText(line)}</p>;
  });
};
