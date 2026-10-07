/**
 * Algorithme de répétition espacée Anki SM-2 pour Sof.IA
 * 
 * Fonctionne à 100% en local / déterministe (0 token d'IA, 0 coût).
 * Conforme au modèle de mémoire d'Ebbinghaus et de l'algorithme Anki.
 */

export type CardRating = 1 | 2 | 3 | 4;
// 1 = À revoir (Again)
// 2 = Difficile (Hard)
// 3 = Correct (Good)
// 4 = Facile (Easy)

export type CardState = 'new' | 'learning' | 'review' | 'relearning';

export interface SpacedCardData {
  state?: CardState;
  step?: number;         // 0: 1 min, 1: 10 min
  interval?: number;     // En jours
  easeFactor?: number;   // Facteur de facilité (défaut: 2.5, min: 1.3)
  repetitions?: number;  // Nombre de révisions réussies consécutives
  dueDate?: string;      // ISO string
  lapses?: number;       // Nombre d'échecs (oubliés)
  lastReviewed?: string; // ISO string
}

export interface RatingPreview {
  label: string;         // Ex: "< 1 min", "10 min", "1 j", "4 j"
  description: string;   // Ex: "À revoir", "Difficile", "Correct", "Facile"
  rating: CardRating;
  shortcut: string;      // "1", "2", "3", "4"
}

export interface SchedulePreviews {
  again: RatingPreview;
  hard: RatingPreview;
  good: RatingPreview;
  easy: RatingPreview;
}

const DEFAULT_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;

/**
 * Formate une durée en minutes ou en jours pour affichage sur les boutons.
 */
export function formatIntervalPreview(days: number, minutes?: number): string {
  if (minutes !== undefined && minutes < 60) {
    if (minutes <= 1) return '< 1 min';
    return `${Math.round(minutes)} min`;
  }

  if (days < 1) {
    const mins = Math.max(1, Math.round(days * 24 * 60));
    if (mins < 60) return `${mins} min`;
    const hours = Math.round(mins / 60);
    return `${hours} h`;
  }

  const roundedDays = Math.round(days);
  if (roundedDays === 1) return '1 j';
  if (roundedDays < 30) return `${roundedDays} j`;
  if (roundedDays < 365) {
    const months = (roundedDays / 30).toFixed(1).replace('.0', '');
    return `${months} mois`;
  }
  const years = (roundedDays / 365).toFixed(1).replace('.0', '');
  return `${years} an`;
}

/**
 * Vérifie si une carte doit être révisée maintenant.
 * Une nouvelle carte sans `dueDate` est toujours due.
 */
export function isCardDue(card: SpacedCardData, now: Date = new Date()): boolean {
  if (!card.dueDate) return true;
  return new Date(card.dueDate).getTime() <= now.getTime();
}

/**
 * Calcule l'échéance et les nouvelles propriétés SM-2 d'une carte selon la note attribuée.
 */
