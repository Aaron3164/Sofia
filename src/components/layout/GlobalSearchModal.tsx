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

// Helper to extract snippets of text around matched keywords
function extractSnippets(content: string, keywords: string[], contextWindow: number = 300): string {
  if (!content) return '';
  
  const contentLower = content.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const snippets: string[] = [];
  
  // Find matches for each keyword
  for (const keyword of keywords) {
    let index = 0;
    while ((index = contentLower.indexOf(keyword, index)) !== -1) {
      const start = Math.max(0, index - contextWindow);
      const end = Math.min(content.length, index + keyword.length + contextWindow);
      
      let snippet = content.substring(start, end);
      
      // Try to align to sentence boundaries
      if (start > 0) {
        const firstPeriod = snippet.indexOf('.');
        if (firstPeriod !== -1 && firstPeriod < contextWindow) {
          snippet = snippet.substring(firstPeriod + 1);
        }
      }
      if (end < content.length) {
        const lastPeriod = snippet.lastIndexOf('.');
        if (lastPeriod !== -1 && lastPeriod > contextWindow) {
          snippet = snippet.substring(0, lastPeriod + 1);
        }
      }
      
      const trimmedSnippet = snippet.trim();
      if (trimmedSnippet && !snippets.includes(trimmedSnippet)) {
        snippets.push(trimmedSnippet);
      }
      
      // Move index forward to avoid overlapping snippets
      index += keyword.length + contextWindow * 2; 
      
      if (snippets.length >= 10) break;
    }
    if (snippets.length >= 15) break;
  }
  
  if (snippets.length === 0) {
    // Fallback: if no keyword matches but it was returned, provide first few paragraphs
    return content.substring(0, 4000) + "\n... [Contenu tronqué] ...";
  }
  
  return snippets.join('\n\n[...] \n\n');
}

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setResults(null);

    // Extract keywords for search matching
    const cleanQuery = query
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    
    const tokens = cleanQuery.split(/[\s,.'";:!?()\-+/]+/);
    
    const stopWords = new Set([
      'dans', 'quels', 'cours', 'on', 'parle', 'de', 'la', 'le', 'les', 'des', 
      'du', 'en', 'est', 'un', 'une', 'et', 'ou', 'je', 'tu', 'il', 'nous', 
      'vous', 'ils', 'elle', 'elles', 'a', 'par', 'pour', 'sur', 'dans', 'avec',
      'qui', 'que', 'quoi', 'dont', 'ou', 'où', 'recherche', 'trouve', 'expliquer'
    ]);
    
    const keywords = tokens.filter(t => t.length > 2 && !stopWords.has(t));

    try {
      // 1. Fetch Cloud Matching Data
      let cloudMatchingRows: any[] = [];
      
      if (keywords.length > 0) {
        // First try textSearch
        const { data: ftsData, error: ftsError } = await supabase
          .from('course_data')
          .select('course_id, file_name, extracted_content')
          .textSearch('extracted_content', keywords.join(' '), { config: 'french', type: 'plain' });
          
        if (!ftsError && ftsData && ftsData.length > 0) {
          cloudMatchingRows = ftsData;
        } else {
          // Fallback: search using OR ILIKE
          const orFilter = keywords.map(t => `extracted_content.ilike.%${t}%`).join(',');
          const { data: ilikeData } = await supabase
            .from('course_data')
            .select('course_id, file_name, extracted_content')
            .or(orFilter);
          if (ilikeData) cloudMatchingRows = ilikeData;
        }
      } else {
        // Fallback for extremely short queries: retrieve first 5 items
        const { data: topData } = await supabase
          .from('course_data')
          .select('course_id, file_name, extracted_content')
          .limit(5);
        if (topData) cloudMatchingRows = topData;
      }

      // 2. Gather and extract snippets from all sources
      const allMatchingSources: { name: string; snippets: string; score: number }[] = [];

      // Process Cloud matches
      for (const row of cloudMatchingRows) {
        const content = row.extracted_content || '';
        const snippetsText = extractSnippets(content, keywords);
        
        if (snippetsText) {
          // Calculate score based on matches
          let score = 0;
          const fileNameLower = (row.file_name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          for (const kw of keywords) {
            if (fileNameLower.includes(kw)) score += 150; // high weight for matches in title
            const regex = new RegExp(kw, 'gi');
            const matches = snippetsText.match(regex);
            if (matches) score += matches.length;
          }
          
          allMatchingSources.push({
            name: row.file_name || 'Sans titre',
            snippets: snippetsText,
            score
          });
        }
      }

      // Supplement with local matches
      const localCourseIds = nodes.filter((n: FileNode) => n.type === 'course').map(n => n.id);
      for (const courseId of localCourseIds) {
        if (cloudMatchingRows.some((c: any) => c.course_id === courseId)) continue;

        const saved = localStorage.getItem(`aura_subject_${courseId}`);
        if (saved) {
           try {
             const parsed = JSON.parse(saved);
             const content = parsed.extractedContent || '';
             if (content) {
                // Check if it matches at least one keyword
                const contentLower = content.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const hasMatch = keywords.length === 0 || keywords.some(kw => contentLower.includes(kw));
                
                if (hasMatch) {
                  const snippetsText = extractSnippets(content, keywords);
                  const courseName = nodes.find(n => n.id === courseId)?.name || 'Anonyme';
                  
                  let score = 0;
                  const nameLower = courseName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                  for (const kw of keywords) {
                    if (nameLower.includes(kw)) score += 150;
                    const regex = new RegExp(kw, 'gi');
                    const matches = snippetsText.match(regex);
                    if (matches) score += matches.length;
                  }

                  allMatchingSources.push({
                    name: courseName,
                    snippets: snippetsText,
                    score
                  });
                }
             }
           } catch (e) {}
        }
      }

      if (allMatchingSources.length === 0) {
        setResults("Aucun cours ne semble correspondre à votre recherche. Essayez d'utiliser d'autres mots-clés (par exemple : 'cordes vocales').");
        setIsSearching(false);
        return;
      }

      // 3. Sort by relevance score
      allMatchingSources.sort((a, b) => b.score - a.score);

      // 4. Build prompt context using snippets (max 300k chars)
      const contextBudget = 300000;
      let currentLength = 0;
      let fullContext = '';

      for (const source of allMatchingSources) {
        if (currentLength >= contextBudget) break;
        const snippetBlock = `\n\n--- COURS: ${source.name} ---\n... [Extraits pertinents] ...\n${source.snippets}`;
        fullContext += snippetBlock;
        currentLength += snippetBlock.length;
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
            className="global-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1, border: 'none', outline: 'none', backgroundColor: 'transparent',
              fontSize: '1.2rem'
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
