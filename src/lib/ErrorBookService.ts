/**
 * ErrorBookService
 * Gère le stockage et la récupération locale/cloud des questions ratées (QCM & Flashcards)
 * Zéro token IA requis : fonctionne 100% hors-ligne et en continu.
 */

export interface ErrorQuestionItem {
  id: string; // Unique error record ID
  type: 'mcq' | 'flashcard';
  courseId: string;
  courseName: string;
  folderPath?: string[];
  question: string;
  // Pour les QCM :
  options?: string[];
  correctAnswers?: string[];
  userSelected?: string[];
  explanation?: string;
  // Pour les Flashcards :
  front?: string;
  back?: string;
  image?: string;
  // Métadonnées :
  failedAt: string; // ISO date
  failCount: number;
  lastReviewedAt?: string;
}

const STORAGE_KEY = 'sofia_error_book';

export const ErrorBookService = {
  getErrors(): ErrorQuestionItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to load error book:', e);
      return [];
    }
  },

  saveErrors(items: ErrorQuestionItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent('sofia-error-book-updated'));
    } catch (e) {
      console.error('Failed to save error book:', e);
    }
  },

  addMCQError(params: {
    courseId: string;
    courseName: string;
    question: string;
    options: string[];
    correctAnswers: string[];
    userSelected: string[];
    explanation?: string;
    folderPath?: string[];
  }): void {
    const list = this.getErrors();
    const existingIndex = list.findIndex(
      item => item.type === 'mcq' && item.courseId === params.courseId && item.question.trim() === params.question.trim()
    );

    if (existingIndex >= 0) {
      const existing = list[existingIndex];
      list[existingIndex] = {
        ...existing,
        userSelected: params.userSelected,
        options: params.options,
        correctAnswers: params.correctAnswers,
        explanation: params.explanation || existing.explanation,
        folderPath: params.folderPath || existing.folderPath,
        failedAt: new Date().toISOString(),
        failCount: (existing.failCount || 1) + 1,
      };
    } else {
      list.unshift({
        id: crypto.randomUUID(),
        type: 'mcq',
        courseId: params.courseId,
        courseName: params.courseName,
        question: params.question,
        options: params.options,
        correctAnswers: params.correctAnswers,
        userSelected: params.userSelected,
        explanation: params.explanation,
        folderPath: params.folderPath,
        failedAt: new Date().toISOString(),
        failCount: 1,
      });
    }

    this.saveErrors(list);
  },

  addFlashcardError(params: {
    courseId: string;
    courseName: string;
    front: string;
    back: string;
    image?: string;
    folderPath?: string[];
  }): void {
    const list = this.getErrors();
    const existingIndex = list.findIndex(
      item => item.type === 'flashcard' && item.courseId === params.courseId && item.front?.trim() === params.front.trim()
    );

    if (existingIndex >= 0) {
      const existing = list[existingIndex];
      list[existingIndex] = {
        ...existing,
        back: params.back,
        image: params.image || existing.image,
        folderPath: params.folderPath || existing.folderPath,
        failedAt: new Date().toISOString(),
        failCount: (existing.failCount || 1) + 1,
      };
    } else {
      list.unshift({
        id: crypto.randomUUID(),
        type: 'flashcard',
        courseId: params.courseId,
        courseName: params.courseName,
        question: params.front,
        front: params.front,
        back: params.back,
        image: params.image,
        folderPath: params.folderPath,
        failedAt: new Date().toISOString(),
        failCount: 1,
      });
    }

    this.saveErrors(list);
  },

  removeError(id: string): void {
    const list = this.getErrors().filter(item => item.id !== id);
    this.saveErrors(list);
  },

  clearErrors(): void {
    this.saveErrors([]);
  },
};

