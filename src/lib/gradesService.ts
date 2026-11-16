import { supabase } from './supabase';
import { getSyncCachedCourseData } from './courseDataCache';
import type { FileNode } from '../hooks/useFileSystem';

export interface GradeRecord {
  id: string;
  courseId: string;
  courseName: string;
  score: number;
  total: number;
  date: string;
  mcqs?: any[];
  selectedAnswers?: Record<string, any>;
}

const LOCAL_GRADES_KEY = 'aura_mcq_grades';

/**
 * Strip heavy base64 data URLs from mcqs before saving to localStorage
 * so we never hit QuotaExceededError on anatomy schemas / image-heavy annales.
 */
export function stripHeavyImagesFromMcqs(mcqs: any[] | undefined): any[] | undefined {
  if (!Array.isArray(mcqs)) return mcqs;
  return mcqs.map(q => {
    if (!q || typeof q !== 'object') return q;
    const copy = { ...q };
    if (typeof copy.image === 'string' && copy.image.startsWith('data:')) {
      delete copy.image;
    }
    if (Array.isArray(copy.images)) {
      const filtered = copy.images.filter((img: any) => typeof img === 'string' && !img.startsWith('data:'));
      if (filtered.length > 0) {
        copy.images = filtered;
      } else {
        delete copy.images;
      }
    }
    return copy;
  });
}

export function getLocalGrades(): GradeRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_GRADES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeGradeRecord) : [];
  } catch {
    return [];
  }
}

export function saveLocalGrades(grades: GradeRecord[]): void {
  const lightGrades = grades.map(g => ({
    ...g,
    mcqs: stripHeavyImagesFromMcqs(g.mcqs)
  }));
  try {
    localStorage.setItem(LOCAL_GRADES_KEY, JSON.stringify(lightGrades));
  } catch {
    // Last-resort fallback: keep latest 50 grades without mcqs payload so grades list never fails
    try {
      const ultraLight = lightGrades.slice(0, 50).map(({ mcqs, ...rest }) => rest);
      localStorage.setItem(LOCAL_GRADES_KEY, JSON.stringify(ultraLight));
    } catch (innerErr) {
      console.warn('Unable to persist grades to localStorage:', innerErr);
    }
  }
}

export function normalizeGradeRecord(raw: any): GradeRecord {
  const selectedAnswers = raw.selectedAnswers ?? raw.selected_answers ?? {};
  const meta = selectedAnswers?.__meta;
  const exactScore = typeof meta?.exactScore === 'number' ? meta.exactScore : Number(raw.score ?? 0);
  const exactTotal = typeof meta?.total === 'number' ? meta.total : Number(raw.total ?? 0);

  return {
    id: raw.id,
    courseId: raw.courseId ?? raw.course_id,
    courseName: raw.courseName ?? raw.course_name ?? 'Cours',
    score: Math.round(exactScore * 10) / 10,
    total: exactTotal,
    date: raw.date || new Date().toISOString(),
    mcqs: raw.mcqs,
    selectedAnswers
  };
}

/**
 * Upsert a grade to Supabase with automatic integer-column fallback.
 * If Postgres rejects a decimal score (22P02 when `score` column is still `integer`),
 * we retry with `Math.round(score)` while preserving exact decimal score in `selected_answers.__meta.exactScore`.
 */
export async function syncGradeToSupabase(userId: string, grade: GradeRecord, isUpdate = false): Promise<boolean> {
  const selectedWithMeta = {
    ...(grade.selectedAnswers || {}),
    __meta: {
      ...(grade.selectedAnswers?.__meta || {}),
      exactScore: grade.score,
      total: grade.total
    }
  };

  const payload = {
    id: grade.id,
    user_id: userId,
    course_id: grade.courseId,
    course_name: grade.courseName,
    score: grade.score,
    total: Math.round(grade.total),
    date: grade.date,
    mcqs: stripHeavyImagesFromMcqs(grade.mcqs) || [],
    selected_answers: selectedWithMeta
  };

  const executeWrite = async (row: any) => {
    if (isUpdate) {
      return supabase.from('mcq_grades').upsert([row], { onConflict: 'id' });
    }
    return supabase.from('mcq_grades').upsert([row], { onConflict: 'id' });
  };

  const { error } = await executeWrite(payload);
  if (!error) return true;

  // Fallback if `score` column in Supabase is still `integer` (rejects floats like 14.5)
  const msg = (error.message || '').toLowerCase();
  if (error.code === '22P02' || msg.includes('integer') || msg.includes('invalid input syntax')) {
    const intPayload = {
      ...payload,
      score: Math.round(grade.score)
    };
    const { error: retryError } = await executeWrite(intPayload);
    if (!retryError) return true;
    console.error('Supabase mcq_grades retry failed:', retryError);
    return false;
  }

  console.error('Supabase mcq_grades sync failed:', error);
  return false;
}

