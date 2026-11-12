import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, Flame, Zap, Target, Clock, 
  TrendingUp, Award, Folder, CheckCircle2, 
  Calendar, Trash2, BarChart2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useFileSystem } from '../hooks/useFileSystem';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { supabase } from '../lib/supabase';
import './StatsPage.css';

type StatViewTab = 'overview' | 'folders' | 'annales' | 'history';

interface MCQGrade {
  id: string;
  courseId: string;
  courseName: string;
  score: number;
  total: number;
  date: string;
  mcqs?: any[];
  selectedAnswers?: Record<number, string[]>;
}

interface TimeSpent {
  [courseId: string]: {
    courseName: string;
    seconds: number;
  };
}

export default function Statistics() {
  const { nodes } = useFileSystem();
  const { profile } = useAuth();
  const { confirm } = useDialog();

  const [activeTab, setActiveTab] = useState<StatViewTab>('overview');
  const [mcqGrades, setMcqGrades] = useState<MCQGrade[]>([]);
  const [timeData, setTimeData] = useState<TimeSpent>({});

  // 1. Data Fetching & Sync
  useEffect(() => {
    async function loadStats() {
      try {
        if (!profile) {
          const mcqStr = localStorage.getItem('aura_mcq_grades');
          if (mcqStr) setMcqGrades(JSON.parse(mcqStr));

          const timeStr = localStorage.getItem('aura_time_spent');
          if (timeStr) setTimeData(JSON.parse(timeStr));
          return;
        }

        const [mcqRes, statsRes] = await Promise.all([
          supabase.from('mcq_grades').select('*').order('date', { ascending: false }),
          supabase.from('course_stats').select('*')
        ]);

        if (!mcqRes.error && mcqRes.data) {
          setMcqGrades(mcqRes.data.map(m => ({
            id: m.id,
            courseId: m.course_id,
            courseName: m.course_name,
            score: m.score,
            total: m.total,
            date: m.date,
            mcqs: m.mcqs,
            selectedAnswers: m.selected_answers
          })));
        } else {
          const local = localStorage.getItem('aura_mcq_grades');
          if (local) setMcqGrades(JSON.parse(local));
        }

        if (!statsRes.error && statsRes.data) {
          const statsMap: TimeSpent = {};
          statsRes.data.forEach((s: any) => {
            const node = nodes.find(n => n.id === s.course_id);
            statsMap[s.course_id] = { courseName: node?.name || 'Cours', seconds: s.seconds };
          });
          setTimeData(statsMap);
        } else {
          const localTime = localStorage.getItem('aura_time_spent');
          if (localTime) setTimeData(JSON.parse(localTime));
        }
      } catch (err) {
        console.error('Error loading stats:', err);
      }
    }
    loadStats();
  }, [profile, nodes]);

  // 2. Computed Metrics & Gamification (XP, Levels, Streak)
  const metrics = useMemo(() => {
    // Total time in seconds
    const totalSeconds = Object.values(timeData).reduce((acc, curr) => acc + (curr.seconds || 0), 0);
    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);

    // QCM & Annales counts
    const totalEvaluations = mcqGrades.length;
    const annaleGrades = mcqGrades.filter(g => g.courseName?.includes('🎓') || g.courseName?.toLowerCase().includes('annale'));
    const totalQuestions = mcqGrades.reduce((acc, curr) => acc + (curr.total || 0), 0);
    const totalCorrect = mcqGrades.reduce((acc, curr) => acc + (curr.score || 0), 0);
    const successRate = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    // Gamification: XP Calculation
    // Base: 10 XP per minute studied, 25 XP per correct QCM, 100 XP per test done
    const studyXp = Math.floor(totalSeconds / 60) * 10;
    const qcmXp = totalCorrect * 25;
    const evalXp = totalEvaluations * 100;
    const totalXp = studyXp + qcmXp + evalXp;

    // Level curve: Level 1 = 0 XP, Level 2 = 500 XP, Level 3 = 1200 XP, etc.
    const level = Math.floor(Math.sqrt(totalXp / 250)) + 1;
    const currentLevelBaseXp = Math.pow(level - 1, 2) * 250;
    const nextLevelBaseXp = Math.pow(level, 2) * 250;
    const levelXpProgress = totalXp - currentLevelBaseXp;
    const levelXpRequired = nextLevelBaseXp - currentLevelBaseXp;
    const progressPercent = Math.min(100, Math.round((levelXpProgress / Math.max(1, levelXpRequired)) * 100));

    // Level Titles
    const getLevelTitle = (lvl: number) => {
      if (lvl >= 10) return 'Major de Promotion 🏆';
      if (lvl >= 7) return 'Grand Admissible 🎓';
      if (lvl >= 5) return 'Praticien Confirmé ⚡';
      if (lvl >= 3) return 'Étudiant Assidu 📚';
      return 'Apprenti Motivé 🌟';
    };

    // Calculate Streak (Consecutive Days)
    const uniqueDates = Array.from(new Set(mcqGrades.map(g => g.date.split('T')[0]))).sort().reverse();
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    let checkDate = new Date();

    if (uniqueDates.includes(today)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (uniqueDates.includes(checkDate.toISOString().split('T')[0])) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return {
      totalHours,
      totalMinutes,
      totalSeconds,
      totalEvaluations,
      annaleGrades,
      totalQuestions,
      totalCorrect,
      successRate,
      totalXp,
      level,
      levelTitle: getLevelTitle(level),
      progressPercent,
      streak: Math.max(streak, totalSeconds > 60 ? 1 : 0)
    };
  }, [mcqGrades, timeData]);

  // 3. Chronological Curve Data (Progression Over Time)
  const chartPoints = useMemo(() => {
    if (mcqGrades.length === 0) return [];
    // Sort oldest to newest
    const sorted = [...mcqGrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Group or map last 12 tests
    const recent = sorted.slice(-12);
    return recent.map((item, idx) => {
      const pct = item.total > 0 ? Math.round((item.score / item.total) * 100) : 0;
      return {
        x: idx,
        score: pct,
        label: format(new Date(item.date), 'd MMM', { locale: fr }),
        name: item.courseName.replace(/^🎓\s*/, '')
      };
    });
  }, [mcqGrades]);

  // 4. Folder Breakdown (Progress per Subject Folder)
  const folderStats = useMemo(() => {
    const folders = nodes.filter(n => n.type === 'folder');
    return folders.map(f => {
      // Find all courses inside this folder
      const childCourses = nodes.filter(n => n.parentId === f.id && (n.type === 'course' || n.name.startsWith('🎓')));
      const courseIds = new Set(childCourses.map(c => c.id));
      
      const folderGrades = mcqGrades.filter(g => courseIds.has(g.courseId));
      const totalQ = folderGrades.reduce((acc, g) => acc + g.total, 0);
      const correctQ = folderGrades.reduce((acc, g) => acc + g.score, 0);
      const avgScore = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0;

      let folderSeconds = 0;
      courseIds.forEach(id => {
        if (timeData[id]) folderSeconds += timeData[id].seconds;
      });

      return {
        id: f.id,
        name: f.name,
        color: f.color,
        courseCount: childCourses.length,
        evalCount: folderGrades.length,
        avgScore,
        hours: Math.floor(folderSeconds / 3600),
        minutes: Math.floor((folderSeconds % 3600) / 60)
      };
    });
  }, [nodes, mcqGrades, timeData]);

  // Delete evaluation handler
  const handleDeleteGrade = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (await confirm('Supprimer cet examen de ton historique ?')) {
      const updated = mcqGrades.filter(g => g.id !== id);
      setMcqGrades(updated);
      localStorage.setItem('aura_mcq_grades', JSON.stringify(updated));
      if (profile) {
        await supabase.from('mcq_grades').delete().eq('id', id);
      }
    }
  };

  return (
    <div className="stats-dashboard">
      
      {/* 1. Gamification Hero Card */}
      <div className="gamification-hero">
        <div className="user-profile-meta">
          <div className="level-badge" title={`Niveau ${metrics.level} : ${metrics.levelTitle}`}>
            <span className="lvl-title">NIV</span>
            <span className="lvl-num">{metrics.level}</span>
          </div>

          <div className="xp-progress-wrap">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{metrics.levelTitle}</strong>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <strong>{metrics.totalXp.toLocaleString()} XP</strong>
              </span>
            </div>
            <div className="xp-progress-bar">
              <div className="xp-progress-fill" style={{ width: `${metrics.progressPercent}%` }} />
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
              {metrics.progressPercent}% vers le niveau {metrics.level + 1}
            </span>
          </div>
        </div>

        <div className="hero-badges-streak">
          <div className="streak-pill" title="Jours d'étude consécutifs">
            <Flame size={18} fill="#f97316" />
            <span>{metrics.streak} {metrics.streak > 1 ? 'Jours de série' : 'Jour actif'}</span>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Grid (shadcn Cards) */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-top">
            <span>Taux de Réussite</span>
            <Target size={16} className="text-accent" />
          </div>
          <div className="kpi-value">{metrics.successRate}%</div>
          <div className="kpi-sub">
            <CheckCircle2 size={12} style={{ color: 'var(--success)' }} />
            <span>{metrics.totalCorrect} sur {metrics.totalQuestions} questions validées</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span>Temps d'Étude Total</span>
            <Clock size={16} className="text-accent" />
          </div>
          <div className="kpi-value">
            {metrics.totalHours > 0 ? `${metrics.totalHours}h ${metrics.totalMinutes}m` : `${metrics.totalMinutes} min`}
          </div>
          <div className="kpi-sub">
            <Zap size={12} style={{ color: '#fbbf24' }} />
            <span>Temps actif enregistré sur tes cours</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span>Examens & QCM</span>
            <BarChart2 size={16} className="text-accent" />
          </div>
          <div className="kpi-value">{metrics.totalEvaluations}</div>
          <div className="kpi-sub">
            <span>Sessions d'entraînement terminées</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span>Annales Officielles</span>
            <Trophy size={16} className="text-accent" />
          </div>
          <div className="kpi-value">{metrics.annaleGrades.length}</div>
          <div className="kpi-sub">
            <span>Sujets de concours préparés</span>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs (shadcn style) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="shadcn-tabs">
          <button 
            className={`shadcn-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <TrendingUp size={14} /> Vue Globale
          </button>
          <button 
            className={`shadcn-tab-btn ${activeTab === 'folders' ? 'active' : ''}`}
            onClick={() => setActiveTab('folders')}
          >
            <Folder size={14} /> Par Dossier
          </button>
          <button 
            className={`shadcn-tab-btn ${activeTab === 'annales' ? 'active' : ''}`}
            onClick={() => setActiveTab('annales')}
          >
            <Trophy size={14} /> Annales Concours
          </button>
          <button 
            className={`shadcn-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <Calendar size={14} /> Historique Détaillé
          </button>
        </div>
      </div>

      {/* 4. Tab 1: Overview & Vector Progress Chart */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="analytics-card">
            <div className="analytics-card-header">
              <div>
                <h3 className="analytics-card-title">
                  <TrendingUp size={18} className="text-accent" />
                  Courbe de Progression (Dernières Évaluations)
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Évolution du taux de réussite sur tes derniers examens et QCM
                </p>
              </div>
            </div>

            {chartPoints.length < 2 ? (
              <div style={{ height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '0.5rem' }}>
                <BarChart2 size={32} style={{ opacity: 0.4 }} />
                <span>Réalise au moins 2 séries de QCM ou annales pour générer ta courbe de tendance.</span>
              </div>
            ) : (
              <div className="chart-container">
                <svg className="chart-svg" viewBox="0 0 700 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  <line x1="40" y1="30" x2="680" y2="30" className="chart-grid-line" />
                  <line x1="40" y1="85" x2="680" y2="85" className="chart-grid-line" />
                  <line x1="40" y1="140" x2="680" y2="140" className="chart-grid-line" />
                  
                  {/* Axis labels */}
                  <text x="10" y="34" className="chart-axis-label">100%</text>
                  <text x="10" y="89" className="chart-axis-label">50%</text>
                  <text x="10" y="144" className="chart-axis-label">0%</text>

                  {/* SVG Coordinates generation */}
                  {(() => {
                    const width = 640;
                    const height = 130;
                    const topOffset = 25;
                    const leftOffset = 45;
                    const step = width / Math.max(1, chartPoints.length - 1);

                    const pts = chartPoints.map((p, i) => {
                      const cx = leftOffset + (i * step);
                      const cy = topOffset + (height - (p.score / 100) * height);
                      return { cx, cy, ...p };
                    });

                    const pathD = pts.reduce((acc, curr, i) => {
                      if (i === 0) return `M ${curr.cx} ${curr.cy}`;
                      // Smooth bezier curve
                      const prev = pts[i - 1];
                      const cp1x = prev.cx + (curr.cx - prev.cx) / 2;
                      const cp1y = prev.cy;
                      const cp2x = prev.cx + (curr.cx - prev.cx) / 2;
                      const cp2y = curr.cy;
                      return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.cx} ${curr.cy}`;
                    }, '');

                    const areaD = `${pathD} L ${pts[pts.length - 1].cx} ${topOffset + height} L ${pts[0].cx} ${topOffset + height} Z`;

                    return (
                      <>
                        <path d={areaD} fill="url(#chartGradient)" />
                        <path d={pathD} className="chart-line" />
                        {pts.map((pt, i) => (
                          <g key={i}>
                            <circle cx={pt.cx} cy={pt.cy} r="4.5" className="chart-point">
                              <title>{`${pt.name} : ${pt.score}% (${pt.label})`}</title>
                            </circle>
                            <text x={pt.cx} y="180" textAnchor="middle" className="chart-axis-label">
                              {pt.label}
                            </text>
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>
            )}
          </div>

          {/* Badges & Achievements Grid */}
          <div className="analytics-card">
            <h3 className="analytics-card-title">
              <Award size={18} className="text-accent" />
              Badges & Succès Débloquables
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
              <div className={`badge-achievement ${metrics.totalEvaluations >= 1 ? 'unlocked' : ''}`}>
                <div className="badge-icon">⚡</div>
                <div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Premier Déclic</strong>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Terminer sa première série de QCM</p>
                </div>
              </div>

              <div className={`badge-achievement ${metrics.totalCorrect >= 50 ? 'unlocked' : ''}`}>
                <div className="badge-icon">🎯</div>
                <div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Tireur d'Élite</strong>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Valider 50 questions avec succès</p>
                </div>
              </div>

              <div className={`badge-achievement ${metrics.annaleGrades.length >= 3 ? 'unlocked' : ''}`}>
                <div className="badge-icon">🏛️</div>
                <div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Major du Concours</strong>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Résoudre au moins 3 annales officielles</p>
                </div>
              </div>

              <div className={`badge-achievement ${metrics.totalHours >= 5 ? 'unlocked' : ''}`}>
                <div className="badge-icon">⏳</div>
                <div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Endurance Ultime</strong>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Cumuler plus de 5 heures d'étude active</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 5. Tab 2: Folder Breakdown */}
      {activeTab === 'folders' && (
        <div className="analytics-card">
          <h3 className="analytics-card-title">
            <Folder size={18} className="text-accent" />
            Performance par Dossier d'Étude
          </h3>
          <p style={{ margin: '0.2rem 0 1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Suis la maîtrise de tes différentes matières pour cibler tes révisions prioritaires
          </p>

          {folderStats.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Aucun dossier créé dans ta bibliothèque.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {folderStats.map(f => (
                <div key={f.id} className="folder-item-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: f.color || 'var(--accent-primary)' }} />
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{f.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({f.courseCount} cours)</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ flex: 1, height: '7px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          width: `${f.avgScore}%`, 
                          backgroundColor: f.avgScore >= 70 ? 'var(--success)' : f.avgScore >= 50 ? '#f59e0b' : 'var(--accent-primary)',
                          borderRadius: '999px' 
                        }} 
                      />
                    </div>
                    <span style={{ minWidth: '45px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {f.avgScore}%
                    </span>
                  </div>

                  <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {f.hours > 0 ? `${f.hours}h ${f.minutes}m` : `${f.minutes} min`} passées
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. Tab 3: Annales Overview */}
      {activeTab === 'annales' && (
        <div className="analytics-card">
          <h3 className="analytics-card-title">
            <Trophy size={18} className="text-accent" />
            Suivi des Épreuves d'Annales
          </h3>
          <p style={{ margin: '0.2rem 0 1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Résultats obtenus sur les sujets de concours et examens blancs officiels
          </p>

          {metrics.annaleGrades.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Aucune annale passée pour l'instant. Importe un sujet d'examen officiel pour tester ton niveau en conditions réelles !
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {metrics.annaleGrades.map(g => {
                const pct = g.total > 0 ? Math.round((g.score / g.total) * 100) : 0;
                return (
                  <div key={g.id} className="folder-item-row" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Trophy size={15} style={{ color: '#fbbf24' }} />
                      <strong style={{ color: 'var(--text-primary)' }}>{g.courseName.replace(/^🎓\s*/, '')}</strong>
                    </div>

                    <div>
                      <span style={{ 
                        display: 'inline-block',
                        padding: '0.25rem 0.6rem', 
                        borderRadius: 'var(--radius-sm)', 
                        fontSize: '0.82rem', 
                        fontWeight: 700,
                        backgroundColor: pct >= 70 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(225, 29, 72, 0.15)',
                        color: pct >= 70 ? '#4ade80' : '#fb7185'
                      }}>
                        {g.score} / {g.total} ({pct}%)
                      </span>
                    </div>

                    <div style={{ textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {format(new Date(g.date), 'dd MMMM yyyy', { locale: fr })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 7. Tab 4: Full History List */}
      {activeTab === 'history' && (
        <div className="analytics-card">
          <h3 className="analytics-card-title">
            <Calendar size={18} className="text-accent" />
            Historique de Tous les Examens & QCM
          </h3>

          {mcqGrades.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Aucun examen dans l'historique.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {mcqGrades.map(grade => {
                const pct = grade.total > 0 ? Math.round((grade.score / grade.total) * 100) : 0;
                return (
                  <div 
                    key={grade.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '0.85rem 1rem', 
                      borderRadius: 'var(--radius-md)', 
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        {grade.courseName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {format(new Date(grade.date), 'dd/MM/yyyy à HH:mm')}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ 
                        fontSize: '0.88rem', 
                        fontWeight: 700, 
                        color: pct >= 60 ? 'var(--success)' : 'var(--accent-primary)' 
                      }}>
                        {grade.score} / {grade.total} ({pct}%)
                      </span>
                      <button 
                        onClick={(e) => handleDeleteGrade(grade.id, e)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}
                        title="Supprimer de l'historique"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
