import { supabase } from './supabase';

export interface DemoStep {
  title: string;
  description: string;
  actionText?: string;
  tabTarget?: 'resume' | 'flashcards' | 'mcq' | 'explications';
}

export const ONBOARDING_STEPS: DemoStep[] = [
  {
    title: "Bienvenue sur SofIA 👋",
    description: "SofIA transforme n'importe quel document ou polycopié en un espace d'apprentissage interactif actif (Flashcards Anki, QCM universitaires, résumés et examens blancs d'annales).",
    actionText: "Commencer la visite (1/3)"
  },
  {
    title: "1. Le Résumé Structuré & Éditeur Visuel 📝",
    description: "Chaque cours dispose d'un résumé automatique avec détection des mots en gras. Vous pouvez surligner, modifier le texte ou l'exporter en PDF propre sans filigrane (en Premium).",
    tabTarget: 'resume',
    actionText: "Suivant : Flashcards Anki"
  },
  {
    title: "2. Les Flashcards & Répétition Espacée SM-2 ⚡",
    description: "Utilisez l'algorithme Anki SM-2 déterministe (0 token). Utilisez la barre Espace pour retourner la carte, et les touches 1 à 4 pour évaluer votre maîtrise. Supporte aussi les masques d'occlusion sur schéma anatomique via Ctrl+V !",
    tabTarget: 'flashcards',
    actionText: "Suivant : QCM & Explications"
  },
  {
    title: "3. Les QCM & Explications Pédagogiques ✅",
    description: "Entraînez-vous avec des QCM conformes aux exigences d'examen. Dès validation, cliquez sur 'Voir la correction détaillée' pour que Sofia formule une explication pédagogique naturelle en 1 phrase.",
    tabTarget: 'mcq',
    actionText: "🚀 Ouvrir mon cours démo"
  }
];