export function calculateNextSchedule(
  card: SpacedCardData,
  rating: CardRating,
  now: Date = new Date()
): Required<SpacedCardData> {
  const state: CardState = card.state || 'new';
  const step = card.step ?? 0;
  const currentInterval = card.interval ?? 0;
  const currentEF = Math.max(MIN_EASE_FACTOR, card.easeFactor ?? DEFAULT_EASE_FACTOR);
  const repetitions = card.repetitions ?? 0;
  const lapses = card.lapses ?? 0;

  let nextState: CardState = state;
  let nextStep = step;
  let nextInterval = currentInterval;
  let nextEF = currentEF;
  let nextRepetitions = repetitions;
  let nextLapses = lapses;
  let dueDateMs = now.getTime();

  // 1. Phase NOUVELLE ou APPRENTISSAGE (Learning)
  if (state === 'new' || state === 'learning') {
    nextState = 'learning';

    switch (rating) {
      case 1: // Again (< 1 min)
        nextStep = 0;
        dueDateMs += 1 * 60 * 1000;
        nextInterval = 1 / (24 * 60);
        break;

      case 2: // Hard (5 min)
        nextStep = 0;
        dueDateMs += 5 * 60 * 1000;
        nextInterval = 5 / (24 * 60);
        break;

      case 3: // Good
        if (step === 0) {
          // Passe à l'étape 2 (10 min)
          nextStep = 1;
          dueDateMs += 10 * 60 * 1000;
          nextInterval = 10 / (24 * 60);
        } else {
          // Diplômé en Révision ! (1 jour)
          nextState = 'review';
          nextStep = 0;
          nextInterval = 1;
          nextRepetitions = 1;
          dueDateMs += 1 * 24 * 60 * 60 * 1000;
        }
        break;

      case 4: // Easy
        // Diplômé immédiatement (4 jours)
        nextState = 'review';
        nextStep = 0;
        nextInterval = 4;
        nextRepetitions = 1;
        dueDateMs += 4 * 24 * 60 * 60 * 1000;
        break;
    }
  }

  // 2. Phase RÉAPPRENTISSAGE (Relearning après oubli en mode review)
  else if (state === 'relearning') {
    switch (rating) {
      case 1: // Again (< 10 min)
        nextStep = 0;
        dueDateMs += 10 * 60 * 1000;
        nextInterval = 10 / (24 * 60);
        break;

      case 2: // Hard (15 min)
        nextStep = 0;
        dueDateMs += 15 * 60 * 1000;
        nextInterval = 15 / (24 * 60);
        break;

      case 3: // Good (Diplôme de nouveau à 1 jour)
        nextState = 'review';
        nextStep = 0;
        nextInterval = 1;
        nextRepetitions = 1;
        dueDateMs += 1 * 24 * 60 * 60 * 1000;
        break;

      case 4: // Easy (Diplôme à 2 jours)
        nextState = 'review';
        nextStep = 0;
        nextInterval = 2;
        nextRepetitions = 1;
        dueDateMs += 2 * 24 * 60 * 60 * 1000;
        break;
    }
  }

  // 3. Phase RÉVISION (Cartes diplômées)
  else {
    switch (rating) {
      case 1: // Again : Oubli / Lapsus
        nextLapses += 1;
        nextEF = Math.max(MIN_EASE_FACTOR, currentEF - 0.20);
        nextState = 'relearning';
        nextStep = 0;
        nextRepetitions = 0;
        nextInterval = 1; // Rétrogradé
        dueDateMs += 10 * 60 * 1000; // Revient dans 10 min
        break;

      case 2: // Hard : Difficile
        nextEF = Math.max(MIN_EASE_FACTOR, currentEF - 0.15);
        nextInterval = Math.max(currentInterval + 1, Math.round(currentInterval * 1.2));
        nextRepetitions += 1;
        dueDateMs += nextInterval * 24 * 60 * 60 * 1000;
        break;

      case 3: // Good : Correct (Intervalle standard multiplié par EF)
        // EF inchangé
        nextInterval = Math.max(currentInterval + 1, Math.round(currentInterval * currentEF));
        nextRepetitions += 1;
        dueDateMs += nextInterval * 24 * 60 * 60 * 1000;
        break;

      case 4: // Easy : Facile (Bonus d'intervalle et EF augmenté)
        nextEF = currentEF + 0.15;
        const goodInt = Math.max(currentInterval + 1, Math.round(currentInterval * currentEF));
        nextInterval = Math.max(goodInt + 1, Math.round(currentInterval * currentEF * 1.3));
        nextRepetitions += 1;
        dueDateMs += nextInterval * 24 * 60 * 60 * 1000;
        break;
    }
  }

  return {
    state: nextState,
    step: nextStep,
    interval: nextInterval,
    easeFactor: Math.round(nextEF * 100) / 100,
    repetitions: nextRepetitions,
    dueDate: new Date(dueDateMs).toISOString(),
    lapses: nextLapses,
    lastReviewed: now.toISOString(),
  };
}

/**
 * Calcule à l'avance les textes des intervalles pour les 4 boutons de notation.
 */
export function getSchedulePreviews(card: SpacedCardData): SchedulePreviews {
  const state: CardState = card.state || 'new';
  const step = card.step ?? 0;
  const currentInterval = card.interval ?? 0;
  const currentEF = Math.max(MIN_EASE_FACTOR, card.easeFactor ?? DEFAULT_EASE_FACTOR);

  let againLabel = '< 1 min';
  let hardLabel = '5 min';
  let goodLabel = '10 min';
  let easyLabel = '4 j';

  if (state === 'new' || state === 'learning') {
    if (step === 0) {
      againLabel = '< 1 min';
      hardLabel = '5 min';
      goodLabel = '10 min';
      easyLabel = '4 j';
    } else {
      againLabel = '< 1 min';
      hardLabel = '5 min';
      goodLabel = '1 j';
      easyLabel = '4 j';
    }
  } else if (state === 'relearning') {
    againLabel = '< 10 min';
    hardLabel = '15 min';
    goodLabel = '1 j';
    easyLabel = '2 j';
  } else {
    // Review phase
    againLabel = '< 10 min';
    const hardDays = Math.max(currentInterval + 1, Math.round(currentInterval * 1.2));
    hardLabel = formatIntervalPreview(hardDays);

    const goodDays = Math.max(currentInterval + 1, Math.round(currentInterval * currentEF));
    goodLabel = formatIntervalPreview(goodDays);

    const easyDays = Math.max(goodDays + 1, Math.round(currentInterval * currentEF * 1.3));
    easyLabel = formatIntervalPreview(easyDays);
  }

  return {
    again: {
      label: againLabel,
      description: 'À revoir',
      rating: 1,
      shortcut: '1'
    },
    hard: {
      label: hardLabel,
      description: 'Difficile',
      rating: 2,
      shortcut: '2'
    },
    good: {
      label: goodLabel,
      description: 'Correct',
      rating: 3,
      shortcut: '3'
    },
    easy: {
      label: easyLabel,
      description: 'Facile',
      rating: 4,
      shortcut: '4'
    }
  };
}
