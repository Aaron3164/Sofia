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

  let mcqs: MCQ[] = [];
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
      mcqs = Array.isArray(parsedData) ? parsedData : [];
    } else {
      mcqs = data;
    }
  } catch (e) {
    return <div className="text-danger">Échec de l'analyse des QCM. Les données brutes ne sont pas au format attendu.</div>;
  }

  if (mcqs.length === 0) return <div>Aucun QCM généré.</div>;

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
                  if (console) {} // To appease linters if needed
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