export const DEMO_COURSE_DATA = {
  folderName: "👋 Bienvenue & Découverte",
  courseName: "Guide Interactif : Réussir avec SofIA",
  extractedContent: `SOFIA LEARNING PLATFORM - GUIDE OFFICIEL DE PRISE EN MAIN

1. MÉTHODOLOGIE D'APPRENTISSAGE ACTIF
L'apprentissage passif (relecture simple d'un polycopié) offre un taux de rétention inférieur à 10% après 7 jours.
À l'inverse, l'Active Recall (test systématique de la mémoire) combiné à la répétition espacée (algorithme SM-2) permet d'atteindre plus de 85% de rétention à long terme.

2. LES 4 PILIERS DE SOFIA :
- Résumés intelligents : Synthèse instantanée avec détection automatique des mots en gras et export PDF pour réviser hors-ligne.
- Flashcards interactives : Répétition espacée déterministe (0 token), raccourcis claviers fluides (Espace, Flèches) et masques d'occlusion d'images (Ctrl+V).
- Évaluation QCM : Questions ciblées avec distracteurs plausibles et explications fluides en une phrase.
- Annales d'examen : Retranscription pure par regex, mot pour mot (0 token, 0 hallucination) avec extraction des schémas d'origine.

3. OPTIMISATION ZERO-STORAGE :
Importez vos gros polycopiés via Google Drive : extraction 100% en mémoire vive (RAM) et 0 octet consommé sur votre stockage Cloud !`,
  generations: {
    resume: `<h1>Guide Interactif : Réussir avec SofIA 🚀</h1>
<p>Bienvenue sur <strong>SofIA</strong>, votre second cerveau d'apprentissage pour les études exigeantes (Santé, Droit, Prépas, Concours).</p>

<h2>1. Pourquoi l'Apprentissage Actif ?</h2>
<p>La simple relecture passive d'un document ne permet de retenir que <strong>10% des informations</strong> après une semaine. SofIA combine les deux méthodes scientifiques les plus efficaces :</p>
<ul>
  <li><strong>Active Recall</strong> (rappel actif) : Vous force à puiser dans votre mémoire via des questions et flashcards.</li>
  <li><strong>Spaced Repetition (Anki SM-2)</strong> : Révise chaque notion juste avant le moment critique de l'oubli.</li>
</ul>

<h2>2. Les Fonctionnalités Majeures</h2>
<ul>
  <li><strong>Import Google Drive</strong> : Collez un lien partagé Drive pour analyser des cours de 300 pages sans saturer votre stockage.</li>
  <li><strong>Parser d'Annales 0 Token</strong> : Retranscription intégrale de vos vrais sujets d'examen sans aucune hallucination IA.</li>
  <li><strong>Recherche Globale (Ctrl+K)</strong> : Croisez instantanément l'ensemble de vos cours avec synthèse transversale et export PDF.</li>
  <li><strong>Export PDF Haute Définition</strong> : Téléchargez vos fiches impeccablement mises en page (sans aucune mention d'IA si vous êtes Premium).</li>
</ul>`,
    flashcards: [
      {
        id: 'fc-demo-1',
        front: "Quel est le pourcentage moyen de rétention après 7 jours avec une relecture passive ?",
        back: "Moins de 10%. C'est pour cela que SofIA privilégie l'Active Recall (rappel actif) et la répétition espacée.",
        box: 1,
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        nextReview: new Date().toISOString()
      },
      {
        id: 'fc-demo-2',
        front: "Quel raccourci clavier permet de retourner une flashcard pour voir la réponse ?",
        back: "La barre ESPACE (ensuite, touches 1 à 4 ou flèches pour noter votre niveau de maîtrise).",
        box: 1,
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        nextReview: new Date().toISOString()
      },
      {
        id: 'fc-demo-3',
        front: "Comment importer un polycopié volumineux sans consommer de stockage sur SofIA ?",
        back: "Via l'option 'Importer via Google Drive' : l'extraction se fait en mémoire vive (RAM) dans votre navigateur (0 Mo consommé).",
        box: 1,
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        nextReview: new Date().toISOString()
      },
      {
        id: 'fc-demo-4',
        front: "Quelle est la particularité du module d'Annales de concours sur SofIA ?",
        back: "Il utilise un parser regex déterministe : 0 token consommé, 0 hallucination, et retranscription exacte des questions et images d'origine.",
        box: 1,
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        nextReview: new Date().toISOString()
      }
    ],
    mcq: [
      {
        id: 'mcq-demo-1',
        question: "Parmi les méthodes suivantes, laquelle assure la meilleure mémorisation à long terme selon les sciences cognitives ?",
        options: [
          "Surligner le cours plusieurs fois en jaune",
          "Relire passivement ses notes la veille de l'examen",
          "L'Active Recall (rappel actif) combiné à la répétition espacée",
          "Écouter un cours en dormant"
        ],
        correctAnswer: 2,
        explanation: "L'Active Recall combiné à la répétition espacée (algorithme SM-2) permet d'atteindre plus de 85% de rétention durable."
      },
      {
        id: 'mcq-demo-2',
        question: "Comment accéder instantanément à la Recherche Globale transversale sur SofIA ?",
        options: [
          "En appuyant sur Ctrl+K (ou Cmd+K sur Mac)",
          "En redémarrant son navigateur",
          "En supprimant ses dossiers",
          "En ouvrant les paramètres système"
        ],
        correctAnswer: 0,
        explanation: "Le raccourci universel Ctrl+K ouvre la Recherche Globale pour scanner l'intégralité de vos cours et générer une synthèse transversale."
      }
    ],
    explications: JSON.stringify([
      {
        id: 'chat-demo-1',
        title: 'Prise en main de SofIA',
        messages: [
          { role: 'user', text: "Salut Sofia ! Que peux-tu faire pour m'aider dans mes révisions ?" },
          { role: 'ai', text: "Salut ! 👋 Je peux synthétiser vos cours, générer des flashcards intelligentes, créer des QCM avec explications détaillées, analyser vos annales d'examen et même croiser vos documents dans la Recherche Globale !" }
        ]
      }
    ])
  }
};

/**
 * Ensures demo folder and course exist in user account.
 * Works both with Supabase (logged in) and local fallback.
 */
export interface SeedDemoResult {
  folderNode: any;
  courseNode: any;
  courseId: string;
}

/**
 * Forcefully seeds (or re-seeds) demo course, cleaning any stale duplicates,
 * ensuring a brand-new demo experience identical to first signup.
 */
