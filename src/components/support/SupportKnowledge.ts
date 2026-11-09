export interface SupportFAQItem {
  id: string;
  category: 'premium' | 'courses' | 'annales' | 'flashcards' | 'planning' | 'stats' | 'tools' | 'general';
  title: string;
  keywords: string[];
  answer: string;
  actionHint?: string;
}

export const SUPPORT_CATEGORIES = [
  { id: 'general', label: '👋 Guide Découverte & Astuces', color: '#6366f1' },
  { id: 'tools', label: '🔍 Recherche Globale & Chat SofIA', color: '#8b5cf6' },
  { id: 'courses', label: '📚 Cours, PDF & Google Drive', color: '#3b82f6' },
  { id: 'flashcards', label: '⚡ Flashcards & Anki SM-2', color: '#f59e0b' },
  { id: 'annales', label: '📝 Annales & Examens Blancs', color: '#10b981' },
  { id: 'planning', label: '📅 Planning & Révisions', color: '#ec4899' },
  { id: 'stats', label: '📊 Statistiques & Progression', color: '#06b6d4' },
  { id: 'premium', label: '💳 Abonnement & Quotas', color: '#10b981' }
] as const;

export const SUPPORT_KNOWLEDGE_BASE: SupportFAQItem[] = [
  // --- ABONNEMENT & QUOTAS ---
  {
    id: 'why-premium',
    category: 'premium',
    title: 'Pourquoi passer au forfait Premium ?',
    keywords: ['pourquoi', 'premium', 'avantage', 'payer', 'prix', 'forfait', 'abonnement', 'offre'],
    answer: `Le forfait **Premium SofIA** est conçu pour les étudiants intensifs (PASS/LAS, Droit, Prépas, Concours) :\n\n• **50 générations IA par jour** (au lieu de 5 en Gratuit).\n• **Importation d'Annales illimitée** avec correction pas à pas.\n• **Recherche Globale débloquée** sur l'ensemble de votre bibliothèque.\n• **Explications QCM détaillées** illimitées.\n• Accès prioritaire sans file d'attente.`,
    actionHint: 'Cliquez sur votre profil ou le badge de quota pour souscrire.'
  },
  {
    id: 'how-to-pay',
    category: 'premium',
    title: 'Comment payer et activer le Premium ?',
    keywords: ['comment payer', 'payer', 'payhip', 'carte', 'bancaire', 'paypal', 'activer', 'achat', 'paiement'],
    answer: `Le paiement s'effectue en toute sécurité via notre partenaire **Payhip** (compatible Carte Bancaire Visa/Mastercard et PayPal) :\n\n1. Cliquez sur le bouton **"Passer Premium"** dans la barre latérale ou la fenêtre de quota.\n2. Vous serez redirigé vers la page sécurisée Payhip.\n3. Renseignez **la même adresse email** que votre compte SofIA.\n4. Dès validation du paiement, votre statut passe immédiatement en **Premium** (50 crédits/jour) sans que vous ayez besoin de vous reconnecter.`,
    actionHint: 'Vérifiez bien que l\'email saisi sur Payhip est identique à votre compte SofIA.'
  },
  {
    id: 'quota-reset',
    category: 'premium',
    title: 'Quand mon quota quotidien se réinitialise-t-il ?',
    keywords: ['quota', 'limite', 'reset', 'reinitialiser', 'heure', 'minuit', 'bloque', '5/5', '50/50'],
    answer: `Votre compteur de générations quotidiennes (5 en Gratuit, 50 en Premium) est automatiquement remis à zéro **chaque nuit à minuit (00h00 heure de Paris)**.\n\nSi vous atteignez votre quota en cours de journée, les fonctionnalités déterministes (révision Anki SM-2 de vos flashcards déjà créées, relecture des cours, passage d'examens d'annales déjà importés) restent **100% accessibles et illimitées** car elles ne consomment aucun token.`
  },
  {
    id: 'cancel-sub',
    category: 'premium',
    title: 'Comment résilier ou gérer mon abonnement ?',
    keywords: ['resilier', 'annuler', 'stop', 'arret', 'desabonner', 'gerer', 'remboursement'],
    answer: `Vous pouvez résilier votre abonnement à tout moment, en 1 clic et sans engagement :\n\n• Rendez-vous dans le lien de gestion présent dans votre email de confirmation reçu lors du paiement Payhip.\n• Ou contactez directement le support à **sofia.study.app@gmail.com**.\n• Votre statut Premium restera actif jusqu'à la fin de la période déjà réglée.`
  },

  // --- COURS & DOCUMENTS ---
  {
    id: 'create-course',
    category: 'courses',
    title: 'Comment créer un dossier ou ajouter un cours ?',
    keywords: ['creer', 'cours', 'dossier', 'nouveau', 'ajouter', 'matiere', 'organisation'],
    answer: `Dans votre **Bibliothèque** :\n\n1. Pour organiser vos matières, cliquez sur **"+ Nouveau dossier"** en haut de page (ex: *Anatomie*, *Droit Civil*).\n2. Cliquez sur un dossier pour y entrer.\n3. Cliquez sur **"+ Nouveau cours"** pour déposer un document.\n4. Donnez un titre et importez votre support (Fichier PDF ou lien Google Drive).`
  },
  {
    id: 'pdf-limit',
    category: 'courses',
    title: 'Quelle est la limite de taille pour les PDF locaux ?',
    keywords: ['pdf', 'limite', 'pages', '50', 'taille', 'fichier', 'trop lourd', 'erreur page'],
    answer: `Pour garantir une vitesse d'analyse optimale et préserver la mémoire de votre navigateur, les PDF importés directement depuis votre ordinateur sont limités à **50 pages maximum**.\n\n💡 **Astuce pour les gros polycopiés (> 50 pages)** :\nUtilisez l'option **"Importer via Google Drive"** ! Elle n'a aucune restriction de nombre de pages et extrait le contenu directement en mémoire vive sans saturer votre espace.`
  },
  {
    id: 'google-drive',
    category: 'courses',
    title: 'Comment importer un cours depuis Google Drive ?',
    keywords: ['drive', 'google drive', 'lien', 'partage', 'zero stockage', 'importer drive', 'url drive'],
    answer: `L'importation Google Drive est la méthode la plus rapide et écologique de SofIA :\n\n1. Dans votre Google Drive, faites un clic droit sur votre PDF > **Partager** > mettez l'accès sur **"Tous les utilisateurs disposant du lien"**.\n2. Copiez le lien de partage.\n3. Dans SofIA, cliquez sur **"Importer via Google Drive"** et collez le lien.\n4. Le texte est extrait instantanément dans votre navigateur et le cours est visualisable dans le lecteur intégré.`
  },
  {
    id: 'move-course',
    category: 'courses',
    title: 'Comment déplacer un cours ou un sous-dossier ?',
    keywords: ['deplacer', 'changer dossier', 'ranger', 'arborescence', 'bouger', 'classer'],
    answer: `Dans la Bibliothèque, au survol d'un cours ou d'un dossier, cliquez sur les **3 petits points (...)** puis sélectionnez **"Déplacer"**.\n\nUne fenêtre interactive vous affiche l'arborescence complète de vos dossiers : choisissez la nouvelle destination en un clic ! Une sécurité anti-boucle empêche de déplacer un dossier à l'intérieur de lui-même.`
  },

  // --- ANNALES & EXAMENS BLANCS ---
  {
    id: 'how-annales-work',
    category: 'annales',
    title: 'Comment fonctionne le module Annales (Examens Blancs) ?',
    keywords: ['annale', 'annales', 'examen blanc', 'concours', 'parser', 'retranscription', 'correction annale', 'qcm'],
    answer: `Le module d'annales de SofIA est une exclusivité technologique :\n\n• **Retranscription mot pour mot fidèle** : Un algorithme regex scanne votre PDF de concours, extrait exactement les énoncés originaux, les options A/B/C/D et la grille de correction sans aucune altération.\n• **Figures & Illustrations** : Les schémas du sujet sont automatiquement capturés et intégrés aux questions.\n• **Entraînement en conditions réelles** : Chronomètre, grille de réponse interactive et calcul automatique de la note finale sur 20.`
  },
  {
    id: 'annale-button-disabled',
    category: 'annales',
    title: 'Pourquoi le bouton "Importer une annale" est-il grisé ?',
    keywords: ['annale grise', 'bouton grise', 'bloque', 'impossible annale', 'limite annale', 'quota annale'],
    answer: `Le bouton devient grisé lorsque vous avez atteint votre **quota journalier d'utilisation IA** (5/5 en Gratuit ou 50/50 en Premium).\n\nPour réactiver l'importation de nouvelles annales, vous pouvez soit passer au **forfait Premium**, soit attendre la réinitialisation automatique de minuit.`
  },

  // --- FLASHCARDS & ANKI SM-2 ---
  {
    id: 'anki-sm2',
    category: 'flashcards',
    title: 'Comment fonctionne l\'algorithme Anki SM-2 dans SofIA ?',
    keywords: ['anki', 'sm-2', 'sm2', 'repetition espacee', 'delai', 'intervalle', 'flashcards', 'memoriser'],
    answer: `SofIA utilise le célèbre algorithme scientifique de répétition espacée **SuperMemo SM-2** :\n\n• Chaque réponse évalue votre niveau de maîtrise : **À revoir (< 1 min)**, **Difficile (10 min)**, **Correct (1 jour)**, **Parfait (3 jours)**.\n• Plus vous réussissez une carte avec aisance, plus l'intervalle jusqu'à la prochaine révision augmente de façon exponentielle.\n• Les cartes ratées sont automatiquement réinjectées en fin de session jusqu'à assimilation totale.`
  },
  {
    id: 'image-occlusion',
    category: 'flashcards',
    title: 'Comment créer des masques d\'occlusion sur un schéma ?',
    keywords: ['occlusion', 'masque', 'image', 'schema', 'anatomie', 'cacher', 'dessiner', 'ctrl+v'],
    answer: `Idéal pour l'anatomie, la biochimie ou les cartes géographiques :\n\n1. Dans l'onglet Flashcards de votre cours, créez une carte et collez votre schéma avec **Ctrl+V** (ou via le bouton Image).\n2. Cliquez sur **"Ajouter des masques d'occlusion"**.\n3. Dessinez des rectangles sur les légendes que vous souhaitez masquer.\n4. Pendant la révision, cliquez sur le masque pour dévoiler le mot caché !`
  },
  {
    id: 'flashcards-shortcuts',
    category: 'flashcards',
    title: 'Quels sont les raccourcis clavier pour les flashcards ?',
    keywords: ['raccourcis', 'clavier', 'touches', 'espace', 'fleches', 'rapide', 'vitesse'],
    answer: `Passez vos révisions en mode ultra-rapide :\n\n• **Barre Espace** : Retourner la carte (afficher la réponse).\n• **Touche 1 / Flèche Gauche** : Noter "À revoir" (< 1 min).\n• **Touche 2** : Noter "Difficile" (10 min).\n• **Touche 3 / Flèche Droite** : Noter "Correct / Bon" (1 jour).\n• **Touche 4** : Noter "Facile / Parfait" (3+ jours).`
  },

  // --- PLANNING & PROGRAMMATION ---
  {
    id: 'planning-features',
    category: 'planning',
    title: 'Comment programmer et planifier ses révisions ?',
    keywords: ['planning', 'programmer', 'calendrier', 'agenda', 'date', 'reviser', 'planification', 'modifier planning'],
    answer: `Accédez à l'onglet **Planning** dans la barre latérale :\n\n1. Vous visualisez un calendrier intelligent avec les cours arrivant à échéance selon vos courbes de répétition espacée.\n2. Vous pouvez fixer une date de concours ou d'examen final pour chaque matière : SofIA adapte automatiquement la cadence des révisions pour que tout soit acquis avant le jour J.\n3. Pour modifier la date d'une session, glissez-déposez l'élément ou cliquez dessus pour choisir une nouvelle date.`
  },

  // --- STATISTIQUES & PROGRESSION ---
  {
    id: 'stats-explained',
    category: 'stats',
    title: 'Comment sont calculées les statistiques et notes ?',
    keywords: ['statistiques', 'notes', 'score', 'moyenne', 'retention', 'courbe', 'progression', 'stats'],
    answer: `La page **Statistiques** compile l'ensemble de votre travail d'apprentissage actif :\n\n• **Taux de rétention global** : Pourcentage de flashcards maîtrisées à long terme (> 7 jours d'intervalle SM-2).\n• **Moyenne QCM & Examens Blancs** : Score cumulé calculé sur vos sessions d'annales et QCM validés.\n• **Temps d'étude actif** : Suivi des sessions de révision réelles.\n• *Bientôt disponible : Système de niveaux XP et séries quotidiennes (Streaks façon Duolingo) !*`
  },

  // --- QUESTIONS GÉNÉRALES ---
  {
    id: 'how-to-start',
    category: 'general',
    title: 'Comment bien démarrer sur SofIA (Guide Découverte) ?',
    keywords: ['demarrer', 'debuter', 'guide', 'decouverte', 'tutoriel', 'visite', 'bienvenue', 'onboarding'],
    answer: `Bienvenue sur SofIA ! Voici le parcours idéal pour maîtriser la plateforme en 3 étapes :\n\n1. **Consultez le cours de bienvenue** : Votre bibliothèque contient un dossier *"👋 Bienvenue & Découverte"* avec un cours interactif complet déjà configuré.\n2. **Testez les 3 modes d'apprentissage actif** :\n   • Le **Résumé** : Vos notions clés prêtes à être surlignées et téléchargées en PDF.\n   • Les **Flashcards Anki SM-2** : Appuyez sur Espace pour tester votre mémoire à long terme.\n   • Les **QCM** : Des questions d'examen avec explications pédagogiques détaillées.\n3. **Déposez votre premier cours** : Cliquez sur *"+ Nouveau cours"* pour importer un PDF local (max 50 pages) ou un lien Google Drive sans limite !`,
    actionHint: 'Vous pouvez relancer le tutoriel interactif à tout moment en cliquant sur le bouton ci-dessous.'
  },
  // --- OUTILS : RECHERCHE GLOBALE & CHAT SOFIA ---
  {
    id: 'global-search',
    category: 'tools',
    title: 'Comment fonctionne la Recherche Globale (Ctrl+K) ?',
    keywords: ['recherche', 'recherche globale', 'ctrl+k', 'chercher', 'synthese', 'mots cles', 'croiser', 'transversale'],
    answer: `Appuyez sur **Ctrl+K** (ou cliquez sur "Recherche Globale" dans le menu de gauche) :\n\n• **Recherche transversale instantanée** : Tapez une notion, un médicament, une pathologie ou un article de loi (ex: *"Insuffisance mitrale"*, *"Arrêt Perruche"*).\n• **Synthèse croisée IA** : SofIA scanne l'intégralité de vos cours et génère une fiche transversale reliant tous les passages pertinents retrouvés dans vos différents dossiers.\n• **Historique & Téléchargement PDF** : Retrouvez l'historique complet de vos fiches transversales et téléchargez-les en PDF prêt à réviser.`
  },
  {
    id: 'global-search-history-pdf',
    category: 'tools',
    title: 'Comment retrouver l\'historique et télécharger les fiches transversales ?',
    keywords: ['historique', 'fiche', 'telecharger', 'pdf', 'synthese transversale', 'exporter', 'recherche globale'],
    answer: `Dans la **Recherche Globale (Ctrl+K)** :\n\n1. Après avoir généré une synthèse transversale, cliquez sur le bouton **"Télécharger en PDF"** pour obtenir une fiche de révision imprimable haute définition.\n2. **Sans mention IA pour les abonnés Premium** : Vos fiches téléchargées ne comportent aucun filigrane ni mention d'IA, parfait pour vos classeurs.\n3. **Historique intégré** : Consultez l'onglet *Historique des fiches* pour rouvrir ou retélécharger n'importe quelle synthèse transversale déjà générée.`
  },
  {
    id: 'chat-sofia-features',
    category: 'tools',
    title: 'Comment utiliser le Chat SofIA (/chat) et la Recherche Web ?',
    keywords: ['chat', 'chat sofia', 'recherche web', 'google', 'discussion', 'tuteur', 'poser question'],
    answer: `Le **Chat SofIA** est votre tuteur interactif disponible dans la barre latérale :\n\n• **Tuteur libre sans document** : Posez-lui n'importe quelle question sur vos cours, vos doutes méthodologiques ou vos dissertations.\n• **Bouton Recherche Web** : Activez l'option de recherche en direct pour que SofIA interroge Google en temps réel et vérifie les dernières recommandations officielles ou actualités juridiques/médicales.\n• **Différence avec un cours** : Dans un cours (onglet *Explications*), SofIA se base **strictement sur votre polycopié**. Dans le Chat général, elle puise dans l'ensemble du savoir académique.`
  },
  {
    id: 'folder-revision-power',
    category: 'courses',
    title: 'Comment réviser tout un dossier d\'un coup (l\'éclair jaune ⚡) ?',
    keywords: ['reviser dossier', 'eclair', 'reviser tout', 'multi cours', 'session globale', 'flashcards dossier'],
    answer: `Dans votre Bibliothèque, chaque dossier dispose d'un bouton **Éclair jaune ⚡ "Réviser le dossier"** :\n\n• **Session globale multi-cours** : Il rassemble en un clic toutes les flashcards arrivées à échéance (Anki SM-2) dans l'ensemble des cours du dossier.\n• **Gain de temps maximal** : Au lieu d'ouvrir vos 10 chapitres un par un, vous effectuez une seule session de révision complète et optimisée pour votre journée.`
  },
  {
    id: 'pdf-export-branding',
    category: 'courses',
    title: 'Téléchargement des résumés en PDF et avantage Premium',
    keywords: ['telecharger pdf', 'export pdf', 'imprimer', 'fiche pdf', 'sans mention ia', 'filigrane', 'marque blanche'],
    answer: `Chaque résumé de cours peut être téléchargé en fiche PDF haute définition :\n\n• **Plan Gratuit** : La fiche est imprimable et comporte la mention de génération assistée par SofIA.\n• **Plan Premium** : **Marque blanche intégrale** ! Aucune mention d'intelligence artificielle ni référence à SofIA n'apparaît sur le document final, vous permettant de conserver des fiches totalement neutres et professionnelles.`
  },

  // --- QUESTIONS GÉNÉRALES ---
  {
    id: 'how-to-start',
    category: 'general',
    title: 'Comment bien démarrer sur SofIA (Guide Découverte) ?',
    keywords: ['demarrer', 'debuter', 'guide', 'decouverte', 'tutoriel', 'visite', 'bienvenue', 'onboarding'],
    answer: `Bienvenue sur SofIA ! Voici le parcours idéal pour maîtriser la plateforme en 3 étapes :\n\n1. **Consultez le cours de bienvenue** : Votre bibliothèque contient un dossier *"👋 Bienvenue & Découverte"* avec un cours interactif complet déjà configuré.\n2. **Testez les 3 modes d'apprentissage actif** :\n   • Le **Résumé** : Vos notions clés prêtes à être surlignées et téléchargées en PDF.\n   • Les **Flashcards Anki SM-2** : Appuyez sur Espace pour tester votre mémoire à long terme.\n   • Les **QCM** : Des questions d'examen avec explications pédagogiques détaillées.\n3. **Déposez votre premier cours** : Cliquez sur *"+ Nouveau cours"* pour importer un PDF local (max 50 pages) ou un lien Google Drive sans limite !`,
    actionHint: 'Vous pouvez relancer le tutoriel interactif à tout moment en cliquant sur le bouton ci-dessous.'
  }
];

export function findBestSupportAnswer(query: string): SupportFAQItem | null {
  const clean = query.toLowerCase().trim();
  if (!clean) return null;

  const words = clean.split(/\s+/).filter(w => w.length >= 3);
  let bestItem: SupportFAQItem | null = null;
  let highestScore = 0;

  for (const item of SUPPORT_KNOWLEDGE_BASE) {
    let score = 0;

    // Check title match
    const titleLower = item.title.toLowerCase();
    if (titleLower.includes(clean)) score += 15;
    for (const w of words) {
      if (titleLower.includes(w)) score += 4;
    }

    // Check keywords match
    for (const kw of item.keywords) {
      const kwLower = kw.toLowerCase();
      if (clean === kwLower || clean.includes(kwLower)) {
        score += 8;
      } else {
        for (const w of words) {
          if (kwLower.includes(w)) score += 2;
        }
      }
    }

    // Check answer text match
    const answerLower = item.answer.toLowerCase();
    for (const w of words) {
      if (answerLower.includes(w)) score += 1;
    }

    if (score > highestScore) {
      highestScore = score;
      bestItem = item;
    }
  }

  // Require a minimal threshold
  return highestScore >= 4 ? bestItem : null;
}
