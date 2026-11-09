import { supabase } from './supabase';

export interface CourseDataEntry {
  course_id: string;
  file_name: string | null;
  extracted_content: string | null;
  generations: any;
}

let cachedUserId: string | null = null;
let cachedCourses: CourseDataEntry[] | null = null;
let inflightPromise: Promise<CourseDataEntry[]> | null = null;

/**
 * Récupère la liste des cours (course_data) de l'utilisateur avec un cache mémoire de session.
 * Évite de re-télécharger 100 % des textes de PDF à chaque message ChatSofia ou recherche Ctrl+K.
 */
export async function getCachedAllCourseData(userId?: string, forceRefresh = false): Promise<CourseDataEntry[]> {
  if (userId && cachedUserId && cachedUserId !== userId) {
    cachedCourses = null;
    inflightPromise = null;
  }
  if (userId) {
    cachedUserId = userId;
  }

  if (!forceRefresh && cachedCourses !== null) {
    return cachedCourses;
  }

  if (!forceRefresh && inflightPromise) {
    return inflightPromise;
  }

  inflightPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('course_data')
        .select('course_id, file_name, extracted_content, generations');

      if (!error && data) {
        cachedCourses = data as CourseDataEntry[];
        return cachedCourses;
      }
      return cachedCourses || [];
    } finally {
      inflightPromise = null;
    }
  })();

  return inflightPromise;
}

/**
 * Met à jour ou insère un cours dans le cache mémoire sans avoir à re-télécharger toute la table.
 * Si le cache n'était pas encore initialisé, l'initialise pour que ce cours soit immédiatement en cache
 * pour ChatSofIA, la Recherche Globale et l'ouverture directe du cours.
 */
export function updateCachedCourseData(courseId: string, partial: Partial<CourseDataEntry>) {
  if (!cachedCourses) {
    cachedCourses = [];
  }
  const idx = cachedCourses.findIndex(c => c.course_id === courseId);
  if (idx >= 0) {
    cachedCourses[idx] = { ...cachedCourses[idx], ...partial };
  } else if (partial.extracted_content !== undefined || partial.generations !== undefined) {
    cachedCourses.push({
      course_id: courseId,
      file_name: partial.file_name ?? null,
      extracted_content: partial.extracted_content ?? null,
      generations: partial.generations ?? {},
    });
  }
}

/**
 * Supprime un ou plusieurs cours du cache mémoire.
 */
export function removeCachedCourseData(courseIds: string[]) {
  if (!cachedCourses || courseIds.length === 0) return;
  const idSet = new Set(courseIds);
  cachedCourses = cachedCourses.filter(c => !idSet.has(c.course_id));
}

/**
 * Invalide complètement le cache mémoire (ex: déconnexion ou synchronisation forcée).
 */
export function invalidateCourseDataCache() {
  cachedCourses = null;
  inflightPromise = null;
}

