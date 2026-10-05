import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, X, FileText, Folder, Sparkles, ArrowRight, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { globalSearch } from '../../lib/gemini';
import { useFileSystem, type FileNode } from '../../hooks/useFileSystem';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

interface MatchedCourse {
  courseId: string;
  courseName: string;
  folderPath: string[];
  matchCount: number;
  score: number;
  matchedInTitle: boolean;
  matchedInResume: boolean;
  matchedInFlashcards: boolean;
  snippets: string[];
  fullSnippetsForAI: string;
}

export const GlobalSearchModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'direct' | 'ai'>('direct');
  
  // Search states
  const [isSearchingDirect, setIsSearchingDirect] = useState(false);
  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [directResults, setDirectResults] = useState<MatchedCourse[] | null>(null);
  const [aiResults, setAiResults] = useState<string | null>(null);
  const [searchedKeywords, setSearchedKeywords] = useState<string[]>([]);
  
  const { nodes } = useFileSystem();
  const { profile } = useAuth();
  const navigate = useNavigate();
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
      setDirectResults(null);
      setAiResults(null);
      setActiveTab('direct');
    }
  }, [isOpen]);

  // Compute folder path for a node
  const getFolderPath = (nodeId: string | null): string[] => {
    const path: string[] = [];
    let current = nodes.find(n => n.id === nodeId);
    while (current) {
      path.unshift(current.name);
      current = nodes.find(n => n.id === current?.parentId);
    }
    return path;
  };

  // Helper to normalize strings (remove accents and lowercase)
  const normalizeStr = (str: string): string => {
    return (str || '')
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  // Create regex matching whole words only, respecting accents and french word boundaries
  const createWordRegex = (kw: string) => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?<![a-zA-Z0-9À-ÿ])${escaped}(?![a-zA-Z0-9À-ÿ])`, 'gi');
  };

  // Helper to extract clean snippets with context and multi-term density
  const extractCourseSnippets = (content: string, keywords: string[], contextWindow = 120): string[] => {
    if (!content || keywords.length === 0) return [];
    
    const contentNorm = normalizeStr(content);
    const candidateSnippets: { text: string; kwCount: number; idx: number }[] = [];
    const foundIndices: number[] = [];

    for (const kw of keywords) {
      const regex = createWordRegex(kw);
      let match: RegExpExecArray | null;
      while ((match = regex.exec(contentNorm)) !== null) {
        const idx = match.index;
        const isOverlapping = foundIndices.some(existing => Math.abs(existing - idx) < contextWindow);
        if (!isOverlapping) {
          foundIndices.push(idx);
          const start = Math.max(0, idx - contextWindow);
          const end = Math.min(content.length, idx + kw.length + contextWindow);
          
          let snippet = content.substring(start, end).replace(/\s+/g, ' ');
          if (start > 0) snippet = '...' + snippet;
          if (end < content.length) snippet = snippet + '...';
          
          const snipNorm = normalizeStr(snippet);
          let kwInSnippet = 0;
          for (const k of keywords) {
            if (createWordRegex(k).test(snipNorm)) kwInSnippet++;
          }
          
          candidateSnippets.push({ text: snippet, kwCount: kwInSnippet, idx });
        }
        if (candidateSnippets.length >= 8) break;
      }
    }

    // Sort snippets so snippets with the highest number of co-occurring query keywords appear first
    candidateSnippets.sort((a, b) => b.kwCount - a.kwCount);
    return candidateSnippets.slice(0, 3).map(s => s.text);
  };

  // Zero-token Instant Direct Search
  const performDirectSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setIsSearchingDirect(true);
    setDirectResults(null);
    setAiResults(null);
    setActiveTab('direct');

    const cleanQuery = normalizeStr(searchQuery);
    const rawTokens = cleanQuery.split(/[\s,.'";:!?()\-+/]+/).filter(t => t.length > 0);
    
    const stopWords = new Set([
      'dans', 'quels', 'quel', 'quelle', 'quelles', 'cours', 'on', 'parle', 'de', 'la', 'le', 'les', 'des', 
      'du', 'en', 'est', 'un', 'une', 'et', 'ou', 'je', 'tu', 'il', 'nous', 
      'vous', 'ils', 'elle', 'elles', 'a', 'au', 'aux', 'par', 'pour', 'sur', 'avec',
      'qui', 'que', 'quoi', 'dont', 'où', 'recherche', 'trouve', 'expliquer', 'moi', 'ce', 'ces', 'cet', 'cette'
    ]);
    
    // Keep words >= 2 chars, or single numbers
    const keywords = rawTokens.filter(t => !stopWords.has(t) && (t.length >= 2 || /^\d+$/.test(t)));
    const effectiveKeywords = keywords.length > 0 ? keywords : rawTokens;
    setSearchedKeywords(effectiveKeywords);

    // Number of distinct keywords required for a match:
    // If 1 keyword (ex: "lamotrigine") => 1
    // If 2 keywords (ex: "hernie hiatale") => 2 (AND logic!)
    // If 3 keywords (ex: "insuffisance renale aigue") => at least 2 or 3
    // If 4+ keywords (ex: "art 17 code penal") => at least 75% of keywords
    const minRequiredMatches = effectiveKeywords.length === 1 ? 1 :
      effectiveKeywords.length === 2 ? 2 :
      Math.max(2, Math.ceil(effectiveKeywords.length * 0.75));

    try {
      // 1. Fetch Cloud Course Data (or from local fallback)
      let cloudRows: any[] = [];
      try {
        const { data } = await supabase
          .from('course_data')
          .select('course_id, file_name, extracted_content, generations');
        if (data) cloudRows = data;
      } catch (e) {
        console.warn("Supabase fetch fallback:", e);
      }

      const courseNodes = nodes.filter((n: FileNode) => n.type === 'course');
      const matches: MatchedCourse[] = [];

      for (const node of courseNodes) {
        const cloudRow = cloudRows.find(r => r.course_id === node.id);
        let extractedContent = cloudRow?.extracted_content || '';
        let generations = cloudRow?.generations || null;

        // Supplement with local storage
        if (!extractedContent || !generations) {
          const localSaved = localStorage.getItem(`aura_subject_${node.id}`);
          if (localSaved) {
            try {
              const parsed = JSON.parse(localSaved);
              if (!extractedContent) extractedContent = parsed.extractedContent || '';
              if (!generations) generations = parsed.generations || null;
            } catch {}
          }
        }

        const courseName = node.name || cloudRow?.file_name || 'Cours sans titre';
        const folderPath = getFolderPath(node.parentId);

        const nameNorm = normalizeStr(courseName);
        const contentNorm = normalizeStr(extractedContent);
        const resumeNorm = normalizeStr(generations?.resume || '');
        const flashcardsNorm = normalizeStr(typeof generations?.flashcards === 'string' ? generations.flashcards : JSON.stringify(generations?.flashcards || ''));

        const fullCourseText = `${nameNorm} ${resumeNorm} ${flashcardsNorm} ${contentNorm}`;

        let score = 0;
        let matchCount = 0;
        let matchedKeywordsCount = 0;
        let matchedInTitle = false;
        let matchedInResume = false;
        let matchedInFlashcards = false;

        // Check exact whole phrase match first (huge bonus)
        if (effectiveKeywords.length > 1 && fullCourseText.includes(cleanQuery)) {
          score += 1200;
          matchCount += 5;
        }

        for (const kw of effectiveKeywords) {
          const wordRegex = createWordRegex(kw);
          let kwFoundInCourse = false;

          // Title match
          if (wordRegex.test(nameNorm)) {
            score += 400;
            matchCount += 2;
            matchedInTitle = true;
            kwFoundInCourse = true;
          }

          // Resume match
          if (wordRegex.test(resumeNorm)) {
            score += 200;
            matchCount += 2;
            matchedInResume = true;
            kwFoundInCourse = true;
          }

          // Flashcards match
          if (wordRegex.test(flashcardsNorm)) {
            score += 150;
            matchCount += 1;
            matchedInFlashcards = true;
            kwFoundInCourse = true;
          }

          // Content match (whole word occurrences)
          if (contentNorm) {
            const occurrences = contentNorm.match(wordRegex);
            if (occurrences && occurrences.length > 0) {
              matchCount += occurrences.length;
              score += occurrences.length * 15;
              kwFoundInCourse = true;
            }
          }

          if (kwFoundInCourse) {
            matchedKeywordsCount++;
          }
        }

        // STRICT FILTER: A course must contain at least the required number of distinct keywords!
        // This completely prevents unrelated courses matching on a single isolated token like 'art'
        if (matchedKeywordsCount >= minRequiredMatches) {
          const snippets = extractCourseSnippets(extractedContent || generations?.resume || '', effectiveKeywords);
          const fullSnippetsForAI = snippets.join('\n');

          matches.push({
            courseId: node.id,
            courseName,
            folderPath,
            matchCount,
            score: score + (matchedKeywordsCount === effectiveKeywords.length ? 500 : 0),
            matchedInTitle,
            matchedInResume,
            matchedInFlashcards,
            snippets,
            fullSnippetsForAI
          });
        }
      }

      // Sort by score descending
      matches.sort((a, b) => b.score - a.score);
      setDirectResults(matches);
    } catch (err) {
      console.error("Direct search error:", err);
      setDirectResults([]);
    } finally {
      setIsSearchingDirect(false);
    }
  };

  // Optional AI Synthesis (only triggered on user demand!)
  const handleTriggerAISynthesis = async () => {
    if (!directResults || directResults.length === 0) return;

    setActiveTab('ai');
    setIsSearchingAI(true);
    setAiResults(null);

    try {
      const contextBudget = 250000;
      let currentLength = 0;
      let fullContext = '';

      for (const item of directResults) {
        if (currentLength >= contextBudget) break;
        const block = `\n\n--- COURS: ${item.courseName} ---\n[Extraits pertinents du cours]\n${item.fullSnippetsForAI || item.snippets.join('\n')}`;
        fullContext += block;
        currentLength += block.length;
      }

      const result = await globalSearch(query, fullContext, profile?.preferences);
      setAiResults(result);
    } catch (error: any) {
      console.error("AI Search Error:", error);
      if (error?.message?.includes('Quota')) {
        setAiResults("Limite de l'IA atteinte pour aujourd'hui. Réessayez plus tard.");
      } else {
        setAiResults("Une erreur est survenue lors de l'analyse avec Sofia. Vérifiez votre connexion.");
      }
    } finally {
      setIsSearchingAI(false);
    }
  };

  const handleOpenCourse = (courseId: string) => {
    setIsOpen(false);
    navigate(`/subject/${courseId}`);
  };

  const highlightText = (text: string, keywords: string[]) => {
    if (!keywords || keywords.length === 0 || !text) return text;
    
    // Match only complete words, respecting boundaries
    const escapedKws = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const regex = new RegExp(`(?<![a-zA-Z0-9À-ÿ])(${escapedKws})(?![a-zA-Z0-9À-ÿ])`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) => {
      const partNorm = normalizeStr(part);
      const isMatch = keywords.some(k => k === partNorm);
      if (isMatch) {
        return (
          <mark 
            key={i} 
            style={{ 
              backgroundColor: 'rgba(219, 39, 119, 0.2)', 
              color: 'var(--accent-primary, #db2777)', 
              padding: '0.1rem 0.3rem', 
              borderRadius: '3px',
              fontWeight: 700
            }}
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(6px)',
        display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '8vh', padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={() => setIsOpen(false)}
    >
      <div 
        className="glass-panel"
        style={{
          width: '100%', maxWidth: '820px', backgroundColor: 'var(--bg-primary, #0f172a)',
          borderRadius: '1.25rem', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          maxHeight: '84vh', boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.6)',
          border: '1px solid var(--border-color)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <form 
          onSubmit={(e) => { e.preventDefault(); performDirectSearch(query); }} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '1.1rem 1.5rem', 
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-elevated)'
          }}
        >
          <Search size={22} style={{ color: 'var(--accent-primary)', marginRight: '1rem', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher un concept, terme ou pathologie dans tous vos cours..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1, border: 'none', outline: 'none', backgroundColor: 'transparent',
              fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 500
            }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
            >
              Rechercher
            </button>
            <button 
              type="button" 
              onClick={() => setIsOpen(false)} 
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.3rem' }}
            >
              <X size={20} />
            </button>
          </div>
        </form>

        {/* Navigation Tabs (Direct Results vs AI Synthesis) */}
        {directResults !== null && (
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.6rem 1.5rem',
              borderBottom: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-primary)',
              fontSize: '0.85rem'
            }}
          >
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setActiveTab('direct')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.35rem 0.8rem', borderRadius: '0.5rem',
                  border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                  backgroundColor: activeTab === 'direct' ? 'var(--accent-primary)' : 'transparent',
                  color: activeTab === 'direct' ? 'white' : 'var(--text-secondary)'
                }}
              >
                <BookOpen size={15} />
                <span>Cours correspondants ({directResults.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('ai');
                  if (!aiResults && !isSearchingAI) {
                    handleTriggerAISynthesis();
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.35rem 0.8rem', borderRadius: '0.5rem',
                  border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                  backgroundColor: activeTab === 'ai' ? 'var(--accent-primary)' : 'transparent',
                  color: activeTab === 'ai' ? 'white' : 'var(--text-secondary)'
                }}
              >
                <Sparkles size={15} />
                <span>Synthèse Sofia (IA)</span>
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', backgroundColor: 'var(--bg-secondary)' }}>
          {isSearchingDirect ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', gap: '1rem', color: 'var(--text-secondary)' }}>
              <Loader2 size={32} className="spin" color="var(--accent-primary)" />
              <p style={{ margin: 0, fontSize: '0.95rem' }}>Recherche instantanée dans vos cours...</p>
            </div>
          ) : directResults !== null && activeTab === 'direct' ? (
            <div>
              {/* AI Banner Shortcut */}
              {directResults.length > 0 && !aiResults && (
                <div 
                  style={{
                    backgroundColor: 'rgba(219, 39, 119, 0.08)',
                    border: '1px solid rgba(219, 39, 119, 0.25)',
                    borderRadius: '0.75rem',
                    padding: '0.85rem 1.25rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Sparkles size={18} color="var(--accent-primary)" />
                    <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      Besoin d'un résumé global ? Sofia peut croiser et synthétiser ces <strong>{directResults.length} cours</strong>.
                    </span>
                  </div>

                  <button
                    onClick={handleTriggerAISynthesis}
                    className="btn btn-primary"
                    style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Sparkles size={13} /> Synthétiser avec Sofia
                  </button>
                </div>
              )}

              {directResults.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                  <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    Aucun résultat trouvé pour « {query} »
                  </p>
                  <p style={{ fontSize: '0.9rem', maxWidth: '450px', margin: '0 auto' }}>
                    Vérifiez l'orthographe ou essayez un mot-clé plus générique (ex: "nerf", "cardiaque", "symptômes").
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {directResults.map((item) => (
                    <div
                      key={item.courseId}
                      className="glass-panel hover-lift"
                      onClick={() => handleOpenCourse(item.courseId)}
                      style={{
                        padding: '1.25rem',
                        borderRadius: '1rem',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-elevated)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {/* Course Header & Badges */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.6rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                            <Folder size={13} />
                            <span>{item.folderPath.length > 0 ? item.folderPath.join(' / ') : 'Dossier principal'}</span>
                          </div>
                          <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={18} color="var(--accent-primary)" />
                            <span>{highlightText(item.courseName, searchedKeywords)}</span>
                          </h4>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                          {item.matchedInTitle && (
                            <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: 'rgba(219, 39, 119, 0.15)', color: 'var(--accent-primary)', fontWeight: 600 }}>
                              Titre
                            </span>
                          )}
                          {item.matchedInResume && (
                            <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 600 }}>
                              Résumé
                            </span>
                          )}
                          {item.matchedInFlashcards && (
                            <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', fontWeight: 600 }}>
                              Flashcards
                            </span>
                          )}
                          <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                            {item.matchCount} mention{item.matchCount > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Snippets / Excerpts */}
                      {item.snippets.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.75rem' }}>
                          {item.snippets.map((snip, sidx) => (
                            <div 
                              key={sidx}
                              style={{
                                fontSize: '0.86rem',
                                color: 'var(--text-secondary)',
                                lineHeight: 1.5,
                                backgroundColor: 'var(--bg-primary)',
                                padding: '0.5rem 0.75rem',
                                borderRadius: '0.5rem',
                                borderLeft: '3px solid var(--accent-primary)'
                              }}
                            >
                              {highlightText(snip, searchedKeywords)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          Correspondance trouvée dans les métadonnées de ce cours.
                        </p>
                      )}

                      {/* Footer Call to Action */}
                      <div style={{ marginTop: '0.85rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                        <span>Accéder à ce cours</span>
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'ai' ? (
            /* AI Synthesis View */
            <div>
              {isSearchingAI ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3.5rem 1rem', gap: '1rem', color: 'var(--text-secondary)' }}>
                  <Loader2 size={36} className="spin" color="var(--accent-primary)" />
                  <p style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                    Sofia analyse tous vos cours, cela peut prendre quelques secondes...
                  </p>
                </div>
              ) : aiResults ? (
                <div className="flashcard-content" style={{ color: 'var(--text-primary)', lineHeight: 1.7, fontSize: '0.96rem' }}>
                  {renderMarkdown(aiResults)}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Demandez à Sofia de croiser et de rédiger une synthèse complète de vos cours sur ce sujet.
                  </p>
                  <button onClick={handleTriggerAISynthesis} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={16} /> Lancer la synthèse avec Sofia
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Initial state */
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
              <p style={{ fontSize: '1.05rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Recherche globale ultrarapide dans tous vos cours
              </p>
              <p style={{ fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto' }}>
                Tapez un mot-clé pour voir instantanément les cours et extraits correspondants.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Markdown & Rich Text formatter for Sofia AI synthesis
const formatRichText = (text: string) => {
  let parts = text.split(/(\*\*.*?\*\*)/g);
  let elements = parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={`b-${i}`}>{p.slice(2, -2)}</strong>;
    return p;
  });

  const finalElements: (string | React.ReactNode)[] = [];
  elements.forEach((el, idx) => {
    if (typeof el === 'string') {
      const subParts = el.split(/(==.*?==)/g);
      subParts.forEach((sp, si) => {
        if (sp.startsWith('==') && sp.endsWith('==')) {
          finalElements.push(
            <mark 
              key={`m-${idx}-${si}`} 
              className="ai-highlight"
              style={{ 
                backgroundColor: '#6366f125', 
                color: '#4f46e5', 
                border: '1px solid rgba(99, 102, 241, 0.25)',
                padding: '0.1rem 0.38rem', 
                borderRadius: '0.35rem',
                fontWeight: 600
              }}
            >
              {sp.slice(2, -2)}
            </mark>
          );
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
    if (line.startsWith('### ')) return <h3 key={i} style={{ marginTop: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{line.replace('### ', '')}</h3>;
    if (line.startsWith('## ')) return <h2 key={i} style={{ marginTop: '1.5rem', marginBottom: '0.5rem', color: 'var(--accent-primary)' }}>{line.replace('## ', '')}</h2>;
    if (line.startsWith('# ')) return <h1 key={i} style={{ marginTop: '1.5rem', marginBottom: '0.75rem', color: 'var(--accent-primary)' }}>{line.replace('# ', '')}</h1>;
    if (line.startsWith('- ')) return <li key={i} style={{ marginLeft: '1.5rem', marginBottom: '0.35rem' }}>{formatRichText(line.replace('- ', ''))}</li>;
    if (line.startsWith('* ')) return <li key={i} style={{ marginLeft: '1.5rem', marginBottom: '0.35rem' }}>{formatRichText(line.replace('* ', ''))}</li>;
    if (line.trim() === '') return <div key={i} style={{ height: '0.5rem' }} />;
    return <p key={i} style={{ marginBottom: '0.65rem' }}>{formatRichText(line)}</p>;
  });
};