export async function upsertGradeEverywhere(grade: GradeRecord, userId?: string): Promise<void> {
  const existing = getLocalGrades();
  const idx = existing.findIndex(g => g.id === grade.id);
  if (idx >= 0) {
    existing[idx] = grade;
  } else {
    existing.unshift(grade);
  }
  saveLocalGrades(existing);

  if (userId) {
    await syncGradeToSupabase(userId, grade, idx >= 0);
  }
}

// --- Scoring helpers shared between InteractiveMCQ & Retroactive Recovery ---

const getCorrectAnswers = (q: any): string[] => {
  const raw = q?.correctAnswers ?? q?.correct_answers ?? q?.correctAnswer ?? q?.correct_answer ?? q?.responses ?? q?.answers ?? [];
  if (Array.isArray(raw)) return raw.map(v => v?.toString() || '');
  if (raw === null || raw === undefined) return [];
  return [raw.toString()];
};

const normalizeStr = (s: string) =>
  s.toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

const isCorrectOption = (correctOpts: string[], option: string, oIndex: number) => {
  const normalizedOption = normalizeStr(option);
  const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
  const isZeroBased = correctOpts.some(c => c?.toString().trim() === '0');

  return correctOpts.some(c => {
    if (c === null || c === undefined) return false;
    const cStr = c.toString().trim();
    const normalizedC = normalizeStr(cStr);
    if (normalizedC !== '' && normalizedC === normalizedOption) return true;
    if (/^\d+$/.test(cStr)) {
      const val = parseInt(cStr, 10);
      if (isZeroBased ? val === oIndex : val === oIndex) return true;
    }
    if (normalizedC.length === 1 && normalizedC === letters[oIndex]) return true;
    return false;
  });
};

export function isLabelingQuestionItem(q: any): boolean {
  if (!q) return false;
  if (q.type === 'labeling') return true;
  if (q.type === 'open') return false;
  const hasImage = Boolean(q.image || (q.images && q.images.length > 0));
  const noOptions = !q.options || q.options.length === 0;
  const hasItems = Boolean(q.itemsToPlace && q.itemsToPlace.length > 0);
  const mentionsPointing = /(?:placer|pointer|rep[eé]rer|positionner|localiser|l[eé]gender|fl[eé]cher|annoter|identifier sur)/i.test(q.question || '');
  return hasItems || (hasImage && noOptions && mentionsPointing);
}

export function isOpenQuestionItem(q: any): boolean {
  if (!q) return false;
  if (isLabelingQuestionItem(q)) return false;
  return q.type === 'open' || !q.options || q.options.length === 0;
}

export function computeExamScore(
  mcqs: any[],
  selectedAnswers: Record<number, string[]>,
  openEvaluations: Record<number, any> = {},
  labelingEvaluations: Record<number, any> = {},
  manualLabelingScores: Record<number, number> = {}
): { score: number; total: number; qcmCount: number; openCount: number; labelingCount: number } {
  let rawScore = 0;
  let qcmCount = 0;
  let openCount = 0;
  let labelingCount = 0;

  mcqs.forEach((q, idx) => {
    if (isLabelingQuestionItem(q)) {
      labelingCount++;
      if (manualLabelingScores[idx] !== undefined) {
        rawScore += Number(manualLabelingScores[idx]) || 0;
      } else if (labelingEvaluations[idx]) {
        const ev = labelingEvaluations[idx];
        const ratio = ev.maxGrade > 0 ? (ev.grade / ev.maxGrade) : ((ev.scorePercentage || 0) / 100);
        rawScore += Math.max(0, Math.min(1, ratio));
      }
    } else if (isOpenQuestionItem(q)) {
      openCount++;
      if (openEvaluations[idx]) {
        const ev = openEvaluations[idx];
        const ratio = ev.maxGrade > 0 ? (ev.grade / ev.maxGrade) : ((ev.scorePercentage || 0) / 100);
        rawScore += Math.max(0, Math.min(1, ratio));
      }
    } else {
      qcmCount++;
      const selected = selectedAnswers[idx] || [];
      const correctOpts = getCorrectAnswers(q);
      let errors = 0;
      (q.options || []).forEach((opt: string, oIndex: number) => {
        const isSelected = selected.includes(opt);
        const isCorrect = isCorrectOption(correctOpts, opt, oIndex);
        if (isSelected !== isCorrect) errors++;
      });
      if (errors === 0) rawScore += 1;
      else if (errors === 1) rawScore += 0.5;
      else if (errors === 2) rawScore += 0.2;
    }
  });

  const total = mcqs.length;
  const score = Math.round(rawScore * 10) / 10;
  return { score, total, qcmCount, openCount, labelingCount };
}

