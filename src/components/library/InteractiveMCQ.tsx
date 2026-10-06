import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { explainMCQErrors } from '../../lib/gemini';
import { BookOpen, Loader2, Sparkles, RotateCcw } from 'lucide-react';

export interface MCQ {
  question: string;
  options: string[];
  correctAnswers?: string[];
  correctAnswer?: string; // Fallback for older generations
  image?: string;
  images?: string[];
  explanation?: string;
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

  // Track changes and save to session
  useEffect(() => {
    if (courseId) {
      sessionStorage.setItem(`aura_mcq_answers_${courseId}`, JSON.stringify(selectedAnswers));
      sessionStorage.setItem(`aura_mcq_results_${courseId}`, showResults.toString());
      sessionStorage.setItem(`aura_mcq_corrections_${courseId}`, JSON.stringify(detailedCorrections));
    }
  }, [selectedAnswers, showResults, detailedCorrections, courseId]);

  // Reset state on new generation
  useEffect(() => {
    setSelectedAnswers({});
    setShowResults(false);
    setDetailedCorrections({});
    setShowDetailedPanel(false);
    if (courseId) {
      sessionStorage.removeItem(`aura_mcq_answers_${courseId}`);
      sessionStorage.removeItem(`aura_mcq_results_${courseId}`);
      sessionStorage.removeItem(`aura_mcq_corrections_${courseId}`);
    }
  }, [data]);

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
    
    return correctOpts.some(c => {
      if (c === null || c === undefined) return false;
      const cStr = c.toString().trim();
      const normalizedC = normalize(cStr);
      
      // 1. Match par texte (normalisé agressivement)
      if (normalizedC !== '' && normalizedC === normalizedOption) return true;
      
      // 2. Match par index (0-based: "0", "1"...)
      if (cStr === oIndex.toString()) return true;
      
      // 3. Match par index (1-based: "1", "2"...)
      if (cStr === (oIndex + 1).toString()) return true;

      // 4. Match par lettre ("a", "b", "c"...)
      if (normalizedC === letters[oIndex]) return true;
      
      return false;
    });
  };

  const isQuestionCorrect = (qIndex: number) => {
    const q = mcqs[qIndex];
    if (!q) return false;
    const selected = (selectedAnswers[qIndex] || []).map(normalize);
    const correctOpts = getCorrectAnswers(q);
    const correctOptionTexts = q.options.filter((opt, i) => isCorrectOption(correctOpts, opt, i)).map(normalize);

    return (
      selected.length === correctOptionTexts.length &&
      selected.every(ans => correctOptionTexts.includes(ans))
    );
  };

  const score = mcqs.reduce((acc, _, idx) => {
    return acc + (isQuestionCorrect(idx) ? 1 : 0);
  }, 0);

  const wrongQuestions = mcqs
    .map((q, idx) => ({ q, idx }))
    .filter(({ idx }) => !isQuestionCorrect(idx));

  const handleFetchDetailedCorrections = async () => {
    if (Object.keys(detailedCorrections).length > 0) {
      setShowDetailedPanel(prev => !prev);
      return;
    }

    if (wrongQuestions.length === 0) return;

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
    if (courseId && courseName) {
      const newGrade = {
        id: crypto.randomUUID(),
        courseId,
        courseName,
        score,
        total: mcqs.length,
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>
              Votre Score : {score} / {mcqs.length}
            </h2>
            <span style={{ 
              padding: '0.25rem 0.75rem', 
              borderRadius: '2rem', 
              fontSize: '0.9rem', 
              fontWeight: 800,
              backgroundColor: score === mcqs.length ? 'var(--success-light)' : (score >= mcqs.length / 2 ? 'var(--accent-light)' : 'var(--danger-light)'),
              color: score === mcqs.length ? 'var(--success)' : (score >= mcqs.length / 2 ? 'var(--accent-primary)' : 'var(--danger)')
            }}>
              {Math.round((score / mcqs.length) * 100)}%
            </span>
          </div>

          {wrongQuestions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', width: '100%', maxWidth: '520px' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Tu as fait {wrongQuestions.length} erreur{wrongQuestions.length > 1 ? 's' : ''} sur cette session d'examen blanc.
              </p>
              <button
                onClick={handleFetchDetailedCorrections}
                disabled={isLoadingCorrections}
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
                  cursor: isLoadingCorrections ? 'wait' : 'pointer',
                  boxShadow: 'var(--shadow-accent)',
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
                        : `Voir la correction détaillée (${wrongQuestions.length} item${wrongQuestions.length > 1 ? 's' : ''})`}
                    </span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div style={{ color: 'var(--success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}>
              <span>🎉 Félicitations ! Score parfait de 100%, aucune erreur commise sur ce QCM.</span>
            </div>
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
        const correctOpts = getCorrectAnswers(q);
        const selected = selectedAnswers[qIndex] || [];
        const isWrong = showResults && !isQuestionCorrect(qIndex);

        return (
          <div 
            key={qIndex} 
            className="glass-panel" 
            style={{ 
              padding: '1.5rem', 
              borderRadius: '1rem',
              border: isWrong ? '1px solid rgba(239, 68, 68, 0.4)' : undefined
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{qIndex + 1}. {q.question}</h3>
              {showResults && (
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
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              {correctOpts.length > 1 ? "(Plusieurs réponses possibles)" : "(Une seule réponse possible)"}
            </p>

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

            {/* Individual Quoted Source Correction Box for this wrong question */}
            {showResults && detailedCorrections[qIndex] && (
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
          Valider le QCM
        </button>
      )}
      
      {showResults && (
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button 
            className="btn btn-outline" 
            onClick={() => { 
              setShowResults(false); 
              setSelectedAnswers({}); 
              setDetailedCorrections({});
              setShowDetailedPanel(false);
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RotateCcw size={16} />
            <span>Recommencer le QCM</span>
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
                  <span>Sofia analyse le cours...</span>
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
