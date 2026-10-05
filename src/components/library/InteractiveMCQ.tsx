import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

interface MCQ {
  question: string;
  options: string[];
  correctAnswers?: string[];
  correctAnswer?: string; // Fallback for older generations
}

export const InteractiveMCQ: React.FC<{ data: string | MCQ[], courseId?: string, courseName?: string }> = ({ data, courseId, courseName }) => {
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

  // Track changes and save to session
  useEffect(() => {
    if (courseId) {
      sessionStorage.setItem(`aura_mcq_answers_${courseId}`, JSON.stringify(selectedAnswers));
      sessionStorage.setItem(`aura_mcq_results_${courseId}`, showResults.toString());
    }
  }, [selectedAnswers, showResults, courseId]);

  // Reset state on new generation
  useEffect(() => {
    setSelectedAnswers({});
    setShowResults(false);
    if (courseId) {
      sessionStorage.removeItem(`aura_mcq_answers_${courseId}`);
      sessionStorage.removeItem(`aura_mcq_results_${courseId}`);
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

  const score = mcqs.reduce((acc, q, idx) => {
    const selected = (selectedAnswers[idx] || []).map(normalize);
    const correctOpts = getCorrectAnswers(q);
    
    // Identifier les bonnes options réelles de la question
    const correctOptionTexts = q.options.filter((opt, i) => isCorrectOption(correctOpts, opt, i)).map(normalize);

    // Score parfait : toutes les bonnes options sont sélectionnées, et rien d'autre
    const isPerfectMatch = 
      selected.length === correctOptionTexts.length &&
      selected.every(ans => correctOptionTexts.includes(ans));
      
    return acc + (isPerfectMatch ? 1 : 0);
  }, 0);

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
        <div className="glass-panel fade-in" style={{ padding: '1.5rem', borderRadius: '1rem', backgroundColor: 'var(--bg-elevated)', textAlign: 'center' }}>
          <h2>Votre Score : {score} / {mcqs.length}</h2>
        </div>
      )}

      {mcqs.map((q, qIndex) => {
        const correctOpts = getCorrectAnswers(q);
        const selected = selectedAnswers[qIndex] || [];

        return (
          <div key={qIndex} className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>{qIndex + 1}. {q.question}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              {correctOpts.length > 1 ? "(Plusieurs réponses possibles)" : "(Une seule réponse possible)"}
            </p>
            
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
        <button className="btn btn-outline" onClick={() => { setShowResults(false); setSelectedAnswers({}); }}>
          Recommencer le QCM
        </button>
      )}
    </div>
  );
};
