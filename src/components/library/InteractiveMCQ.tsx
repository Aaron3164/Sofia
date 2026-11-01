import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { explainMCQErrors, getDailyUsage, evaluateOpenQuestionAnswer, type OpenQuestionEvaluation } from '../../lib/gemini';
import { BookOpen, Loader2, Sparkles, RotateCcw } from 'lucide-react';
import { AIProgressCard } from '../common/AIProgressCard';

export interface MCQ {
  type?: 'mcq' | 'open';
  question: string;
  options: string[];
  correctAnswers?: string[];
  correctAnswer?: string; // Fallback for older generations
  image?: string;
  images?: string[];
  explanation?: string;
  expectedAnswer?: string;
}

interface InteractiveMCQProps {
  data: string | MCQ[];
  courseId?: string;
  courseName?: string;
  documentContext?: string;
}

const cleanExplanation = (text: string): string => {
  if (!text) return '';
  let cleaned = text.trim();
  // Strip prefixes like "D'après le cours :", "Selon le cours :", etc.
  cleaned = cleaned.replace(/^(d'après|selon|d’après)\s+(le\s+cours|le\s+document|la\s+source|le\s+texte)\s*[:,\-–—]?\s*/i, '');
  // Strip quotes
  cleaned = cleaned.replace(/^[«"“']\s*/, '').replace(/\s*[»"”']$/, '');
  cleaned = cleaned.replace(/^(d'après|selon|d’après)\s+(le\s+cours|le\s+document|la\s+source|le\s+texte)\s*[:,\-–—]?\s*/i, '');
  cleaned = cleaned.replace(/^[«"“']\s*/, '').replace(/\s*[»"”']$/, '');
  return cleaned.trim();
};

export const InteractiveMCQ: React.FC<InteractiveMCQProps> = ({ 
  data, 
  courseId, 
  courseName,
  documentContext 
}) => {
  const { profile } = useAuth();
  
  // Persistence logic
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string[]>>(() => {
    if (courseId) {
      const saved = sessionStorage.getItem(`aura_mcq_answers_${courseId}`);
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const [writtenAnswers, setWrittenAnswers] = useState<Record<number, string>>(() => {
    if (courseId) {
      const saved = sessionStorage.getItem(`aura_mcq_written_${courseId}`);
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const [openEvaluations, setOpenEvaluations] = useState<Record<number, OpenQuestionEvaluation>>(() => {
    if (courseId) {
      const saved = sessionStorage.getItem(`aura_mcq_open_evals_${courseId}`);
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const [evaluatingIndices, setEvaluatingIndices] = useState<Record<number, boolean>>({});
  
  const [showResults, setShowResults] = useState(() => {
    if (courseId) {
      return sessionStorage.getItem(`aura_mcq_results_${courseId}`) === 'true';
    }
    return false;
  });

  // Detailed corrections state (quoted directly from source)
  const [detailedCorrections, setDetailedCorrections] = useState<Record<number, string>>(() => {
    if (courseId) {
      const saved = sessionStorage.getItem(`aura_mcq_corrections_${courseId}`);
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });
  const [isLoadingCorrections, setIsLoadingCorrections] = useState(false);
  const [showDetailedPanel, setShowDetailedPanel] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [dailyUsage, setDailyUsage] = useState<number>(0);

  const maxGenerations = profile?.plan === 'premium' ? 50 : 5;
  const isQuotaReached = dailyUsage >= maxGenerations;

  useEffect(() => {
    const refreshUsage = () => {
      getDailyUsage().then(count => setDailyUsage(count));
    };
    refreshUsage();
    window.addEventListener('ai-usage-updated', refreshUsage);
    return () => window.removeEventListener('ai-usage-updated', refreshUsage);
  }, []);

  // Track changes and save to session
  useEffect(() => {
    if (courseId) {
      sessionStorage.setItem(`aura_mcq_answers_${courseId}`, JSON.stringify(selectedAnswers));
      sessionStorage.setItem(`aura_mcq_written_${courseId}`, JSON.stringify(writtenAnswers));
      sessionStorage.setItem(`aura_mcq_open_evals_${courseId}`, JSON.stringify(openEvaluations));
      sessionStorage.setItem(`aura_mcq_results_${courseId}`, showResults.toString());
      sessionStorage.setItem(`aura_mcq_corrections_${courseId}`, JSON.stringify(detailedCorrections));
    }
  }, [selectedAnswers, writtenAnswers, openEvaluations, showResults, detailedCorrections, courseId]);

  // Ref to track actual data content and avoid wiping session storage on reference change
  const prevDataStrRef = useRef<string>('');

  // Reset state ONLY on genuine new generation/content change
  useEffect(() => {
    const currentDataStr = typeof data === 'string' ? data : JSON.stringify(data || []);
    if (!prevDataStrRef.current) {
      prevDataStrRef.current = currentDataStr;
      return;
    }
    if (prevDataStrRef.current !== currentDataStr) {
      prevDataStrRef.current = currentDataStr;
      setSelectedAnswers({});
      setWrittenAnswers({});
      setOpenEvaluations({});
      setShowResults(false);
      setDetailedCorrections({});
      setShowDetailedPanel(false);
      if (courseId) {
        sessionStorage.removeItem(`aura_mcq_answers_${courseId}`);
        sessionStorage.removeItem(`aura_mcq_written_${courseId}`);
        sessionStorage.removeItem(`aura_mcq_open_evals_${courseId}`);
        sessionStorage.removeItem(`aura_mcq_results_${courseId}`);
        sessionStorage.removeItem(`aura_mcq_corrections_${courseId}`);
      }
    }
  }, [data, courseId]);

  let scenarioText: string | null = null;
  let mcqs: MCQ[] = [];
  try {
    if (typeof data === 'string') {
      let jsonStr = data.trim();
      jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();

      const firstBrace = jsonStr.indexOf('{');
      const firstBracket = jsonStr.indexOf('[');

      if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        const lastBrace = jsonStr.lastIndexOf('}');
        if (lastBrace > firstBrace) {
          jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
        }
      } else if (firstBracket !== -1) {
        const lastBracket = jsonStr.lastIndexOf(']');
        if (lastBracket > firstBracket) {
          jsonStr = jsonStr.substring(firstBracket, lastBracket + 1);
        }
      }

      // Clean trailing commas before closing braces/brackets
      const cleanedJsonStr = jsonStr.replace(/,\s*([\]}])/g, '$1');

      let parsedObj;
      try {
        parsedObj = JSON.parse(cleanedJsonStr);
      } catch (e1) {
        parsedObj = JSON.parse(jsonStr);
      }

      if (Array.isArray(parsedObj)) {
        mcqs = parsedObj;
      } else if (parsedObj && typeof parsedObj === 'object') {
        scenarioText = parsedObj.scenario || parsedObj.context || parsedObj.statement || null;
        mcqs = parsedObj.questions || parsedObj.mcqs || (Array.isArray(parsedObj.data) ? parsedObj.data : []);
      }
    } else if (Array.isArray(data)) {
      mcqs = data;
    } else if (data && typeof data === 'object') {
      scenarioText = (data as any).scenario || (data as any).context || null;
      mcqs = (data as any).questions || (data as any).mcqs || [];
    }
  } catch (e) {
    console.error('Error parsing MCQ data:', e);
    return (
      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--danger)', backgroundColor: '#ef444410' }}>
        <h4 style={{ color: 'var(--danger)', margin: '0 0 0.5rem 0' }}>⚠️ Erreur de formatage du QCM</h4>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Les données générées précédemment avaient un problème de format. Cliquez sur le bouton <strong>Générer</strong> pour créer un nouveau QCM.
        </p>
      </div>
    );
  }

  if (mcqs.length === 0) return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Aucun QCM généré. Cliquez sur le bouton <strong>Générer</strong> ci-dessus.</div>;

  const handleSelect = (qIndex: number, option: string) => {
    if (showResults) return;
    
    setSelectedAnswers(prev => {
      const currentSelected = prev[qIndex] || [];
      const isSelected = currentSelected.includes(option);
      
      let newSelected;
      if (isSelected) {
        newSelected = currentSelected.filter(item => item !== option);
      } else {
        newSelected = [...currentSelected, option];
      }
      
      return { ...prev, [qIndex]: newSelected };
    });
  };

  const getCorrectAnswers = (q: any): string[] => {
    // Try all possible variants of keys Gemini might use
    const raw = q.correctAnswers ?? q.correct_answers ?? q.correctAnswer ?? q.correct_answer ?? q.responses ?? q.answers ?? [];
    if (Array.isArray(raw)) return raw.map(v => v?.toString() || '');
    if (raw === null || raw === undefined) return [];
    return [raw.toString()];
  };

  const normalize = (s: string) => 
    s.toString()
     .trim()
     .toLowerCase()
     .normalize("NFD")
     .replace(/[\u0300-\u036f]/g, "") // Enlever les accents
     .replace(/[^a-z0-9]/g, ''); // Garder uniquement l'essentiel (alphanumérique)

  const isCorrectOption = (correctOpts: string[], option: string, oIndex: number) => {
    const normalizedOption = normalize(option);
    const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    
    // Determine whether the numbers are 0-based (contains "0") or 1-based (all > 0)
    const isZeroBased = correctOpts.some(c => c?.toString().trim() === '0');

    return correctOpts.some(c => {
      if (c === null || c === undefined) return false;
      const cStr = c.toString().trim();
      const normalizedC = normalize(cStr);
      
      // 1. Match par texte direct (normalisé)
      if (normalizedC !== '' && normalizedC === normalizedOption) return true;
      
      // 2. Match par index numérique strict
      if (/^\d+$/.test(cStr)) {
        const val = parseInt(cStr, 10);
        if (isZeroBased) {
          if (val === oIndex) return true;
        } else {
          // If no 0 was present, it could be 0-based (e.g. index 2) or 1-based
          // But 0-based is the standard in JS / JSON arrays
          if (val === oIndex) return true;
        }
      }

      // 3. Match par lettre ("a", "b", "c"...)
      if (normalizedC.length === 1 && normalizedC === letters[oIndex]) return true;
      
      return false;
    });
  };

  const isOpenQuestion = (q: MCQ) => q.type === 'open' || !q.options || q.options.length === 0;

  const qcmIndices = mcqs.map((q, idx) => ({ q, idx })).filter(({ q }) => !isOpenQuestion(q)).map(({ idx }) => idx);
  const openIndices = mcqs.map((q, idx) => ({ q, idx })).filter(({ q }) => isOpenQuestion(q)).map(({ idx }) => idx);

  const qcmCount = qcmIndices.length;
  const openCount = openIndices.length;

  const isQuestionCorrect = (qIndex: number) => {
    const q = mcqs[qIndex];
    if (!q || isOpenQuestion(q)) return false;
    const selected = (selectedAnswers[qIndex] || []).map(normalize);
    const correctOpts = getCorrectAnswers(q);
    const correctOptionTexts = q.options.filter((opt, i) => isCorrectOption(correctOpts, opt, i)).map(normalize);

    return (
      selected.length === correctOptionTexts.length &&
      selected.every(ans => correctOptionTexts.includes(ans))
    );
  };

  const score = qcmIndices.reduce((acc, idx) => {
    return acc + (isQuestionCorrect(idx) ? 1 : 0);
  }, 0);

  const evaluatedOpenCount = openIndices.filter(idx => Boolean(openEvaluations[idx])).length;

  const wrongQuestions = mcqs
    .map((q, idx) => ({ q, idx }))
    .filter(({ q, idx }) => !isOpenQuestion(q) && !isQuestionCorrect(idx));

  const handleEvaluateOpenAnswer = async (qIndex: number) => {
    const q = mcqs[qIndex];
    if (!q) return;

    const answer = writtenAnswers[qIndex] || '';
    if (!answer.trim()) {
      alert("Veuillez rédiger une réponse avant de demander l'évaluation de Sofia.");
      return;
    }

    if (isQuotaReached) {
      alert(`Limite quotidienne de générations atteinte (${dailyUsage}/${maxGenerations} générations). ${profile?.plan === 'premium' ? 'Revenez demain !' : 'Passez au plan Premium pour 50 générations/jour !'}`);
      return;
    }

    setEvaluatingIndices(prev => ({ ...prev, [qIndex]: true }));
    try {
      const evalResult = await evaluateOpenQuestionAnswer(
        q.question,
        q.expectedAnswer || q.explanation || '',
        answer,
        profile?.preferences
      );
      setOpenEvaluations(prev => ({ ...prev, [qIndex]: evalResult }));
    } catch (err: any) {
      console.error('Erreur évaluation réponse ouverte:', err);
      alert(err.message || "Erreur lors de l'évaluation de la réponse avec Sofia.");
    } finally {
      setEvaluatingIndices(prev => ({ ...prev, [qIndex]: false }));
    }
  };

  const handleFetchDetailedCorrections = async () => {
    if (Object.keys(detailedCorrections).length > 0) {
      setShowDetailedPanel(prev => !prev);
      return;
    }

    if (wrongQuestions.length === 0) return;

    if (isQuotaReached) {
      alert(`Limite quotidienne de générations atteinte (${dailyUsage}/${maxGenerations} générations). ${profile?.plan === 'premium' ? 'Revenez demain !' : 'Passez au plan Premium pour 50 générations/jour !'}`);
      return;
    }

    let ctx = documentContext || '';
    if (!ctx && courseId) {
      try {
        const saved = localStorage.getItem(`aura_subject_${courseId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.extractedContent) ctx = parsed.extractedContent;
        }
      } catch {}
    }

    if (!ctx) {
      alert("Le document source de ce cours n'est pas disponible pour extraire les justifications textuelles.");
      return;
    }

    setIsLoadingCorrections(true);
    try {
      const errorItems = wrongQuestions.map(({ q, idx }) => {
        const correctOpts = getCorrectAnswers(q);
        const correctTexts = q.options.filter((opt, i) => isCorrectOption(correctOpts, opt, i));
        return {
          questionIndex: idx,
          question: q.question,
          options: q.options,
          userSelected: selectedAnswers[idx] || [],
          correctAnswers: correctTexts
        };
      });

      const corrections = await explainMCQErrors(ctx, errorItems, profile?.preferences);
      setDetailedCorrections(corrections);
      setShowDetailedPanel(true);
    } catch (err: any) {
      console.error('Failed to get detailed corrections:', err);
      alert(err.message || "Erreur lors de la récupération des corrections détaillées auprès de Sofia.");
    } finally {
      setIsLoadingCorrections(false);
    }
  };

  const handleValidate = async () => {
    setShowResults(true);
    if (courseId && courseName && qcmCount > 0) {
      const newGrade = {
        id: crypto.randomUUID(),
        courseId,
        courseName,
        score,
        total: qcmCount,
        date: new Date().toISOString(),
        mcqs,
        selectedAnswers
      };

      if (profile) {
        await supabase.from('mcq_grades').insert([{
          id: newGrade.id,
          user_id: profile.id,
          course_id: newGrade.courseId,
          course_name: newGrade.courseName,
          score: newGrade.score,
          total: newGrade.total,
          date: newGrade.date,
          mcqs: newGrade.mcqs,
          selected_answers: newGrade.selectedAnswers
        }]);
      } else {
        const savedStr = localStorage.getItem('aura_mcq_grades');
        const saved = savedStr ? JSON.parse(savedStr) : [];
        saved.push(newGrade);
        localStorage.setItem('aura_mcq_grades', JSON.stringify(saved));
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {scenarioText && (
        <div className="glass-panel fade-in" style={{
          padding: '1.5rem',
          borderRadius: '1rem',
          backgroundColor: 'var(--bg-elevated)',
          borderLeft: '4px solid var(--accent-primary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', margin: 0, fontSize: '1.1rem' }}>
            <span>📋</span> Énoncé / Cas Clinique
          </h3>
          <p style={{ lineHeight: '1.7', whiteSpace: 'pre-line', fontSize: '0.95rem', color: 'var(--text-primary)', margin: 0 }}>
            {scenarioText}
          </p>
        </div>
      )}

      {showResults && (
        <div className="glass-panel fade-in" style={{ 
          padding: '2rem', 
          borderRadius: '1.25rem', 
          backgroundColor: 'var(--bg-elevated)', 
          textAlign: 'center',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
            {qcmCount > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>
                  Score QCM : {score} / {qcmCount}
                </h2>
                <span style={{ 
                  padding: '0.25rem 0.75rem', 
                  borderRadius: '2rem', 
                  fontSize: '0.9rem', 
                  fontWeight: 800,
                  backgroundColor: score === qcmCount ? 'var(--success-light)' : (score >= qcmCount / 2 ? 'var(--accent-light)' : 'var(--danger-light)'),
                  color: score === qcmCount ? 'var(--success)' : (score >= qcmCount / 2 ? 'var(--accent-primary)' : 'var(--danger)')
                }}>
                  {Math.round((score / qcmCount) * 100)}%
                </span>
              </div>
            ) : (
              <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>
                Épreuve Rédactionnelle ({openCount} question{openCount > 1 ? 's' : ''})
              </h2>
            )}

            {openCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <span>✍️ {openCount} question{openCount > 1 ? 's' : ''} rédactionnelle{openCount > 1 ? 's' : ''}</span>
                <span>•</span>
                <span style={{ color: evaluatedOpenCount === openCount ? 'var(--success)' : 'var(--accent-primary)', fontWeight: 700 }}>
                  {evaluatedOpenCount}/{openCount} évaluée{evaluatedOpenCount > 1 ? 's' : ''} par Sofia IA
                </span>
              </div>
            )}
          </div>

          {qcmCount > 0 && (
            wrongQuestions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', width: '100%', maxWidth: '520px' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Tu as fait {wrongQuestions.length} erreur{wrongQuestions.length > 1 ? 's' : ''} sur les QCM de cette session.
                </p>
                <button
                  onClick={handleFetchDetailedCorrections}
                  disabled={isLoadingCorrections || (Object.keys(detailedCorrections).length === 0 && isQuotaReached)}
                  title={Object.keys(detailedCorrections).length === 0 && isQuotaReached ? `Limite quotidienne atteinte (${dailyUsage}/${maxGenerations} générations)` : undefined}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.8rem 1.6rem',
                    borderRadius: '0.75rem',
                    backgroundColor: 'var(--accent-primary)',
                    color: 'white',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: isLoadingCorrections ? 'wait' : ((Object.keys(detailedCorrections).length === 0 && isQuotaReached) ? 'not-allowed' : 'pointer'),
                    opacity: (Object.keys(detailedCorrections).length === 0 && isQuotaReached) ? 0.45 : 1,
                    boxShadow: (Object.keys(detailedCorrections).length === 0 && isQuotaReached) ? 'none' : 'var(--shadow-accent)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isLoadingCorrections ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Sofia prépare l'explication...</span>
                    </>
                  ) : (
                    <>
                      <BookOpen size={18} />
                      <span>
                        {Object.keys(detailedCorrections).length > 0 
                          ? (showDetailedPanel ? 'Masquer la correction détaillée' : 'Afficher la correction détaillée')
                          : (isQuotaReached ? `Limite atteinte (${dailyUsage}/${maxGenerations})` : `Voir la correction détaillée (${wrongQuestions.length} item${wrongQuestions.length > 1 ? 's' : ''})`)}
                      </span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div style={{ color: 'var(--success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}>
                <span>🎉 Félicitations ! Score parfait de 100%, aucune erreur commise sur les QCM.</span>
              </div>
            )
          )}
        </div>
      )}

      {/* Accordion / Full Summary of detailed corrections when opened */}
      {showResults && showDetailedPanel && Object.keys(detailedCorrections).length > 0 && (
        <div className="glass-panel fade-in" style={{
          padding: '1.75rem',
          borderRadius: '1.25rem',
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-color)',
          borderLeft: '5px solid var(--accent-primary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--accent-primary)', fontSize: '1.15rem' }}>
              <Sparkles size={20} />
              <span>Explications détaillées des erreurs</span>
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              1 phrase par question
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {wrongQuestions.map(({ q, idx }) => {
              const correction = detailedCorrections[idx];
              if (!correction) return null;
              return (
                <div 
                  key={idx}
                  style={{
                    padding: '1.1rem 1.25rem',
                    borderRadius: '0.75rem',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Question {idx + 1} : {q.question}
                  </div>
                  <div style={{ 
                    fontSize: '0.92rem', 
                    color: 'var(--text-primary)', 
                    lineHeight: '1.6', 
                    backgroundColor: 'var(--bg-elevated)', 
                    padding: '0.75rem 1rem', 
                    borderRadius: '0.5rem',
                    borderLeft: '3px solid var(--accent-primary)' 
                  }}>
                    {cleanExplanation(correction)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mcqs.map((q, qIndex) => {
        const isOpen = isOpenQuestion(q);
        const correctOpts = getCorrectAnswers(q);
        const selected = selectedAnswers[qIndex] || [];
        const isWrong = showResults && !isOpen && !isQuestionCorrect(qIndex);
        const openEval = openEvaluations[qIndex];

        return (
          <div 
            key={qIndex} 
            className="glass-panel" 
            style={{ 
              padding: '1.5rem', 
              borderRadius: '1rem',
              border: isWrong 
                ? '1px solid rgba(239, 68, 68, 0.4)' 
                : (showResults && isOpen && openEval?.status === 'correct' ? '1px solid rgba(16, 185, 129, 0.4)' : undefined)
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '1rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: isOpen ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    color: isOpen ? '#c084fc' : '#60a5fa',
                    border: '1px solid var(--border-color)'
                  }}>
                    {isOpen ? '✍️ Question Rédactionnelle / QROC' : '☑️ QCM'}
                  </span>
                </div>
                <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem' }}>{qIndex + 1}. {q.question}</h3>
              </div>

              {showResults && !isOpen && (
                <span style={{ 
                  padding: '0.2rem 0.6rem', 
                  borderRadius: '1rem', 
                  fontSize: '0.75rem', 
                  fontWeight: 700,
                  flexShrink: 0,
                  backgroundColor: !isWrong ? 'var(--success-light)' : 'var(--danger-light)',
                  color: !isWrong ? 'var(--success)' : 'var(--danger)'
                }}>
                  {!isWrong ? 'Correct (+1 pt)' : 'Erreur (0 pt)'}
                </span>
              )}

              {showResults && isOpen && openEval && (
                <span style={{ 
                  padding: '0.2rem 0.6rem', 
                  borderRadius: '1rem', 
                  fontSize: '0.75rem', 
                  fontWeight: 700,
                  flexShrink: 0,
                  backgroundColor: openEval.status === 'correct' ? 'var(--success-light)' : (openEval.status === 'partial' ? 'var(--accent-light)' : 'var(--danger-light)'),
                  color: openEval.status === 'correct' ? 'var(--success)' : (openEval.status === 'partial' ? 'var(--accent-primary)' : 'var(--danger)')
                }}>
                  {openEval.grade} / {openEval.maxGrade}
                </span>
              )}
            </div>
            
            {!isOpen && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                {correctOpts.length > 1 ? "(Plusieurs réponses possibles)" : "(Une seule réponse possible)"}
              </p>
            )}

            {/* Illustrations / Schémas attachés à la question */}
            {((q.images && q.images.length > 0) || q.image) && (
              <div style={{ margin: '0.75rem 0 1.25rem 0', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
                {(q.images || [q.image!]).map((imgSrc, imgIdx) => (
                  <div
                    key={imgIdx}
                    onClick={() => setZoomedImage(imgSrc)}
                    style={{
                      cursor: 'zoom-in',
                      borderRadius: '0.75rem',
                      overflow: 'hidden',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      maxHeight: '320px',
                      maxWidth: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'transform 0.2s ease'
                    }}
                    title="Cliquer pour agrandir l'illustration"
                  >
                    <img
                      src={imgSrc}
                      alt={`Illustration question ${qIndex + 1}`}
                      style={{ maxWidth: '100%', maxHeight: '320px', objectFit: 'contain', display: 'block' }}
                    />
                  </div>
                ))}
              </div>
            )}
            
            {/* Open question response OR MCQ options */}
            {isOpen ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                {!showResults ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Votre réponse rédigée :
                      </label>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {writtenAnswers[qIndex]?.trim() ? `${writtenAnswers[qIndex].trim().split(/\s+/).length} mot(s)` : '0 mot'}
                      </span>
                    </div>
                    <textarea
                      value={writtenAnswers[qIndex] || ''}
                      onChange={e => setWrittenAnswers(prev => ({ ...prev, [qIndex]: e.target.value }))}
                      placeholder="Rédigez ici votre réponse (notions clés, étapes de raisonnement, diagnostic, conduite à tenir)..."
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '0.9rem',
                        borderRadius: '0.75rem',
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.95rem',
                        lineHeight: '1.6',
                        resize: 'vertical',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Student's answer */}
                    <div style={{
                      padding: '1rem 1.25rem',
                      borderRadius: '0.75rem',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)'
                    }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                        ✍️ Votre Réponse Rédigée :
                      </div>
                      <p style={{ margin: 0, fontSize: '0.95rem', color: writtenAnswers[qIndex]?.trim() ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: writtenAnswers[qIndex]?.trim() ? 'normal' : 'italic', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                        {writtenAnswers[qIndex]?.trim() || '(Aucune réponse saisie)'}
                      </p>
                    </div>

                    {/* Official Expected Answer / Correction */}
                    {(q.expectedAnswer || q.explanation) && (
                      <div style={{
                        padding: '1rem 1.25rem',
                        borderRadius: '0.75rem',
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-color)',
                        borderLeft: '4px solid var(--accent-primary)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.85rem' }}>
                          <BookOpen size={16} />
                          <span>Corrigé Officiel & Notions Attendues :</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.925rem', color: 'var(--text-primary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                          {cleanExplanation(q.expectedAnswer || q.explanation || '')}
                        </p>
                      </div>
                    )}

                    {/* Sofia IA Evaluation Result or Action Button */}
                    {openEval ? (
                      <div className="fade-in" style={{
                        padding: '1.25rem',
                        borderRadius: '0.85rem',
                        backgroundColor: openEval.status === 'correct' ? '#10b98112' : (openEval.status === 'partial' ? '#f59e0b12' : '#ef444412'),
                        border: `1px solid ${openEval.status === 'correct' ? 'rgba(16, 185, 129, 0.4)' : (openEval.status === 'partial' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)')}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Sparkles size={18} style={{ color: openEval.status === 'correct' ? 'var(--success)' : (openEval.status === 'partial' ? 'var(--warning)' : 'var(--danger)') }} />
                            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                              Évaluation Sofia IA
                            </span>
                          </div>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '1rem',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            backgroundColor: openEval.status === 'correct' ? 'var(--success-light)' : (openEval.status === 'partial' ? 'var(--accent-light)' : 'var(--danger-light)'),
                            color: openEval.status === 'correct' ? 'var(--success)' : (openEval.status === 'partial' ? 'var(--accent-primary)' : 'var(--danger)')
                          }}>
                            {openEval.grade} / {openEval.maxGrade} ({openEval.scorePercentage}%)
                          </span>
                        </div>

                        <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                          {openEval.feedback}
                        </p>

                        {/* Acquired Points */}
                        {openEval.pointsAcquired?.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.25rem' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--success)' }}>
                              ✓ Notions & points validés :
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                              {openEval.pointsAcquired.map((pt, pIdx) => (
                                <span key={pIdx} style={{ fontSize: '0.78rem', padding: '0.2rem 0.55rem', borderRadius: '0.5rem', backgroundColor: '#10b98120', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                  {pt}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Missing Points */}
                        {openEval.pointsMissing?.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.25rem' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--warning)' }}>
                              ⚠️ Éléments omis ou à approfondir :
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                              {openEval.pointsMissing.map((pt, pIdx) => (
                                <span key={pIdx} style={{ fontSize: '0.78rem', padding: '0.2rem 0.55rem', borderRadius: '0.5rem', backgroundColor: '#f59e0b20', color: 'var(--warning)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                  {pt}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                          <button
                            onClick={() => handleEvaluateOpenAnswer(qIndex)}
                            disabled={evaluatingIndices[qIndex]}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-secondary)',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              textDecoration: 'underline'
                            }}
                          >
                            {evaluatingIndices[qIndex] ? 'Réévaluation en cours...' : 'Réévaluer avec Sofia IA'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginTop: '0.5rem' }}>
                        <button
                          onClick={() => handleEvaluateOpenAnswer(qIndex)}
                          disabled={evaluatingIndices[qIndex] || !writtenAnswers[qIndex]?.trim()}
                          title={!writtenAnswers[qIndex]?.trim() ? 'Vous devez saisir une réponse pour demander l’évaluation' : undefined}
                          className="btn btn-secondary"
                          style={{
                            fontSize: '0.85rem',
                            padding: '0.5rem 1rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            cursor: (!writtenAnswers[qIndex]?.trim() || evaluatingIndices[qIndex]) ? 'not-allowed' : 'pointer',
                            opacity: !writtenAnswers[qIndex]?.trim() ? 0.5 : 1
                          }}
                        >
                          {evaluatingIndices[qIndex] ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              <span>Sofia analyse votre rédaction...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={16} />
                              <span>Évaluer ma rédaction avec Sofia IA</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {q.options.map((option, oIndex) => {
                  const isSelected = selected.includes(option);
                  const isCorrect = isCorrectOption(correctOpts, option, oIndex);
                  
                  let bgColor = 'var(--bg-primary)';
                  let borderColor = 'var(--border-color)';
                  let feedbackText = '';
                  
                  if (showResults) {
                    if (isCorrect && isSelected) {
                      bgColor = '#10b98120'; 
                      borderColor = 'var(--success)';
                      feedbackText = '✅ Bonne réponse cochée';
                    } else if (isCorrect && !isSelected) {
                      bgColor = '#f59e0b20'; // Orange transparent
                      borderColor = 'var(--warning)';
                      feedbackText = '⚠️ Réponse correcte oubliée';
                    } else if (!isCorrect && isSelected) {
                      bgColor = '#ef444420'; 
                      borderColor = 'var(--danger)';
                      feedbackText = '❌ Cochée par erreur';
                    }
                  } else if (isSelected) {
                    borderColor = 'var(--accent-primary)';
                    bgColor = 'var(--bg-elevated)';
                  }

                  return (
                    <button
                      key={oIndex}
                      onClick={() => handleSelect(qIndex, option)}
                      disabled={showResults}
                      style={{
                        padding: '1rem',
                        textAlign: 'left',
                        borderRadius: '0.5rem',
                        border: `1px solid ${borderColor}`,
                        backgroundColor: bgColor,
                        cursor: showResults ? 'default' : 'pointer',
                        transition: 'all 0.2s',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        position: 'relative'
                      }}
                    >
                      <div style={{ 
                        width: '18px', height: '18px', flexShrink: 0, 
                        border: `2px solid ${isSelected ? (showResults && !isCorrect ? 'var(--danger)' : 'var(--accent-primary)') : 'var(--text-secondary)'}`, 
                        borderRadius: '4px',
                        backgroundColor: isSelected ? (showResults && !isCorrect ? 'var(--danger)' : 'var(--accent-primary)') : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {isSelected && <div style={{ width: '10px', height: '10px', backgroundColor: 'white', clipPath: 'polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%)' }} />}
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <span>{option}</span>
                        {showResults && feedbackText && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: borderColor, marginTop: '0.25rem' }}>
                            {feedbackText}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Individual Quoted Source Correction Box for this wrong question */}
            {showResults && !isOpen && detailedCorrections[qIndex] && (
              <div 
                className="fade-in"
                style={{
                  marginTop: '1.25rem',
                  padding: '1rem 1.25rem',
                  borderRadius: '0.75rem',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  borderLeft: '4px solid var(--accent-primary)',
                  boxShadow: 'var(--shadow-xs)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.85rem' }}>
                  <BookOpen size={16} />
                  <span>Explication :</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.925rem', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                  {cleanExplanation(detailedCorrections[qIndex])}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {!showResults && (
        <button 
          className="btn btn-primary" 
          onClick={handleValidate}
          style={{ padding: '1rem', fontSize: '1rem', marginTop: '1rem' }}
        >
          {openCount > 0 && qcmCount > 0 ? "Valider l'Épreuve Mixte" : (openCount > 0 ? "Valider l'Épreuve Rédactionnelle" : "Valider le QCM")}
        </button>
      )}
      
      {showResults && (
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button 
            className="btn btn-outline" 
            onClick={() => { 
              setShowResults(false); 
              setSelectedAnswers({}); 
              setWrittenAnswers({});
              setOpenEvaluations({});
              setDetailedCorrections({});
              setShowDetailedPanel(false);
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RotateCcw size={16} />
            <span>Recommencer l'épreuve</span>
          </button>

          {wrongQuestions.length > 0 && (
            <button
              className="btn btn-secondary"
              onClick={handleFetchDetailedCorrections}
              disabled={isLoadingCorrections}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {isLoadingCorrections ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Analyse en cours...</span>
                </>
              ) : (
                <>
                  <BookOpen size={16} />
                  <span>
                    {Object.keys(detailedCorrections).length > 0 
                      ? (showDetailedPanel ? 'Masquer la correction détaillée' : 'Afficher la correction détaillée')
                      : 'Voir la correction détaillée'}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Barre de progression pendant l'explication IA des erreurs */}
      {showResults && isLoadingCorrections && (
        <div style={{ marginTop: '1.5rem', width: '100%' }}>
          <AIProgressCard
            title="Analyse pédagogique en cours..."
            subtitle="Sofia examine vos erreurs et recherche les extraits pertinents de votre cours"
            estimatedDuration={9}
            steps={[
              { atPercent: 0, label: "Identification des questions à corriger..." },
              { atPercent: 25, label: "Recherche des notions clés dans votre cours..." },
              { atPercent: 60, label: "Rédaction des explications pédagogiques ciblées..." },
              { atPercent: 88, label: "Mise en page des justifications..." },
            ]}
          />
        </div>
      )}

      {/* Lightbox pour zoomer sur une illustration */}
      {zoomedImage && (
        <div 
          onClick={() => setZoomedImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
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
            style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: '0.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} 
          />
        </div>
      )}
    </div>
  );
};
