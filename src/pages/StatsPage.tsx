import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy, Flame, Zap, Target, Clock,
  TrendingUp, Award, Folder, CheckCircle2,
  Calendar, Trash2, BarChart2, ChevronRight, ChevronDown,
  FileText, ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useFileSystem, type FileNode } from '../hooks/useFileSystem';
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

interface AnnaleGrade {
  id: string;
  folderId?: string;
  courseId?: string;
  subject: string;
  score: number;
  date: string;
  attachments?: string[];
}

interface TimeSpent {
  [courseId: string]: {
    courseName: string;
    seconds: number;
  };
}

// -------------------------------------------------------------
// Helper: MCQ Answer checking (same robust logic as before)
// -------------------------------------------------------------
const getCorrectAnswers = (q: any): string[] => {
  const raw = q.correctAnswers ?? q.correct_answers ?? q.correctAnswer ?? q.correct_answer ?? q.responses ?? q.answers ?? [];
  if (Array.isArray(raw)) return raw.map(v => v?.toString() || '');
  if (raw === null || raw === undefined) return [];
  return [raw.toString()];
};

const normalizeOption = (s: string) =>
  s.toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

const isCorrectOption = (correctOpts: string[], option: string, oIndex: number) => {
  const normalizedOption = normalizeOption(option);
  const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

  return correctOpts.some(c => {
    if (c === null || c === undefined) return false;
    const cStr = c.toString().trim();
    const normalizedC = normalizeOption(cStr);

    // Match direct
    if (normalizedC !== '' && normalizedC === normalizedOption) return true;
    // Match index (0-based ou 1-based)
    if (cStr === oIndex.toString() || cStr === (oIndex + 1).toString()) return true;
    // Match letter
    if (normalizedC === letters[oIndex]) return true;

    return false;
  });
};

const isOptionSelected = (selected: any[], option: string, oIndex: number) => {
  if (!Array.isArray(selected) || selected.length === 0) return false;
  const normalizedOption = normalizeOption(option);
  const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

  return selected.some(s => {
    if (s === null || s === undefined) return false;
    const sStr = s.toString().trim();
    const normalizedS = normalizeOption(sStr);

    if (sStr === option.trim()) return true;
    if (normalizedS !== '' && normalizedS === normalizedOption) return true;
    if (sStr === oIndex.toString() || sStr === (oIndex + 1).toString()) return true;
    if (normalizedS === letters[oIndex]) return true;

    return false;
  });
};