export async function forceSeedDemoCourse(userId?: string): Promise<SeedDemoResult | null> {
  const HAS_SEEDED_KEY = `sofia_demo_seeded_${userId || 'guest'}`;
  const COMPLETED_KEY = `sofia_onboarding_completed_${userId || 'guest'}`;
  const COURSE_ID_KEY = `sofia_demo_course_id_${userId || 'guest'}`;

  // Reset onboarding completion state so user restarts fresh
  localStorage.removeItem(HAS_SEEDED_KEY);
  localStorage.removeItem(COMPLETED_KEY);

  const prevCourseId = localStorage.getItem(COURSE_ID_KEY);
  if (prevCourseId) {
    localStorage.removeItem(`aura_subject_${prevCourseId}`);
  }

  try {
    const folderId = crypto.randomUUID();
    const courseId = crypto.randomUUID();

    // 1. Immediately seed localStorage fallback so navigation never fails or blacks out
    const localData = {
      extractedContent: DEMO_COURSE_DATA.extractedContent,
      generations: DEMO_COURSE_DATA.generations,
      fileName: 'Guide_SofIA_Demo.pdf'
    };
    localStorage.setItem(`aura_subject_${courseId}`, JSON.stringify(localData));
    localStorage.setItem(HAS_SEEDED_KEY, 'true');
    localStorage.setItem(COURSE_ID_KEY, courseId);

    const folderNodeObj = {
      id: folderId,
      name: DEMO_COURSE_DATA.folderName,
      type: 'folder' as const,
      parentId: null,
      color: '#4f46e5',
      order: -1,
      createdAt: new Date().toISOString()
    };

    const courseNodeObj = {
      id: courseId,
      name: DEMO_COURSE_DATA.courseName,
      type: 'course' as const,
      parentId: folderId,
      color: '#db2777',
      order: 0,
      createdAt: new Date().toISOString()
    };

    // Update local storage aura_file_system
    const STORAGE_KEY = 'aura_file_system';
    const saved = localStorage.getItem(STORAGE_KEY);
    let localNodes = saved ? JSON.parse(saved) : [];
    localNodes = localNodes.filter((n: any) => n.name !== DEMO_COURSE_DATA.folderName && n.name !== DEMO_COURSE_DATA.courseName);
    localNodes.unshift(folderNodeObj, courseNodeObj);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localNodes));

    if (userId) {
      // 2. Insert new Folder & Course into Supabase first
      const folderNode = {
        id: folderId,
        user_id: userId,
        name: DEMO_COURSE_DATA.folderName,
        type: 'folder',
        parent_id: null,
        color: '#4f46e5',
        order: -1,
        created_at: new Date().toISOString()
      };

      const courseNode = {
        id: courseId,
        user_id: userId,
        name: DEMO_COURSE_DATA.courseName,
        type: 'course',
        parent_id: folderId,
        color: '#db2777',
        order: 0,
        created_at: new Date().toISOString()
      };

      await supabase.from('nodes').insert([folderNode, courseNode]);

      // 3. Insert Course Data
      await supabase.from('course_data').insert({
        course_id: courseId,
        user_id: userId,
        file_name: 'Guide_SofIA_Demo.pdf',
        extracted_content: DEMO_COURSE_DATA.extractedContent,
        generations: DEMO_COURSE_DATA.generations
      });

      // 4. Clean up any previous demo folder and its courses in the background
      const { data: oldFolders } = await supabase
        .from('nodes')
        .select('id')
        .eq('user_id', userId)
        .eq('name', DEMO_COURSE_DATA.folderName)
        .neq('id', folderId);

      if (oldFolders && oldFolders.length > 0) {
        const oldFolderIds = oldFolders.map(f => f.id);
        const { data: oldCourses } = await supabase
          .from('nodes')
          .select('id')
          .eq('user_id', userId)
          .in('parent_id', oldFolderIds);

        const courseIds = oldCourses ? oldCourses.map(c => c.id) : [];
        const allIdsToDelete = [...oldFolderIds, ...courseIds];

        if (courseIds.length > 0) {
          await supabase.from('course_data').delete().in('course_id', courseIds);
        }
        if (allIdsToDelete.length > 0) {
          await supabase.from('nodes').delete().in('id', allIdsToDelete);
        }
      }
    }

    return {
      folderNode: folderNodeObj,
      courseNode: courseNodeObj,
      courseId
    };
  } catch (err) {
    console.error('Failed to force seed demo course:', err);
    return null;
  }
}

/**
 * Ensures demo folder and course exist in user account.
 * Only seeds if not yet seeded and user has 0 nodes.
 */
export async function seedDemoCourseIfEmpty(userId?: string): Promise<SeedDemoResult | null> {
  const HAS_SEEDED_KEY = `sofia_demo_seeded_${userId || 'guest'}`;
  if (localStorage.getItem(HAS_SEEDED_KEY)) {
    return null;
  }

  if (userId) {
    const { data: existingNodes } = await supabase
      .from('nodes')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (existingNodes && existingNodes.length > 0) {
      localStorage.setItem(HAS_SEEDED_KEY, 'true');
      return null;
    }
  }

  return forceSeedDemoCourse(userId);
}

export function getDemoCourseId(userId?: string): string | null {
  return localStorage.getItem(`sofia_demo_course_id_${userId || 'guest'}`);
}