function parseMcqsFromGenerations(gen: any): any[] {
  if (!gen) return [];
  try {
    if (Array.isArray(gen.questions) && gen.questions.length > 0) return gen.questions;
    const raw = gen.mcq;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      let jsonStr = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
      const firstBrace = jsonStr.indexOf('{');
      const firstBracket = jsonStr.indexOf('[');
      if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        const lastBrace = jsonStr.lastIndexOf('}');
        if (lastBrace > firstBrace) jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
      } else if (firstBracket !== -1) {
        const lastBracket = jsonStr.lastIndexOf(']');
        if (lastBracket > firstBracket) jsonStr = jsonStr.substring(firstBracket, lastBracket + 1);
      }
      const parsed = JSON.parse(jsonStr.replace(/,\s*([\]}])/g, '$1'));
      if (Array.isArray(parsed)) return parsed;
      return parsed?.questions || parsed?.mcqs || parsed?.data || [];
    }
    if (typeof raw === 'object') {
      return raw.questions || raw.mcqs || [];
    }
  } catch {}
  return [];
}

/**
 * Retroactively recover any completed QCM/Annale stored in localStorage (`aura_mcq_results_<courseId> === 'true'`)
 * that failed to save to `mcq_grades` previously (e.g. due to integer column or QuotaExceededError or qcmCount === 0).
 */
export async function recoverMissingGrades(
  existingGrades: GradeRecord[],
  nodes: FileNode[],
  userId?: string
): Promise<GradeRecord[]> {
  const existingCourseIds = new Set(existingGrades.map(g => g.courseId));
  const missingCourseIds: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('aura_mcq_results_')) {
      const val = localStorage.getItem(key);
      if (val === 'true') {
        const cId = key.replace('aura_mcq_results_', '');
        if (cId && !existingCourseIds.has(cId)) {
          missingCourseIds.push(cId);
        }
      }
    }
  }

  if (missingCourseIds.length === 0) return [];

  // Fetch missing course_data from Supabase in one batch if authenticated
  const cloudGenMap = new Map<string, any>();
  if (userId) {
    try {
      const { data } = await supabase
        .from('course_data')
        .select('course_id, generations')
        .in('course_id', missingCourseIds);
      if (data) {
        data.forEach((row: any) => {
          cloudGenMap.set(row.course_id, row.generations);
        });
      }
    } catch {}
  }

  const recovered: GradeRecord[] = [];

  for (const cId of missingCourseIds) {
    try {
      let gen = cloudGenMap.get(cId) || getSyncCachedCourseData(cId)?.generations;
      if (!gen) {
        const localSubject = localStorage.getItem(`aura_subject_${cId}`);
        if (localSubject) {
          gen = JSON.parse(localSubject)?.generations;
        }
      }

      const mcqs = parseMcqsFromGenerations(gen);
      if (!mcqs || mcqs.length === 0) continue;

      const selectedAnswers = JSON.parse(localStorage.getItem(`aura_mcq_answers_${cId}`) || '{}');
      const openEvaluations = JSON.parse(localStorage.getItem(`aura_mcq_open_evals_${cId}`) || '{}');
      const labelingEvaluations = JSON.parse(localStorage.getItem(`aura_mcq_label_evals_${cId}`) || '{}');
      const manualLabelingScores = JSON.parse(localStorage.getItem(`aura_mcq_label_scores_${cId}`) || '{}');

      const { score, total } = computeExamScore(
        mcqs,
        selectedAnswers,
        openEvaluations,
        labelingEvaluations,
        manualLabelingScores
      );

      if (total <= 0) continue;

      const node = nodes.find(n => n.id === cId);
      const isAnnale = Boolean(gen?.is_annale) || Boolean(node?.name.startsWith('🎓')) || Boolean(node?.name.toLowerCase().includes('annale'));
      const courseName = node?.name || (isAnnale ? '🎓 Annale récupérée' : 'Examen récupéré');

      const grade: GradeRecord = {
        id: crypto.randomUUID(),
        courseId: cId,
        courseName,
        score,
        total,
        date: new Date().toISOString(),
        mcqs: stripHeavyImagesFromMcqs(mcqs),
        selectedAnswers: {
          ...selectedAnswers,
          __meta: {
            exactScore: score,
            total,
            isAnnale,
            recovered: true
          }
        }
      };

      await upsertGradeEverywhere(grade, userId);
      recovered.push(grade);
    } catch (err) {
      console.warn(`Failed to recover grade for course ${cId}:`, err);
    }
  }

  return recovered;
}