export default function Statistics() {
  const { nodes } = useFileSystem();
  const { profile } = useAuth();
  const { confirm } = useDialog();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<StatViewTab>('overview');
  const [mcqGrades, setMcqGrades] = useState<MCQGrade[]>([]);
  const [legacyAnnales, setLegacyAnnales] = useState<AnnaleGrade[]>([]);
  const [timeData, setTimeData] = useState<TimeSpent>({});
  const [expandedQcm, setExpandedQcm] = useState<string | null>(null);

  // 1. Data Fetching & Sync (Loads both mcq_grades, course_stats and legacy annales_grades)
  useEffect(() => {
    async function loadStats() {
      try {
        if (!profile) {
          const mcqStr = localStorage.getItem('aura_mcq_grades');
          if (mcqStr) setMcqGrades(JSON.parse(mcqStr));

          const annalesStr = localStorage.getItem('aura_annales_grades');
          if (annalesStr) setLegacyAnnales(JSON.parse(annalesStr));

          const timeStr = localStorage.getItem('aura_time_spent');
          if (timeStr) setTimeData(JSON.parse(timeStr));
          return;
        }

        const [mcqRes, statsRes, annalesRes] = await Promise.all([
          supabase.from('mcq_grades').select('*').order('date', { ascending: false }),
          supabase.from('course_stats').select('*'),
          supabase.from('annales_grades').select('*').order('date', { ascending: false })
        ]);

        // MCQ Grades (Merge Supabase + any pending local grades without duplicates)
        const local = localStorage.getItem('aura_mcq_grades');
        const localGrades: MCQGrade[] = local ? JSON.parse(local) : [];

        if (!mcqRes.error && mcqRes.data) {
          const cloudGrades: MCQGrade[] = mcqRes.data.map((m: any) => ({
            id: m.id,
            courseId: m.course_id,
            courseName: m.course_name,
            score: m.score,
            total: m.total,
            date: m.date,
            mcqs: m.mcqs,
            selectedAnswers: m.selected_answers
          }));

          const cloudIds = new Set(cloudGrades.map(g => g.id));
          const missingLocals = localGrades.filter(g => !cloudIds.has(g.id));
          const merged = [...missingLocals, ...cloudGrades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setMcqGrades(merged);
        } else {
          setMcqGrades(localGrades);
        }

        // Legacy Annales Grades (if any in Supabase or local storage)
        if (annalesRes && annalesRes.data && annalesRes.data.length > 0) {
          setLegacyAnnales(annalesRes.data.map((a: any) => ({
            id: a.id,
            folderId: a.folder_id,
            courseId: a.course_id,
            subject: a.subject,
            score: a.score,
            date: a.date,
            attachments: a.attachments
          })));
        } else {
          const localAnn = localStorage.getItem('aura_annales_grades');
          if (localAnn) setLegacyAnnales(JSON.parse(localAnn));
        }

        // Time spent
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
    const totalSeconds = Object.values(timeData).reduce((acc, curr) => acc + (curr.seconds || 0), 0);
    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);

    const totalEvaluations = mcqGrades.length + legacyAnnales.length;

    // Helper to find folder path / name
    const getFolderPath = (parentId: string | null | undefined): string => {
      if (!parentId) return '';
      const parts: string[] = [];
      let curr = nodes.find(n => n.id === parentId);
      while (curr) {
        parts.unshift(curr.name);
        curr = curr.parentId ? nodes.find(n => n.id === curr?.parentId) : undefined;
      }
      return parts.join(' / ');
    };

    // -----------------------------------------------------------
    // STRICT SEPARATION: QCM vs Annales
    // -----------------------------------------------------------
    // Annales detection:
    // 1. Either the grade's course is directly an annale node (starts with 🎓)
    // 2. Or courseName starts with 🎓 or contains "annale"
    // 3. Or the node in nodes has startsWith 🎓 or includes 'annale'
    const annaleNodeIds = new Set(
      nodes.filter(n => n.name.startsWith('🎓') || n.name.toLowerCase().includes('annale')).map(n => n.id)
    );

    const isGradeAnnale = (g: MCQGrade): boolean => {
      if (g.courseId && annaleNodeIds.has(g.courseId)) return true;
      if (g.courseName?.startsWith('🎓')) return true;
      if (g.courseName?.toLowerCase().includes('annale')) return true;
      const node = nodes.find(n => n.id === g.courseId);
      if (node && (node.name.startsWith('🎓') || node.name.toLowerCase().includes('annale'))) return true;
      return false;
    };

    // 1. Pure MCQ Grades ONLY (Excludes any Annale)
    const pureMcqGrades = mcqGrades.filter(g => !isGradeAnnale(g));

    // 2. Pure Annales Grades ONLY
    const annaleMcqGrades = mcqGrades.filter(g => isGradeAnnale(g)).map(g => {
      const node = nodes.find(n => n.id === g.courseId);
      const folderName = node?.parentId ? getFolderPath(node.parentId) : '';
      return {
        ...g,
        folderName,
        cleanTitle: (g.courseName || node?.name || 'Sujet d\'annale').replace(/^🎓\s*/, '')
      };
    });

    const totalAnnalesCount = annaleMcqGrades.length + legacyAnnales.length;

    const totalQuestions = mcqGrades.reduce((acc, curr) => acc + (curr.total || 0), 0);
    const totalCorrect = mcqGrades.reduce((acc, curr) => acc + (curr.score || 0), 0);
    const successRate = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    // Gamification XP
    const studyXp = Math.floor(totalSeconds / 60) * 10;
    const qcmXp = totalCorrect * 25;
    const evalXp = totalEvaluations * 100;
    const totalXp = studyXp + qcmXp + evalXp;

    // Level curve
    const level = Math.floor(Math.sqrt(totalXp / 250)) + 1;
    const currentLevelBaseXp = Math.pow(level - 1, 2) * 250;
    const nextLevelBaseXp = Math.pow(level, 2) * 250;
    const levelXpProgress = totalXp - currentLevelBaseXp;
    const levelXpRequired = nextLevelBaseXp - currentLevelBaseXp;
    const progressPercent = Math.min(100, Math.round((levelXpProgress / Math.max(1, levelXpRequired)) * 100));

    const getLevelTitle = (lvl: number) => {
      if (lvl >= 15) return 'Légende Académique 👑';
      if (lvl >= 10) return 'Major de Promotion 🏆';
      if (lvl >= 7) return 'Grand Admissible 🎓';
      if (lvl >= 5) return 'Praticien Confirmé ⚡';
      if (lvl >= 3) return 'Étudiant Assidu 📚';
      return 'Apprenti Motivé 🌟';
    };

    // Calculate Streak (Consecutive Days)
    const allGradeDates = [
      ...mcqGrades.map(g => g.date.split('T')[0]),
      ...legacyAnnales.map(a => a.date.split('T')[0])
    ];
    const uniqueDates = Array.from(new Set(allGradeDates)).sort().reverse();
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
      pureMcqGrades,
      annaleGrades: annaleMcqGrades,
      totalAnnalesCount,
      totalQuestions,
      totalCorrect,
      successRate,
      totalXp,
      level,
      levelTitle: getLevelTitle(level),
      progressPercent,
      streak: Math.max(streak, totalSeconds > 60 ? 1 : 0)
    };
  }, [mcqGrades, legacyAnnales, timeData]);

  // 3. Chronological Progression Curve Data
  const chartPoints = useMemo(() => {
    if (mcqGrades.length === 0) return [];
    const sorted = [...mcqGrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Take last 15 tests
    const recent = sorted.slice(-15);
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

  // 4. Delete handlers
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

  const handleDeleteLegacyAnnale = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (await confirm('Supprimer cette note d\'annale ?')) {
      const updated = legacyAnnales.filter(a => a.id !== id);
      setLegacyAnnales(updated);
      localStorage.setItem('aura_annales_grades', JSON.stringify(updated));
      if (profile) {
        await supabase.from('annales_grades').delete().eq('id', id);
      }
    }
  };

  const handleOpenCourse = (courseId: string, courseName?: string) => {
    if (!courseId || courseId === 'deleted') return;
    if (courseName?.startsWith('🎓')) {
      navigate(`/annale/${courseId}`);
    } else {
      navigate(`/subject/${courseId}`);
    }
  };

  // 5. Rich Badges List
  const badges = [
    {
      id: 'first_step',
      title: 'Premier Déclic',
      desc: 'Terminer sa première série de QCM',
      icon: '⚡',
      unlocked: metrics.totalEvaluations >= 1,
      progress: `${Math.min(1, metrics.totalEvaluations)}/1`
    },
    {
      id: 'streak_3',
      title: 'Régularité de Bronze',
      desc: 'Maintenir 3 jours consécutifs de révision',
      icon: '🔥',
      unlocked: metrics.streak >= 3,
      progress: `${Math.min(3, metrics.streak)}/3 j`
    },
    {
      id: 'streak_7',
      title: 'Série de Feu',
      desc: '7 jours de série ininterrompue',
      icon: '💥',
      unlocked: metrics.streak >= 7,
      progress: `${Math.min(7, metrics.streak)}/7 j`
    },
    {
      id: 'qcm_25',
      title: 'Apprenti Tireur',
      desc: 'Valider 25 questions avec succès',
      icon: '🎯',
      unlocked: metrics.totalCorrect >= 25,
      progress: `${Math.min(25, metrics.totalCorrect)}/25`
    },
    {
      id: 'qcm_100',
      title: 'Centurion des QCM',
      desc: 'Valider 100 questions avec succès',
      icon: '💯',
      unlocked: metrics.totalCorrect >= 100,
      progress: `${Math.min(100, metrics.totalCorrect)}/100`
    },
    {
      id: 'qcm_300',
      title: 'Maître des QCM',
      desc: 'Valider 300 questions avec succès',
      icon: '⚔️',
      unlocked: metrics.totalCorrect >= 300,
      progress: `${Math.min(300, metrics.totalCorrect)}/300`
    },
    {
      id: 'annale_1',
      title: 'Baptême du Concours',
      desc: 'Passer une première épreuve d\'annale',
      icon: '🎓',
      unlocked: metrics.totalAnnalesCount >= 1,
      progress: `${Math.min(1, metrics.totalAnnalesCount)}/1`
    },
    {
      id: 'annale_5',
      title: 'Major du Concours',
      desc: 'Résoudre au moins 5 annales officielles',
      icon: '🏛️',
      unlocked: metrics.totalAnnalesCount >= 5,
      progress: `${Math.min(5, metrics.totalAnnalesCount)}/5`
    },
    {
      id: 'time_2h',
      title: 'Éveil de Concentration',
      desc: 'Cumuler 2 heures d\'étude active',
      icon: '⏱️',
      unlocked: metrics.totalHours >= 2,
      progress: `${Math.min(2, metrics.totalHours)}/2 h`
    },
    {
      id: 'time_10h',
      title: 'Endurance Ultime',
      desc: 'Cumuler plus de 10 heures d\'étude active',
      icon: '⏳',
      unlocked: metrics.totalHours >= 10,
      progress: `${Math.min(10, metrics.totalHours)}/10 h`
    },
    {
      id: 'perfect_score',
      title: 'Sans Faute Impérial',
      desc: 'Obtenir 100% à un examen d\'au moins 5 questions',
      icon: '🌟',
      unlocked: mcqGrades.some(g => g.total >= 5 && g.score === g.total),
      progress: mcqGrades.some(g => g.total >= 5 && g.score === g.total) ? '1/1' : '0/1'
    },
    {
      id: 'level_5',
      title: 'Praticien Confirmé',
      desc: 'Atteindre le Niveau 5 dans Sofia',
      icon: '🛡️',
      unlocked: metrics.level >= 5,
      progress: `Niv. ${Math.min(5, metrics.level)}/5`
    }
  ];

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
          <div className="kpi-value">{metrics.totalAnnalesCount}</div>
          <div className="kpi-sub">
            <span>Sujets de concours préparés</span>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
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
            <Folder size={14} /> Par Dossier & Matière
          </button>
          <button
            className={`shadcn-tab-btn ${activeTab === 'annales' ? 'active' : ''}`}
            onClick={() => setActiveTab('annales')}
          >
            <Trophy size={14} /> Annales & Concours
          </button>
          <button
            className={`shadcn-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <Calendar size={14} /> Historique Détaillé
          </button>
        </div>
      </div>

      {/* 4. Tab 1: Overview (Harmonious Curve + Badges) */}
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
                  Évolution de ton taux de réussite au fil des entraînements
                </p>
              </div>
            </div>

            {chartPoints.length < 2 ? (
              <div style={{ height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '0.5rem' }}>
                <BarChart2 size={32} style={{ opacity: 0.4 }} />
                <span>Réalise au moins 2 séries de QCM ou annales pour générer ta courbe de tendance.</span>
              </div>
            ) : (
              <div className="chart-container">
                {/* SVG using viewBox with preserveAspectRatio="xMidYMid meet" so it doesn't get steamrolled */}
                <svg className="chart-svg" viewBox="0 0 760 280">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.32" />
                      <stop offset="85%" stopColor="var(--accent-primary)" stopOpacity="0.04" />
                      <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  <line x1="45" y1="35" x2="735" y2="35" className="chart-grid-line" />
                  <line x1="45" y1="90" x2="735" y2="90" className="chart-grid-line" />
                  <line x1="45" y1="145" x2="735" y2="145" className="chart-grid-line" />
                  <line x1="45" y1="200" x2="735" y2="200" className="chart-grid-line" />

                  {/* Axis labels */}
                  <text x="12" y="39" className="chart-axis-label">100%</text>
                  <text x="12" y="94" className="chart-axis-label">75%</text>
                  <text x="12" y="149" className="chart-axis-label">50%</text>
                  <text x="12" y="204" className="chart-axis-label">0%</text>

                  {/* SVG Coordinates generation */}
                  {(() => {
                    const width = 670;
                    const height = 165;
                    const topOffset = 35;
                    const leftOffset = 55;
                    const step = width / Math.max(1, chartPoints.length - 1);

                    const pts = chartPoints.map((p, i) => {
                      const cx = leftOffset + (i * step);
                      const cy = topOffset + (height - (p.score / 100) * height);
                      return { cx, cy, ...p };
                    });

                    const pathD = pts.reduce((acc, curr, i) => {
                      if (i === 0) return `M ${curr.cx} ${curr.cy}`;
                      const prev = pts[i - 1];
                      const cp1x = prev.cx + (curr.cx - prev.cx) * 0.45;
                      const cp1y = prev.cy;
                      const cp2x = prev.cx + (curr.cx - prev.cx) * 0.55;
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
                            <circle cx={pt.cx} cy={pt.cy} r="5" className="chart-point">
                              <title>{`${pt.name} : ${pt.score}% (${pt.label})`}</title>
                            </circle>
                            <text x={pt.cx} y="235" textAnchor="middle" className="chart-axis-label">
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="analytics-card-title">
                <Award size={18} className="text-accent" />
                Badges & Trophées ({badges.filter(b => b.unlocked).length}/{badges.length} Débloqués)
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
              {badges.map(b => (
                <div key={b.id} className={`badge-achievement ${b.unlocked ? 'unlocked' : ''}`}>
                  <div className="badge-icon">{b.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{b.title}</strong>
                      <span style={{ fontSize: '0.72rem', color: b.unlocked ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600 }}>
                        {b.progress}
                      </span>
                    </div>
                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                      {b.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* 5. Tab 2: Folders Tree with Expandable Subfolders & Full Correction (QCM ONLY) */}
      {activeTab === 'folders' && (
        <div className="analytics-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 className="analytics-card-title">
                <Folder size={18} className="text-accent" />
                Dossiers d'Étude & Séances QCM Dépliables
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Séances d'entraînement QCM classées par cours et dossiers théoriques (hors épreuves d'annales).
              </p>
            </div>
          </div>

          <QcmFolderTreeRoot
            nodes={nodes}
            mcqGrades={metrics.pureMcqGrades}
            expandedQcm={expandedQcm}
            setExpandedQcm={setExpandedQcm}
            onDelete={handleDeleteGrade}
            onOpenCourse={handleOpenCourse}
          />
        </div>
      )}

      {/* 6. Tab 3: Dedicated Annales & Examens Blancs View (TREE STRUCTURE BY FOLDER) */}
      {activeTab === 'annales' && (
        <div className="analytics-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 className="analytics-card-title">
                <Trophy size={18} className="text-accent" />
                Suivi des Épreuves d'Annales & Concours Blancs
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Arborescence complète de tes épreuves d'annales classées par matière et dossier officiel.
              </p>
            </div>
            {metrics.totalAnnalesCount > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  padding: '0.3rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(225, 29, 72, 0.12)',
                  border: '1px solid rgba(225, 29, 72, 0.25)',
                  color: 'var(--accent-primary)'
                }}>
                  🎓 {metrics.totalAnnalesCount} épreuve{metrics.totalAnnalesCount > 1 ? 's' : ''} passée{metrics.totalAnnalesCount > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {metrics.totalAnnalesCount === 0 ? (
            <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                <Trophy size={28} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 0.4rem', color: 'var(--text-primary)', fontSize: '1.05rem' }}>Aucune annale passée pour l'instant</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '420px', lineHeight: 1.5 }}>
                  Rends-toi dans l'un de tes dossiers (ex: Pharmacologie, UE6...) et clique sur <strong>"Importer une annale"</strong> pour tester ton niveau en conditions réelles.
                </p>
              </div>
            </div>
          ) : (
            <AnnaleFolderTreeRoot
              nodes={nodes}
              annaleGrades={metrics.annaleGrades}
              legacyAnnales={legacyAnnales}
              expandedQcm={expandedQcm}
              setExpandedQcm={setExpandedQcm}
              onDelete={handleDeleteGrade}
              onDeleteLegacy={handleDeleteLegacyAnnale}
              onOpenCourse={handleOpenCourse}
            />
          )}
        </div>
      )}

      {/* 7. Tab 4: Full History List */}
      {activeTab === 'history' && (
        <div className="analytics-card">
          <h3 className="analytics-card-title">
            <Calendar size={18} className="text-accent" />
            Historique Global des Examens & QCM
          </h3>
          <p style={{ margin: '0.2rem 0 0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Consulte et déplie la correction complète de chaque test passé.
          </p>

          {mcqGrades.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Aucun examen dans l'historique.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {mcqGrades.map(grade => (
                <QcmGradeItem
                  key={grade.id}
                  g={grade}
                  expandedQcm={expandedQcm}
                  setExpandedQcm={setExpandedQcm}
                  onDelete={handleDeleteGrade}
                  onOpenCourse={handleOpenCourse}
                  showCourseLink={true}
                />
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

// -------------------------------------------------------------
// Component: AnnaleCardItem (Dedicated polished card for Annales & Concours)
// -------------------------------------------------------------
function AnnaleCardItem({ g, expandedQcm, setExpandedQcm, onDelete, onOpenCourse }: any) {
  const pct = g.total > 0 ? Math.round((g.score / g.total) * 100) : 0;
  const isExpanded = expandedQcm === g.id;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--bg-elevated)',
      borderRadius: 'var(--radius-lg)',
      border: isExpanded ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
      overflow: 'hidden',
      transition: 'all 0.15s ease'
    }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.15rem 1.35rem',
          cursor: g.mcqs ? 'pointer' : 'default',
          flexWrap: 'wrap',
          gap: '1rem',
          background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent'
        }}
        onClick={() => g.mcqs && setExpandedQcm(isExpanded ? null : g.id)}
      >
        <div style={{ flex: 1, minWidth: '240px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.2rem' }}>🎓</span>
            <span style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {g.cleanTitle || g.courseName}
            </span>
            {g.folderName && (
              <span style={{
                fontSize: '0.74rem',
                fontWeight: 600,
                color: 'var(--accent-primary)',
                backgroundColor: 'rgba(225, 29, 72, 0.1)',
                padding: '0.15rem 0.55rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(225, 29, 72, 0.2)'
              }}>
                📁 {g.folderName}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span>Passée le {format(new Date(g.date), 'dd MMMM yyyy à HH:mm', { locale: fr })}</span>
            {g.mcqs && (
              <>
                <span>•</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {g.mcqs.length} question{g.mcqs.length > 1 ? 's' : ''} officielle{g.mcqs.length > 1 ? 's' : ''}
                </span>
                <span>•</span>
                <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                  {isExpanded ? 'Masquer la correction ▲' : 'Voir la correction détaillée ▼'}
                </span>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }} onClick={(e) => e.stopPropagation()}>
          <div style={{
            fontSize: '1.1rem',
            fontWeight: 800,
            color: pct >= 60 ? 'var(--success)' : (pct >= 40 ? 'var(--warning)' : 'var(--danger)'),
            padding: '0.4rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            background: pct >= 60 ? 'rgba(34, 197, 94, 0.12)' : (pct >= 40 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(225, 29, 72, 0.12)'),
            border: `1px solid ${pct >= 60 ? 'rgba(34, 197, 94, 0.25)' : (pct >= 40 ? 'rgba(245, 158, 11, 0.25)' : 'rgba(225, 29, 72, 0.25)')}`,
            display: 'flex',
            alignItems: 'baseline',
            gap: '0.35rem'
          }}>
            <span>{g.score} / {g.total}</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.85 }}>({pct}%)</span>
          </div>

          {g.courseId && g.courseId !== 'deleted' && (
            <button
              onClick={() => onOpenCourse(g.courseId, g.courseName)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-md)',
                padding: '0.45rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Retourner dans cette annale"
            >
              <span>Reprendre</span>
              <ExternalLink size={13} />
            </button>
          )}

          <button
            onClick={(e) => onDelete(g.id, e)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.4rem' }}
            title="Supprimer cette note d'annale"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Expanded detailed correction view */}
      {isExpanded && g.mcqs && (
        <div style={{ padding: '1.35rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {g.mcqs.map((q: any, qIndex: number) => {
              const correctOpts = getCorrectAnswers(q);
              const selected = g.selectedAnswers?.[qIndex] || [];

              return (
                <div key={qIndex} style={{ padding: '1.1rem 1.25rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                  <h5 style={{ margin: '0 0 0.85rem', fontSize: '0.94rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                    Question {qIndex + 1} : {q.question}
                  </h5>

                  {((q.images && q.images.length > 0) || q.image) && (
                    <div style={{ margin: '0.75rem 0 1rem 0', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                      {(q.images || [q.image]).map((imgSrc: string, iIdx: number) => (
                        <div key={iIdx} style={{ borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border-color)', maxHeight: '240px', backgroundColor: 'var(--bg-primary)' }}>
                          <img src={imgSrc} alt="Illustration" style={{ maxHeight: '240px', maxWidth: '100%', objectFit: 'contain', display: 'block' }} />
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {q.options?.map((option: string, oIndex: number) => {
                      const isSelected = isOptionSelected(selected, option, oIndex);
                      const isCorrect = isCorrectOption(correctOpts, option, oIndex);

                      let bgColor = 'var(--bg-primary)';
                      let borderColor = 'var(--border-subtle)';
                      let feedbackText = '';

                      if (isCorrect && isSelected) {
                        bgColor = '#10b98120';
                        borderColor = 'var(--success)';
                        feedbackText = '✅ Bonne réponse cochée';
                      } else if (isCorrect && !isSelected) {
                        bgColor = '#f59e0b20';
                        borderColor = 'var(--warning)';
                        feedbackText = '⚠️ Réponse correcte oubliée';
                      } else if (!isCorrect && isSelected) {
                        bgColor = '#ef444420';
                        borderColor = 'var(--danger)';
                        feedbackText = '❌ Cochée par erreur';
                      }

                      return (
                        <div
                          key={oIndex}
                          style={{
                            padding: '0.65rem 0.85rem',
                            borderRadius: 'var(--radius-sm)',
                            border: `1px solid ${borderColor}`,
                            backgroundColor: bgColor,
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.65rem'
                          }}
                        >
                          <div style={{
                            width: '16px', height: '16px', flexShrink: 0,
                            border: `2px solid ${isSelected ? (!isCorrect ? 'var(--danger)' : 'var(--accent-primary)') : 'var(--text-secondary)'}`,
                            borderRadius: '3px',
                            backgroundColor: isSelected ? (!isCorrect ? 'var(--danger)' : 'var(--accent-primary)') : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {isSelected && <div style={{ width: '8px', height: '8px', backgroundColor: 'white', clipPath: 'polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%)' }} />}
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.85rem' }}>{option}</span>
                            {feedbackText && (
                              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: borderColor, marginTop: '0.2rem' }}>
                                {feedbackText}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Component: QcmGradeItem (Full expandable correction + link to course)
// -------------------------------------------------------------
function QcmGradeItem({ g, expandedQcm, setExpandedQcm, onDelete, onOpenCourse, showCourseLink }: any) {
  const pct = g.total > 0 ? Math.round((g.score / g.total) * 100) : 0;
  const isExpanded = expandedQcm === g.id;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--bg-elevated)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-color)',
      overflow: 'hidden',
      transition: 'border-color 0.15s ease'
    }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.25rem',
          cursor: g.mcqs ? 'pointer' : 'default',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
        onClick={() => g.mcqs && setExpandedQcm(isExpanded ? null : g.id)}
      >
        <div style={{ flex: 1, minWidth: '220px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {g.courseName}
            </span>
            {showCourseLink && g.courseId && g.courseId !== 'deleted' && (
              <button
                onClick={(e) => { e.stopPropagation(); onOpenCourse(g.courseId, g.courseName); }}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--accent-primary)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.2rem 0.45rem',
                  fontSize: '0.72rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  cursor: 'pointer'
                }}
                title="Ouvrir le cours associé"
              >
                <span>Accéder au cours</span>
                <ExternalLink size={11} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              {format(new Date(g.date), 'dd MMMM yyyy à HH:mm', { locale: fr })}
            </span>
            {g.mcqs && (
              <span style={{ fontSize: '0.76rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                {isExpanded ? 'Masquer la correction ▲' : 'Voir la correction détaillée ▼'}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            fontSize: '1rem',
            fontWeight: 800,
            color: pct >= 60 ? 'var(--success)' : 'var(--danger)',
            padding: '0.25rem 0.65rem',
            borderRadius: 'var(--radius-sm)',
            background: pct >= 60 ? 'rgba(34, 197, 94, 0.12)' : 'rgba(225, 29, 72, 0.12)'
          }}>
            {g.score} / {g.total} ({pct}%)
          </div>
          <button
            onClick={(e) => onDelete(g.id, e)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.35rem' }}
            title="Supprimer de l'historique"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Expanded detailed correction view */}
      {isExpanded && g.mcqs && (
        <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {g.mcqs.map((q: any, qIndex: number) => {
              const correctOpts = getCorrectAnswers(q);
              const selected = g.selectedAnswers?.[qIndex] || [];

              return (
                <div key={qIndex} style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                  <h5 style={{ margin: '0 0 0.85rem', fontSize: '0.92rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                    {qIndex + 1}. {q.question}
                  </h5>

                  {((q.images && q.images.length > 0) || q.image) && (
                    <div style={{ margin: '0.75rem 0 1rem 0', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                      {(q.images || [q.image]).map((imgSrc: string, iIdx: number) => (
                        <div key={iIdx} style={{ borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border-color)', maxHeight: '240px', backgroundColor: 'var(--bg-primary)' }}>
                          <img src={imgSrc} alt="Illustration" style={{ maxHeight: '240px', maxWidth: '100%', objectFit: 'contain', display: 'block' }} />
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {q.options.map((option: string, oIndex: number) => {
                      const isSelected = isOptionSelected(selected, option, oIndex);
                      const isCorrect = isCorrectOption(correctOpts, option, oIndex);

                      let bgColor = 'var(--bg-primary)';
                      let borderColor = 'var(--border-color)';
                      let feedbackText = '';

                      if (isCorrect && isSelected) {
                        bgColor = '#10b98120';
                        borderColor = 'var(--success)';
                        feedbackText = '✅ Bonne réponse cochée';
                      } else if (isCorrect && !isSelected) {
                        bgColor = '#f59e0b20';
                        borderColor = 'var(--warning)';
                        feedbackText = '⚠️ Réponse correcte oubliée';
                      } else if (!isCorrect && isSelected) {
                        bgColor = '#ef444420';
                        borderColor = 'var(--danger)';
                        feedbackText = '❌ Cochée par erreur';
                      }

                      return (
                        <div
                          key={oIndex}
                          style={{
                            padding: '0.65rem 0.85rem',
                            borderRadius: 'var(--radius-sm)',
                            border: `1px solid ${borderColor}`,
                            backgroundColor: bgColor,
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.65rem'
                          }}
                        >
                          <div style={{
                            width: '16px', height: '16px', flexShrink: 0,
                            border: `2px solid ${isSelected ? (!isCorrect ? 'var(--danger)' : 'var(--accent-primary)') : 'var(--text-secondary)'}`,
                            borderRadius: '3px',
                            backgroundColor: isSelected ? (!isCorrect ? 'var(--danger)' : 'var(--accent-primary)') : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {isSelected && <div style={{ width: '8px', height: '8px', backgroundColor: 'white', clipPath: 'polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%)' }} />}
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.85rem' }}>{option}</span>
                            {feedbackText && (
                              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: borderColor, marginTop: '0.2rem' }}>
                                {feedbackText}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Component: AnnaleFolderTreeRoot (Hierarchical tree structure strictly for Annales)
// -------------------------------------------------------------
function AnnaleFolderTreeRoot({ nodes, annaleGrades, legacyAnnales, expandedQcm, setExpandedQcm, onDelete, onDeleteLegacy, onOpenCourse }: any) {
  const rootNodes = nodes.filter((n: FileNode) => n.parentId === null);
  const annaleCourseIdsWithGrades = new Set(annaleGrades.map((g: any) => g.courseId));

  const hasAnnaleGrades = (nodeId: string): boolean => {
    const childs = nodes.filter((n: FileNode) => n.parentId === nodeId);
    return childs.some((c: FileNode) => c.type === 'course' ? annaleCourseIdsWithGrades.has(c.id) : hasAnnaleGrades(c.id));
  };

  const relevantRoots = rootNodes.filter((c: FileNode) => c.type === 'course' ? annaleCourseIdsWithGrades.has(c.id) : hasAnnaleGrades(c.id));
  const existingNodeIds = new Set(nodes.map((n: FileNode) => n.id));
  const detachedAnnales = annaleGrades.filter((g: any) => !existingNodeIds.has(g.courseId));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {relevantRoots.map((child: FileNode) => child.type === 'folder' ? (
        <AnnaleTreeFolder
          key={child.id}
          folder={child}
          nodes={nodes}
          annaleGrades={annaleGrades}
          expandedQcm={expandedQcm}
          setExpandedQcm={setExpandedQcm}
          onDelete={onDelete}
          onOpenCourse={onOpenCourse}
        />
      ) : (
        <AnnaleTreeCourse
          key={child.id}
          course={child}
          annaleGrades={annaleGrades.filter((g: any) => g.courseId === child.id)}
          expandedQcm={expandedQcm}
          setExpandedQcm={setExpandedQcm}
          onDelete={onDelete}
          onOpenCourse={onOpenCourse}
        />
      ))}

      {detachedAnnales.length > 0 && (
        <AnnaleTreeCourse
          key="orphan-annales"
          course={{ id: 'deleted', name: 'Épreuves d\'annales indépendantes', type: 'course' } as any}
          annaleGrades={detachedAnnales}
          expandedQcm={expandedQcm}
          setExpandedQcm={setExpandedQcm}
          onDelete={onDelete}
          onOpenCourse={onOpenCourse}
        />
      )}

      {legacyAnnales && legacyAnnales.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.5rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', padding: '0.25rem 0.5rem' }}>
            Archives Historiques ({legacyAnnales.length})
          </div>
          {legacyAnnales.map((a: any) => (
            <div
              key={a.id}
              className="hover-lift glass-panel"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.25rem',
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>🎓</span>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '0.92rem' }}>{a.subject}</strong>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Passée le {format(new Date(a.date), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: a.score >= 10 ? 'var(--success)' : 'var(--danger)',
                  padding: '0.25rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  background: a.score >= 10 ? 'rgba(34, 197, 94, 0.12)' : 'rgba(225, 29, 72, 0.12)',
                  border: `1px solid ${a.score >= 10 ? 'rgba(34, 197, 94, 0.25)' : 'rgba(225, 29, 72, 0.25)'}`
                }}>
                  {a.score} / 20
                </div>
                <button
                  onClick={(e) => onDeleteLegacy(a.id, e)}
                  className="icon-button delete-btn"
                  style={{ padding: '0.35rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  title="Supprimer cette note d'annale"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Component: AnnaleTreeFolder (Folder node strictly for Annales)
// -------------------------------------------------------------
function AnnaleTreeFolder({ folder, nodes, annaleGrades, expandedQcm, setExpandedQcm, onDelete, onOpenCourse }: any) {
  const [isOpen, setIsOpen] = useState(false); // Folded by default for clean navigation
  const children = nodes.filter((n: FileNode) => n.parentId === folder.id);
  const annaleCourseIds = new Set(annaleGrades.map((g: any) => g.courseId));

  const hasAnnaleGrades = (nodeId: string): boolean => {
    const childs = nodes.filter((n: FileNode) => n.parentId === nodeId);
    return childs.some((c: FileNode) => c.type === 'course' ? annaleCourseIds.has(c.id) : hasAnnaleGrades(c.id));
  };

  const relevantChildren = children.filter((c: FileNode) => c.type === 'course' ? annaleCourseIds.has(c.id) : hasAnnaleGrades(c.id));

  // Compute stats for this folder strictly on annales
  const computeStats = (fId: string): { totalScore: number; totalMax: number; count: number } => {
    let totalScore = 0;
    let totalMax = 0;
    let count = 0;

    const directChildren = nodes.filter((n: FileNode) => n.parentId === fId);
    directChildren.forEach((child: FileNode) => {
      if (child.type === 'course') {
        const grades = annaleGrades.filter((g: any) => g.courseId === child.id);
        grades.forEach((g: any) => {
          totalScore += g.score;
          totalMax += g.total;
          count++;
        });
      } else if (child.type === 'folder') {
        const sub = computeStats(child.id);
        totalScore += sub.totalScore;
        totalMax += sub.totalMax;
        count += sub.count;
      }
    });

    return { totalScore, totalMax, count };
  };

  const stats = useMemo(() => computeStats(folder.id), [folder.id, nodes, annaleGrades]);
  const avgPct = stats.totalMax > 0 ? Math.round((stats.totalScore / stats.totalMax) * 100) : null;

  if (relevantChildren.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.45rem' }}>
      <div
        className="hover-lift glass-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.9rem 1.25rem',
          cursor: 'pointer',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid rgba(225, 29, 72, 0.25)',
          borderRadius: 'var(--radius-md)'
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <Folder size={18} color="var(--accent-primary)" />
          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{folder.name}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>({stats.count} annale{stats.count > 1 ? 's' : ''})</span>
        </div>

        {avgPct !== null && (
          <span style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            padding: '0.2rem 0.55rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: avgPct >= 70 ? 'rgba(34, 197, 94, 0.15)' : avgPct >= 50 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(225, 29, 72, 0.15)',
            color: avgPct >= 70 ? '#4ade80' : avgPct >= 50 ? '#fbbf24' : '#fb7185'
          }}>
            Moyenne : {avgPct}%
          </span>
        )}
      </div>

      {isOpen && (
        <div style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.35rem' }}>
          {relevantChildren.map((child: FileNode) => child.type === 'folder' ? (
            <AnnaleTreeFolder
              key={child.id}
              folder={child}
              nodes={nodes}
              annaleGrades={annaleGrades}
              expandedQcm={expandedQcm}
              setExpandedQcm={setExpandedQcm}
              onDelete={onDelete}
              onOpenCourse={onOpenCourse}
            />
          ) : (
            <AnnaleTreeCourse
              key={child.id}
              course={child}
              annaleGrades={annaleGrades.filter((g: any) => g.courseId === child.id)}
              expandedQcm={expandedQcm}
              setExpandedQcm={setExpandedQcm}
              onDelete={onDelete}
              onOpenCourse={onOpenCourse}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Component: AnnaleTreeCourse (Course row for an Annale subject with its passed exam trials)
// -------------------------------------------------------------
function AnnaleTreeCourse({ course, annaleGrades, expandedQcm, setExpandedQcm, onDelete, onOpenCourse }: any) {
  const [isOpen, setIsOpen] = useState(false); // Folded by default
  const totalScore = annaleGrades.reduce((acc: number, g: any) => acc + g.score, 0);
  const totalMax = annaleGrades.reduce((acc: number, g: any) => acc + g.total, 0);
  const coursePct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : null;
  const cleanTitle = course.name.replace(/^🎓\s*/, '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.35rem' }}>
      <div
        className="hover-lift glass-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 1.15rem',
          cursor: 'pointer',
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid rgba(225, 29, 72, 0.3)',
          borderRadius: 'var(--radius-md)'
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <span style={{ fontSize: '1.15rem' }}>🎓</span>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
            {cleanTitle}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            ({annaleGrades.length} tentative{annaleGrades.length > 1 ? 's' : ''})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {coursePct !== null && (
            <span style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              padding: '0.2rem 0.55rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: coursePct >= 70 ? 'rgba(34, 197, 94, 0.15)' : coursePct >= 50 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(225, 29, 72, 0.15)',
              color: coursePct >= 70 ? '#4ade80' : coursePct >= 50 ? '#fbbf24' : '#fb7185'
            }}>
              Moyenne : {coursePct}%
            </span>
          )}

          {course.id !== 'deleted' && (
            <button
              onClick={(e) => { e.stopPropagation(); onOpenCourse(course.id, course.name); }}
              style={{
                background: 'rgba(225, 29, 72, 0.12)',
                border: '1px solid rgba(225, 29, 72, 0.25)',
                color: 'var(--accent-primary)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.25rem 0.6rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                cursor: 'pointer'
              }}
              title="Ouvrir le sujet d'annale officiel"
            >
              <span>Ouvrir l'annale</span>
              <ExternalLink size={12} />
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <div style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.25rem' }}>
          {annaleGrades.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((g: any) => (
            <AnnaleCardItem
              key={g.id}
              g={g}
              expandedQcm={expandedQcm}
              setExpandedQcm={setExpandedQcm}
              onDelete={onDelete}
              onOpenCourse={onOpenCourse}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Component: QcmFolderTreeRoot (Hierarchical recursive folder tree with calculated average scores)
// -------------------------------------------------------------
function QcmFolderTreeRoot({ nodes, mcqGrades, expandedQcm, setExpandedQcm, onDelete, onOpenCourse }: any) {
  const rootNodes = nodes.filter((n: FileNode) => n.parentId === null);
  const courseIdsWithGrades = new Set(mcqGrades.map((g: any) => g.courseId));

  const hasGrades = (nodeId: string): boolean => {
    const childs = nodes.filter((n: FileNode) => n.parentId === nodeId);
    return childs.some((c: FileNode) => c.type === 'course' ? courseIdsWithGrades.has(c.id) : hasGrades(c.id));
  };

  const relevantRoots = rootNodes.filter((c: FileNode) => c.type === 'course' ? courseIdsWithGrades.has(c.id) : hasGrades(c.id));
  const existingCourseIds = new Set(nodes.filter((n: FileNode) => n.type === 'course').map((n: FileNode) => n.id));
  const detachedGrades = mcqGrades.filter((g: any) => !existingCourseIds.has(g.courseId));

  if (relevantRoots.length === 0 && detachedGrades.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Aucun QCM complété dans tes dossiers pour le moment.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {relevantRoots.map((child: FileNode) => child.type === 'folder' ? (
        <QcmTreeFolder
          key={child.id}
          folder={child}
          nodes={nodes}
          mcqGrades={mcqGrades}
          expandedQcm={expandedQcm}
          setExpandedQcm={setExpandedQcm}
          onDelete={onDelete}
          onOpenCourse={onOpenCourse}
        />
      ) : (
        <QcmTreeCourse
          key={child.id}
          course={child}
          mcqGrades={mcqGrades.filter((g: any) => g.courseId === child.id)}
          expandedQcm={expandedQcm}
          setExpandedQcm={setExpandedQcm}
          onDelete={onDelete}
          onOpenCourse={onOpenCourse}
        />
      ))}

      {detachedGrades.length > 0 && (
        <QcmTreeCourse
          key="deleted-courses"
          course={{ id: 'deleted', name: 'Cours ou Examens Orphelins', type: 'course' } as any}
          mcqGrades={detachedGrades}
          expandedQcm={expandedQcm}
          setExpandedQcm={setExpandedQcm}
          onDelete={onDelete}
          onOpenCourse={onOpenCourse}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Component: QcmTreeFolder (Recursive folder with % average badge)
// -------------------------------------------------------------
function QcmTreeFolder({ folder, nodes, mcqGrades, expandedQcm, setExpandedQcm, onDelete, onOpenCourse }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const children = nodes.filter((n: FileNode) => n.parentId === folder.id);
  const courseIdsWithGrades = new Set(mcqGrades.map((g: any) => g.courseId));

  const hasGrades = (nodeId: string): boolean => {
    const childs = nodes.filter((n: FileNode) => n.parentId === nodeId);
    return childs.some((c: FileNode) => c.type === 'course' ? courseIdsWithGrades.has(c.id) : hasGrades(c.id));
  };

  const relevantChildren = children.filter((c: FileNode) => c.type === 'course' ? courseIdsWithGrades.has(c.id) : hasGrades(c.id));

  // Compute recursive average score for this folder and all subfolders/courses
  const computeFolderStats = (fId: string): { totalScore: number; totalMax: number; count: number } => {
    let totalScore = 0;
    let totalMax = 0;
    let count = 0;

    const directChildren = nodes.filter((n: FileNode) => n.parentId === fId);
    directChildren.forEach((child: FileNode) => {
      if (child.type === 'course') {
        const grades = mcqGrades.filter((g: any) => g.courseId === child.id);
        grades.forEach((g: any) => {
          totalScore += g.score;
          totalMax += g.total;
          count++;
        });
      } else if (child.type === 'folder') {
        const sub = computeFolderStats(child.id);
        totalScore += sub.totalScore;
        totalMax += sub.totalMax;
        count += sub.count;
      }
    });

    return { totalScore, totalMax, count };
  };

  const stats = useMemo(() => computeFolderStats(folder.id), [folder.id, nodes, mcqGrades]);
  const avgPct = stats.totalMax > 0 ? Math.round((stats.totalScore / stats.totalMax) * 100) : null;

  if (relevantChildren.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.35rem' }}>
      <div
        className="hover-lift glass-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 1.15rem',
          cursor: 'pointer',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)'
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <Folder size={18} color={folder.color || 'var(--accent-primary)'} />
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.92rem' }}>{folder.name}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({stats.count} test{stats.count > 1 ? 's' : ''})</span>
        </div>

        {avgPct !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              padding: '0.2rem 0.55rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: avgPct >= 70 ? 'rgba(34, 197, 94, 0.15)' : avgPct >= 50 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(225, 29, 72, 0.15)',
              color: avgPct >= 70 ? '#4ade80' : avgPct >= 50 ? '#fbbf24' : '#fb7185'
            }}>
              Moyenne : {avgPct}%
            </span>
          </div>
        )}
      </div>

      {isOpen && (
        <div style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.35rem' }}>
          {relevantChildren.map((child: FileNode) => child.type === 'folder' ? (
            <QcmTreeFolder
              key={child.id}
              folder={child}
              nodes={nodes}
              mcqGrades={mcqGrades}
              expandedQcm={expandedQcm}
              setExpandedQcm={setExpandedQcm}
              onDelete={onDelete}
              onOpenCourse={onOpenCourse}
            />
          ) : (
            <QcmTreeCourse
              key={child.id}
              course={child}
              mcqGrades={mcqGrades.filter((g: any) => g.courseId === child.id)}
              expandedQcm={expandedQcm}
              setExpandedQcm={setExpandedQcm}
              onDelete={onDelete}
              onOpenCourse={onOpenCourse}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Component: QcmTreeCourse (Course row with average %, direct access button & expandable exam sessions)
// -------------------------------------------------------------
function QcmTreeCourse({ course, mcqGrades, expandedQcm, setExpandedQcm, onDelete, onOpenCourse }: any) {
  const [isOpen, setIsOpen] = useState(false);
  if (mcqGrades.length === 0) return null;

  const totalScore = mcqGrades.reduce((acc: number, g: any) => acc + g.score, 0);
  const totalMax = mcqGrades.reduce((acc: number, g: any) => acc + g.total, 0);
  const coursePct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : null;

  const isAnnale = course.name.startsWith('🎓') || course.name.toLowerCase().includes('annale');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.35rem' }}>
      <div
        className="hover-lift glass-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 1.15rem',
          cursor: 'pointer',
          backgroundColor: 'var(--bg-elevated)',
          border: isAnnale ? '1px solid rgba(225, 29, 72, 0.45)' : '1px solid var(--accent-primary)',
          borderRadius: 'var(--radius-md)'
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          {isAnnale ? (
            <span style={{ fontSize: '1.05rem' }}>🎓</span>
          ) : (
            <FileText size={18} color="var(--accent-primary)" />
          )}
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
            {course.name}
          </span>
          {isAnnale && (
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '0.1rem 0.45rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(225, 29, 72, 0.12)',
              color: 'var(--accent-primary)'
            }}>
              Annale
            </span>
          )}
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({mcqGrades.length} examen{mcqGrades.length > 1 ? 's' : ''})</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {coursePct !== null && (
            <span style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              padding: '0.2rem 0.55rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: coursePct >= 70 ? 'rgba(34, 197, 94, 0.15)' : coursePct >= 50 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(225, 29, 72, 0.15)',
              color: coursePct >= 70 ? '#4ade80' : coursePct >= 50 ? '#fbbf24' : '#fb7185'
            }}>
              Moyenne : {coursePct}%
            </span>
          )}

          {course.id !== 'deleted' && (
            <button
              onClick={(e) => { e.stopPropagation(); onOpenCourse(course.id, course.name); }}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-color)',
                color: 'var(--accent-primary)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.25rem 0.55rem',
                fontSize: '0.75rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                cursor: 'pointer'
              }}
              title="Ouvrir la page de ce cours"
            >
              <span>Accéder</span>
              <ExternalLink size={12} />
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <div style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.35rem' }}>
          {mcqGrades.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((g: any) => (
            <QcmGradeItem
              key={g.id}
              g={g}
              expandedQcm={expandedQcm}
              setExpandedQcm={setExpandedQcm}
              onDelete={onDelete}
              onOpenCourse={onOpenCourse}
              showCourseLink={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
