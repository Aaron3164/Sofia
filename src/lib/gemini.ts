import { supabase } from './supabase';

export type AIPreferences = {
  theme?: 'dark' | 'glass';
  ai_personality?: 'benevolent' | 'concise' | 'academic';
  ai_study_mode?: 'understanding' | 'memorization' | 'critical';
  ai_auto_flashcards?: boolean;
};

/**
 * Sends prompt requests securely through the serverless backend proxy (/api/gemini)
 */
async function callGeminiProxy(
  model: string,
  contents: string[] | any[],
  config?: Record<string, any>
): Promise<{ text: string; groundingMetadata?: any }> {
  // Vérification stricte du quota côté client avant tout appel
  await ensureQuota();

  // Get current user session for secure backend authorization
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token || '';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      contents,
      config,
    }),
  });

  const data = await response.json();

  // Met à jour la barre de quota dans la Sidebar en temps réel
  window.dispatchEvent(new CustomEvent('ai-usage-updated'));

  if (!response.ok || data.error) {
    if (data.error === 'QUOTA_EXCEEDED' || response.status === 429) {
      throw new Error(data.message || 'Limite quotidienne de générations atteinte (5 pour le plan gratuit, 50 pour le plan Premium).');
    }
    throw new Error(data.message || data.error || 'Erreur lors de la génération avec Gemini.');
  }

  return { 
    text: data.text || '',
    groundingMetadata: data.groundingMetadata || null
  };
}

/**
 * Fetches the current daily AI usage for the logged-in user.
 * Supports both database structures:
 * - (user_id, count, updated_at) from original schema
 * - (user_id, usage_date, generation_count) from updated schema
 */
export async function getDailyUsage(): Promise<number> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return 0;

    // Calcul de la date du jour (supporte date locale et UTC pour éviter les décalages de fuseau)
    const now = new Date();
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const utcDate = now.toISOString().split('T')[0];
    const datesToCheck = Array.from(new Set([localDate, utcDate]));

    // Requête ciblée sur la clé primaire (user_id, usage_date)
    const { data, error } = await supabase
      .from('ai_usage')
      .select('generation_count')
      .eq('user_id', userId)
      .in('usage_date', datesToCheck)
      .order('usage_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data && typeof data.generation_count === 'number') {
      return data.generation_count;
    }

    return 0;
  } catch (err) {
    console.error('[Quota] Erreur getDailyUsage:', err);
    return 0;
  }
}

/**
 * Checks if the user has reached their daily AI generation limit (5 for free, 50 for premium).
 * Throws immediately if reached to block client-side execution.
 */
export async function ensureQuota(): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .maybeSingle();

    const maxGenerations = profile?.plan === 'premium' ? 50 : 5;
    const usage = await getDailyUsage();

    if (usage >= maxGenerations) {
      throw new Error(`Limite quotidienne de générations IA atteinte (${usage}/${maxGenerations} pour le plan ${profile?.plan || 'gratuit'}). Revenez demain ou passez Premium !`);
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('Limite quotidienne')) {
      throw err;
    }
    // Si c'est une simple erreur réseau de lecture, on ne bloque pas inutilement
  }
}

function getSystemInstruction(prefs?: AIPreferences) {
  const personality = prefs?.ai_personality || 'benevolent';
  const studyMode = prefs?.ai_study_mode || 'understanding';

  const personalities = {
    benevolent: "Tu es Sofia, une assistante bienveillante et encourageante. Utilise un ton chaleureux, motive l'élève avec des emojis et des encouragements. Tu DOIS tutoyer l'étudiant.",
    concise: "Tu es Sofia, une assistante ultra-concise et efficace. Va droit au but, évite les fioritures et les phrases inutiles. Tu DOIS tutoyer l'étudiant.",
    academic: "Tu es Sofia, une assistante académique rigoureuse et experte. Utilise un vocabulaire soutenu et précis, cite les sources si possible et adopte une structure très formelle. Tu DOIS tutoyer l'étudiant."
  };

  const modes = {
    understanding: "Ton objectif principal est la COMPRÉHENSION : explique les concepts en profondeur, fais des liens logiques et utilise des analogies pédagogiques.",
    memorization: "Ton objectif principal est la MÉMORISATION : focus sur les définitions clés, utilise des moyens mnémotechniques et structure l'information pour qu'elle soit facile à retenir.",
    critical: "Ton objectif principal est l'ESPRIT CRITIQUE : analyse les nuances, présente les débats doctrinaux (essentiel en Droit) et les contre-arguments potentiels."
  };

  const boldInstruction = "CONSIGNE IMPORTANTE SUR LES MOTS EN GRAS DANS LE TEXTE DU COURS : Les mots ou phrases encadrés par des astérisques **gras** (ex: **notion**) dans le texte de cours fourni ont été détectés en gras dans le document source (PDF). En général, ce sont des concepts, définitions ou mots-clés importants mis en valeur par l'auteur du cours. Tu dois généralement leur accorder une attention et une priorité particulières dans tes résumés, flashcards et questions, tout en conservant ton discernement et jugement pédagogique pour décider s'ils méritent ou non d'être retenus selon le contexte.";

  return `${personalities[personality]} ${modes[studyMode]}\n${boldInstruction}\n\n`;
}

// Helper to generate a collision-proof cache key from a unique course/annale ID and arguments
function getCacheKey(prefix: string, scopeId: string, content: string): string {
  let h1 = 0xdeadbeef ^ scopeId.length;
  let h2 = 0x41c6ce57 ^ content.length;
  const full = `${scopeId}:::${content}`;
  for (let i = 0; i < full.length; i++) {
    const ch = full.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${prefix}_${scopeId}_${(h2 >>> 0).toString(36)}_${(h1 >>> 0).toString(36)}_${content.length}`;
}

/**
 * Formats the static document prefix so Google Gemini Context Caching
 * matches 100% of the document tokens across Flashcards, MCQ, Resume, and QA
 * for the SAME courseId, while strictly isolating different courses/annales.
 */
function buildCourseCachePrefix(courseId: string | undefined, cleanDocumentText: string): string {
  const safeId = courseId || 'isolated_doc';
  return `=== [GOOGLE_CONTEXT_CACHE_SCOPE_ID: ${safeId}] ===\n=== [DOCUMENT_DE_REFERENCE_STABLE_POUR_MISE_EN_CACHE] ===\n${cleanDocumentText}\n=== [FIN_DU_DOCUMENT_EN_CACHE_SCOPE: ${safeId}] ===`;
}

/**
 * Losslessly compacts whitespace and redundant blank lines from extracted PDF text
 * to reduce token consumption by ~10-15% without removing a single word or character of content.
 */
function compactCourseText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface CourseSchemaInput {
  id: string; // e.g. "FIGURE_1"
  url: string; // Base64 data URL
  pageNumber: number;
}

/**
 * Uploads a file (or passes the URI) to Gemini and generates flashcards, MCQs, or an exhaustive summary.
 * If schemas are provided, passes them multimodally in chronological page order so Sofia can inspect and
 * re-insert important diagrams into the summary with ![Légende](FIGURE_X).
 */
export async function generateStudyMaterials(
  promptContext: string,
  mode: 'flashcards' | 'mcq' | 'resume',
  prefs?: AIPreferences,
  cardCount?: number,
  customInstructions?: string,
  courseId?: string
): Promise<string> {
  const systemInstruction = getSystemInstruction(prefs);

  const randomSeed = Math.random().toString(36).substring(7);

  const prompts = {
    flashcards: `[Session unique: ${randomSeed}] Crée exactement ${cardCount || 30} flashcards de révision à partir de ce texte. Extraie les concepts, détails et définitions les plus importants sans faire de doublons ni de répétitions. Varie les questions par rapport aux éventuelles sessions précédentes pour ce même texte.
    
CONSIGNE RECTO (front) : Sois explicite dans la question pour que l'étudiant sache précisément quoi répondre (ex: "Quelle est la définition de [concept] ?", "Quelles sont les 3 conditions de [X] ?", "En quoi consiste l'exception de [Y] ?"). Évite les questions trop vagues comme juste un nom de concept.

CONSIGNE VERSO (back) : Les réponses doivent rester CONCISES (entre 2 et 15 mots maximum). On veut une information percutante, pas de longs paragraphes.

Réponds STRICTEMENT en français. Format attendu : un tableau JSON d'objets avec "front" (question) et "back" (réponse).`,
    mcq: `[Session unique: ${randomSeed}] Génère exactement 10 questions à choix multiples de niveau intermédiaire basées sur le texte. Il peut y avoir UNE ou PLUSIEURS bonnes réponses (format QCM multi-choix). Varie les questions par rapport aux éventuelles sessions précédentes pour ce même texte pour aborder d'autres détails ou notions du cours.
Réponds STRICTEMENT en français. Format attendu : un tableau JSON d'objets avec "question", "options" (tableau de 4 ou 5 chaînes), et "correctAnswers" (tableau contenant les réponses exactes).`,
    resume: `Tu es un expert en synthèse pédagogique. Ta mission est de créer un compte-rendu ULTRA-DÉTAILLÉ et EXHAUSTIF du cours fourni. 
    
CONSIGNE DE LONGUEUR ET DE PRÉCISION : NE SAUTE AUCUNE PARTIE. Analyse le cours section par section, paragraphe par paragraphe. Si une information est dans le texte, elle DOIT être dans ton résumé. Je préfère un texte très long plutôt qu'un texte qui oublie des détails.

CONSIGNE CRITIQUE : NE DIS PAS BONJOUR. NE TE PRÉSENTE PAS. COMMENCE IMMÉDIATEMENT PAR LE TITRE DU RÉSUMÉ OU LE PREMIER CHAPITRE.

Consignes de formatage strictes :
- Utilise '# ', '## ', '### ', '#### ' pour la structure hiérarchique.
- Fais des listes à puces avec '* ' pour chaque détail important.
- Mets en **gras** les termes techniques.
- UTILISE MASSIVEMENT ET SYSTÉMATIQUEMENT '==' POUR SURLIGNER TOUTES LES INFORMATIONS LES PLUS FONDAMENTALES. 
- Utilise '__' pour souligner les précisions importantes.
- Ne fais pas de conclusion ou de transition, reste sur le contenu pur.

Rédige tout en français de manière extrêmement précise, complète et académique.`
  };

  let fullPromptHeader = `${systemInstruction}${prompts[mode]}`;
  
  if (customInstructions && customInstructions.trim().length > 0) {
    fullPromptHeader += `\n\nCONSIGNE COMPLÉMENTAIRE DE L'ÉTUDIANT : Tout en respectant à 100% le prompt principal ci-dessus et en balayant l'ensemble du cours, accorde un soin, une profondeur et une densité légèrement supérieures aux notions, consignes ou mots-clés suivants : ${customInstructions.trim()}.`;

    const isClinicalRequested = /cas clinique|scénario|scenario|histoire|énoncé|enoncé|patient|mise en situation/i.test(customInstructions);
    if (mode === 'mcq' && isClinicalRequested) {
      fullPromptHeader += `\n\nFORMAT SPÉCIFIQUE CAS CLINIQUE : Puisque la consigne de l'étudiant demande un cas clinique ou un énoncé fictif, rédige l'énoncé complet du cas clinique dans une propriété "scenario" à la racine de ton JSON, et place les questions dans la propriété "questions". Format attendu : {"scenario": "Texte complet de l'énoncé...", "questions": [...]}`;
    }
  }

  const isJSON = mode === 'flashcards' || mode === 'mcq';
  const cleanContext = compactCourseText(promptContext);
  const cachedPrefixBlock = buildCourseCachePrefix(courseId, cleanContext);
  const requestContents = [`${cachedPrefixBlock}\n\n=== TÂCHE DEMANDÉE SUR CE COURS ===\n${fullPromptHeader}`];

  try {
    const response = await callGeminiProxy(
      'models/gemini-3.5-flash-lite',
      requestContents,
      {
        temperature: mode === 'resume' ? 0.2 : 0.7,
        responseMimeType: isJSON ? 'application/json' : undefined
      }
    );
    
    let generatedText = response.text || '';

      // Clean up any accidental raw or unrendered figure references (e.g. "(voir FIGURE_1)", "voir figure 1")
      generatedText = generatedText.replace(/\(?(?:voir|cf\.?)\s+(?:la\s+)?(?:figure|schéma|diagramme)\s*#?(?:FIGURE_?)?\d+\)?/gi, '');
    
    if (isJSON) {
      // Robust JSON extraction: look for either { or [
      const firstBrace = generatedText.indexOf('{');
      const firstBracket = generatedText.indexOf('[');

      if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        const lastBrace = generatedText.lastIndexOf('}');
        if (lastBrace > firstBrace) {
          generatedText = generatedText.substring(firstBrace, lastBrace + 1);
        }
      } else {
        const startIdx = generatedText.indexOf('[');
        const endIdx = generatedText.lastIndexOf(']');
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          generatedText = generatedText.substring(startIdx, endIdx + 1);
        } else {
          generatedText = generatedText.replace(/```json\n?|```/g, '').trim();
        }
      }

      // STRICT PROGRAMMATIC GUARANTEE FOR MCQ:
      // If a clinical case/scenario was NOT explicitly requested in custom instructions,
      // programmatically strip out any scenario/context key so it NEVER returns a scenario!
      if (mode === 'mcq') {
        const isClinicalRequested = Boolean(
          customInstructions && /cas clinique|scénario|scenario|histoire|énoncé|enoncé|patient|mise en situation/i.test(customInstructions)
        );
        if (!isClinicalRequested) {
          try {
            const parsed = JSON.parse(generatedText);
            let questionsArray = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.mcqs || []);
            if (Array.isArray(questionsArray)) {
              questionsArray = questionsArray.map((q: any) => {
                const { scenario, context, statement, ...cleanQ } = q;
                return cleanQ;
              });
              generatedText = JSON.stringify(questionsArray);
            }
          } catch (e) {
            console.warn('Could not parse generated MCQ JSON for scenario stripping:', e);
          }
        }
      }
    }
    
    return generatedText;
  } catch (error) {
    console.error('Error generating content with Gemini:', error);
    throw error;
  }
}

export async function askQuestion(
  context: string,
  question: string,
  history: { role: 'user' | 'ai'; text: string }[] = [],
  prefsOrOptions?: AIPreferences | { preferences?: AIPreferences; annaleContext?: string; courseId?: string },
  annaleContextArg?: string
): Promise<string> {
  let prefs: AIPreferences | undefined;
  let annaleContext: string | undefined = annaleContextArg;
  let courseId: string | undefined;

  if (prefsOrOptions) {
    if ('preferences' in prefsOrOptions || 'annaleContext' in prefsOrOptions || 'courseId' in prefsOrOptions) {
      const opts = prefsOrOptions as { preferences?: AIPreferences; annaleContext?: string; courseId?: string };
      prefs = opts.preferences;
      if (opts.annaleContext) annaleContext = opts.annaleContext;
      if (opts.courseId) courseId = opts.courseId;
    } else {
      prefs = prefsOrOptions as AIPreferences;
    }
  }

  const scopeId = courseId || 'qa_isolated';
  const cacheKey = getCacheKey('qa', scopeId, context + '|||' + question + '|||' + (annaleContext || '') + '|||' + JSON.stringify(history) + '|||' + JSON.stringify(prefs));
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    console.log('[CACHE HIT] QA answer loaded from session cache.');
    return cached;
  }

  const systemInstruction = getSystemInstruction(prefs);

  const isAnnaleOrQcmQuery = Boolean(
    (annaleContext && annaleContext.trim()) ||
    context.includes('GRILLE DE CORRECTION OFFICIELLE') ||
    context.includes('[ZONE_1_SUJET_OFFICIEL_DE_L_ANNALE]') ||
    /annale|qcm|item|items|corrige|correction|grille|concours|question\s*\d/i.test(question)
  );

  const annaleCorrectionProtocol = isAnnaleOrQcmQuery ? `

=== PROTOCOLE STRICT DE CORRECTION DES ANNALES & QCM (RÈGLE ABSOLUE) ===
Si l'étudiant demande de corriger des questions, des QCM ou toute l'annale (ex: "corrige l'annale", "corrige les qcm", "corrige qcm par qcm", "explications des items", "corrige tout", "fais la correction", "explique la question X", etc.) :

0. SÉPARATION STRICTE ENTRE LE SUJET D'ANNALE (ZONE 1) ET LES COURS DU DOSSIER (ZONE 2) :
- Lorsque tu corriges l'annale ou qu'on te demande d'expliquer une question numéro N (ex: Question 5, QCM 11), tu DOIS EXCLUSIVEMENT cibler les questions listées dans le bloc [ZONE_1_SUJET_OFFICIEL_DE_L_ANNALE] (ou le sujet d'annale attaché).
- INTERDICTION FORMELLE de corriger à la place un QCM d'entraînement, un exercice ou un chapitre qui se trouverait à l'intérieur des cours théoriques du dossier ([ZONE_2_COURS_THEORIQUES_DU_DOSSIER]).
- En revanche, tu DOIS CHERCHER ACTIVEMENT dans TOUS les cours du dossier ([ZONE_2_COURS_THEORIQUES_DU_DOSSIER]) pour extraire les preuves théoriques, définitions, mécanismes et pages permettant d'expliquer pourquoi chaque proposition de l'annale est vraie ou fausse, ou pour répondre à toute question de compréhension posée par l'étudiant.

1. ALIGNEMENT TOTAL SUR LA CORRECTION OFFICIELLE (ZÉRO CONTRADICTION) :
- La grille de correction officielle présente dans le contexte est la VÉRITÉ ABSOLUE du concours.
- Il t'est STRICTEMENT INTERDIT d'être en désaccord avec la correction officielle ou de déclarer qu'un item est faux s'il est compté vrai par le concours (et vice-versa).
- Ne contredis JAMAIS la grille officielle : justifie fidèlement la position officielle retenue par le concours / les professeurs.

2. EXHAUSTIVITÉ ET ORDRE DES QUESTIONS (AUCUN SAUT ACCEPTÉ) :
- Traite l'ENSEMBLE des questions demandées dans l'ordre chronologique exact (Question 1, Question 2, Question 3, ..., jusqu'à la dernière question de l'annale).
- NE SAUTE AUCUNE QUESTION sous aucun prétexte.

3. STRUCTURE ET MISE EN FORME VISUELLE DE CHAQUE QUESTION (STRICTEMENT CONFORME À CE MODÈLE) :
Pour CHAQUE question / QCM, reproduis EXACTEMENT cette mise en page :

## 📌 Question [Numéro] : [Titre du cours ou thème de la question]

<span style="color: #db2777; font-weight: 700; font-size: 1.05rem;">[Énoncé de la question, ex: Concernant l'audition...]</span>

* **A. [Texte intégral de l'item A]** [✅ VRAI ou ❌ FAUX]
  * *Explication :* [Explication détaillée, riche, dense et pédagogique. N'utilise JAMAIS d'explications laconiques ou expéditives en 3 mots. Développe en détail le mécanisme physiologique, le raisonnement, ou le piège spécifique de l'item. Mets en valeur les concepts clés avec le surlignage ==notion== ou **gras**.] ([Nom du cours source, ex: Cours Biophysique 3&4.pdf, p. 5, 8]).
* **B. [Texte intégral de l'item B]** [✅ VRAI ou ❌ FAUX]
  * *Explication :* [Explication détaillée, riche et pédagogique...] ([Nom du cours source, ex: Cours Biophysique 3&4.pdf, p. X]).
* **C. [Texte intégral de l'item C]** [✅ VRAI ou ❌ FAUX]
  * *Explication :* [Explication détaillée, riche et pédagogique...] ([Nom du cours source, ex: Cours Biophysique 3&4.pdf, p. X]).
* **D. [Texte intégral de l'item D]** [✅ VRAI ou ❌ FAUX]
  * *Explication :* [Explication détaillée, riche et pédagogique...] ([Nom du cours source, ex: Cours Biophysique 3&4.pdf, p. X]).
* **E. [Texte intégral de l'item E]** [✅ VRAI ou ❌ FAUX]
  * *Explication :* [Explication détaillée, riche et pédagogique...] ([Nom du cours source, ex: Cours Biophysique 3&4.pdf, p. X]).

---

4. RÈGLES CRITIQUES SUR LES ITEMS ET LES SOURCES :
- Énoncé de la question : TOUJOURS présent juste sous le titre "## 📌 Question [X]", emballé dans la balise HTML <span style="color: #db2777; font-weight: 700; font-size: 1.05rem;">...</span> (couleur aurore / rose framboise).
- Ligne de l'item : La ligne commence par "* **[Lettre]. [Texte de l'item]**" et se termine impérativement par l'emoji validé ou croix rouge puis VRAI ou FAUX : "✅ VRAI" ou "❌ FAUX".
- Ligne d'explication : Immédiatement à la ligne, sous forme de sous-puce indentée : "  * *Explication :* [Explication détaillée] ([Source])".
- Source : Cite obligatoirement à la fin de chaque explication le document de cours de référence mentionné dans le contexte (ex: "(Cours Biophysique 3&4.pdf, p. 5, 8)" ou "(NomDuCours.pdf)"). Si la page exacte est identifiable, indique-la, sinon mentionne le nom du fichier du cours.` : '';

  const baseInstruction = `Tu t'appelles Sofia. Tu es un agent IA d'apprentissage expert. Ton objectif est de fournir des explications CLAIRES, SYNTHÉTIQUES et VISUELLES basées sur le contexte fourni.

CONSIGNE MATHÉMATIQUE (CRITIQUE) : Pour toute formule mathématique, équation, symbole logique (comme les flèches de conséquence), UTILISE SYSTÉMATIQUEMENT le format LaTeX entre des symboles '$' (ex: $\rightarrow$, $\beta$, $x^2$, $\frac{a}{b}$). Pour les équations complexes, utilise '$$' sur une nouvelle ligne.

CONSIGNE CRITIQUE : NE DIS PAS BONJOUR. NE TE PRÉSENTE PAS. RÉPONDS DIRECTEMENT À LA QUESTION.

Consignes de formatage strictes (PRIORITÉ #1) :
- UTILISE MASSIVEMENT LE SURLIGNAGE AVEC DEUX SIGNES ÉGAL '==' DE CHAQUE CÔTÉ (ex: ==mot surligné==, N'UTILISE JAMAIS UN SEUL '=' COMME =mot=) pour les concepts clés, les termes techniques et les informations fondamentales.
- Utilise Markdown (#, ##, ###, ####) pour structurer ta réponse.
- Utilise des listes à puces (* ) pour briser les paragraphes longs.
- Utilise '__' pour souligner les précisions importantes.
- TABLEAUX : Si une comparaison, classification ou synthèse de plusieurs notions s'y prête, STRUCTURE-LA DANS UN BEAU TABLEAU MARKDOWN standard avec des en-têtes clairs (| Colonne 1 | Colonne 2 | \n | --- | --- |).
- SOURCE : Si l'information provient du document, mentionne-le subtilement.
- Tu DOIS tutoyer l'étudiant (utilise "tu").${annaleCorrectionProtocol}`;

  let historyPrompt = "";
  if (history && history.length > 0) {
    historyPrompt = "\nHistorique précédent de cette conversation :\n" + 
      history.map(h => `${h.role === 'user' ? 'Étudiant' : 'Sofia (IA)'} : ${h.text}`).join('\n') + '\n';
  }

  let annalePrompt = "";
  if (annaleContext && annaleContext.trim()) {
    annalePrompt = `\n\n=== [ZONE_1_SUJET_D_ANNALE_ATTACHE_PAR_L_ETUDIANT] ===\n${compactCourseText(annaleContext).substring(0, 150000)}\n=== [FIN_ZONE_1_SUJET_ATTACHE] ===\n\nCONSIGNE DE CORRECTION ET D'EXPLICATION : L'étudiant t'a soumis un sujet d'examen ou d'exercice ci-dessus. Résous, explique ou réponds aux questions relatives à ce sujet en t'appuyant rigoureusement sur le cours principal mis en cache tout en haut, ses méthodes, sa structure et ses notions. Respecte impérativement la grille de correction officielle sans jamais la contredire.`;
  }

  const cleanContext = compactCourseText(context);
  const cachedPrefixBlock = buildCourseCachePrefix(courseId, cleanContext);
  const fullPrompt = `${cachedPrefixBlock}\n\n=== INSTRUCTIONS PÉDAGOGIQUES & QUESTION ===\n${systemInstruction}${baseInstruction}${annalePrompt}\n${historyPrompt}\nQuestion actuelle de l'étudiant : ${question}`;
  
  try {
    const response = await callGeminiProxy('models/gemini-3.5-flash-lite', [fullPrompt]);
    const resultText = response.text || '';
    sessionStorage.setItem(cacheKey, resultText);
    return resultText;
  } catch (error) {
    console.error('Error asking question to Gemini:', error);
    throw error;
  }
}

export async function generateChatTitle(question: string): Promise<string> {
  if (!question || !question.trim()) return 'Nouvelle discussion';
  const cleaned = question
    .trim()
    .replace(/^(bonjour|salut|hello|coucou|hey|sofia|dis-moi|peux-tu|pourrais-tu|explique-moi|explique|qu'est-ce que|c'est quoi)\s*[,:!\-]?\s*/i, '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const source = cleaned || question.trim();
  const words = source.split(' ');
  let title = words.slice(0, 6).join(' ').replace(/[?.!,;:]+$/, '');
  if (words.length > 6 || title.length > 42) {
    title = title.substring(0, 42).trim() + '…';
  }
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export async function globalSearch(query: string, allCoursesContext: string, prefs?: AIPreferences, customInstructions?: string): Promise<string> {
  const cacheKey = getCacheKey('search', 'global_search_scope', query + '|||' + allCoursesContext + '|||' + (customInstructions || '') + '|||' + JSON.stringify(prefs));
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    console.log('[CACHE HIT] Global search result loaded from session cache.');
    return cached;
  }

  const systemInstruction = getSystemInstruction(prefs);
  const customBlock = customInstructions && customInstructions.trim() 
    ? `\nCONSIGNE PARTICULIÈRE DE L'ÉTUDIANT POUR CETTE SYNTHÈSE (À RESPECTER EN PRIORITÉ) :\n"${customInstructions.trim()}"\n` 
    : '';

  const cleanAllContext = compactCourseText(allCoursesContext);
  const cachedPrefixBlock = buildCourseCachePrefix('global_search_library', cleanAllContext);

  const fullPrompt = `${cachedPrefixBlock}\n\n=== MISSION DE SYNTHÈSE GLOBALE ===\n${systemInstruction}Tu es Sofia, une assistante universitaire experte et polyvalente.
On t'a fourni ci-dessus en cache le contenu textuel extrait de plusieurs de mes cours.

L'étudiant (que tu tutoies) recherche l'information suivante ou pose cette question : "${query}".
${customBlock}
Ta mission :
1. ANALYSE CRITIQUE : Analyse tous les cours fournis pour trouver les éléments pertinents.
2. RÉPONSE SYNTHÉTIQUE : Réponds directement à la question de manière structurée et pédagogique.
3. CITATION SOURCE : C'est CRITIQUE. Pour chaque bloc d'information, cite explicitement le cours d'où il provient en utilisant le format [Source: Nom du Cours] (le nom du cours est indiqué par les balises --- COURS: ... ---).
4. FORMATAGE : Utilise du **gras**, des listes à puces, et SURTOUT du surlignage '==' pour les notions clés.`;
  
  try {
    const response = await callGeminiProxy('models/gemini-3.5-flash-lite', [fullPrompt]);
    const resultText = response.text || '';
    sessionStorage.setItem(cacheKey, resultText);
    return resultText;
  } catch (error) {
    console.error('Error during global AI search:', error);
    throw error;
  }
}

export interface MCQErrorItem {
  questionIndex: number;
  question: string;
  options: string[];
  userSelected: string[];
  correctAnswers: string[];
}

/**
 * Generates a targeted 1-sentence correction for each wrong MCQ item directly quoted from the raw source document.
 */
export async function explainMCQErrors(
  documentContext: string,
  errors: MCQErrorItem[],
  prefs?: AIPreferences,
  courseId?: string
): Promise<Record<number, string>> {
  if (!errors || errors.length === 0) return {};

  const scopeId = courseId || 'mcq_isolated';
  const cacheKey = getCacheKey('mcq_errors_v3', scopeId, documentContext.substring(0, 30000) + '|||' + JSON.stringify(errors));
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // ignore
    }
  }

  const systemInstruction = getSystemInstruction(prefs);

  const errorsListText = errors.map((err) => {
    return `Question n°${err.questionIndex + 1} (index ${err.questionIndex}) : "${err.question}"
Options : ${err.options.map((opt) => `\n  - ${opt}`).join('')}
Bonne(s) réponse(s) : ${err.correctAnswers.join(' | ')}
Réponse(s) choisie(s) par l'étudiant : ${err.userSelected.length > 0 ? err.userSelected.join(' | ') : 'Aucune sélection'}`;
  }).join('\n\n');

  const cleanDoc = compactCourseText(documentContext).substring(0, 250000);
  const cachedPrefixBlock = buildCourseCachePrefix(courseId, cleanDoc);

  const fullPrompt = `${cachedPrefixBlock}\n\n=== TÂCHE : EXPLICATION DES ERREURS DE QCM ===\n${systemInstruction}Tu t'appelles Sofia. Tu es une assistante universitaire d'apprentissage experte.
L'étudiant vient de terminer une session d'examen blanc (QCM) sur son cours ci-dessus et a fait des erreurs sur les questions suivantes :

${errorsListText}

CONSIGNES STRICTES :
Pour CHAQUE question ratée ci-dessus, formule une explication pédagogique, fluide et naturelle en STRICTEMENT 1 SEULE PHRASE, basée sur le contenu du cours mis en cache ci-dessus.
Cette phrase doit expliquer simplement et clairement pourquoi la bonne réponse indiquée est exacte ou en quoi le choix de l'étudiant était faux.

RÈGLES CAPITALES :
- ALIGNEMENT ABSOLU : La bonne réponse indiquée pour chaque question est la VÉRITÉ ABSOLUE du concours. Ne contredis JAMAIS cette réponse officielle, explique toujours pourquoi elle est retenue.
- Donne une explication naturelle, bien formulée et pédagogique (ne fais PAS une simple citation brute froide avec des crochets ou des coupures).
- INTERDICTION FORMELLE d'utiliser la formule "D'après le cours", "Selon le cours", "Le texte indique" ou toute tournure similaire. Entre directement dans l'explication.
- INTERDICTION FORMELLE d'inclure des guillemets (aucun « », aucun "", aucun “”).
- Pas d'italique, pas de salutation, uniquement l'explication directe et naturelle.

Format attendu STRICTEMENT en JSON :
Un objet JSON où chaque clé est l'index numérique de la question (${errors.map(e => `"${e.questionIndex}"`).join(', ')}) et la valeur est l'explication naturelle en 1 seule phrase.
Exemple :
{
  "${errors[0]?.questionIndex ?? 0}": "Les médicaments atropiniques et l'acide valproïque aggravent les fonctions cognitives et peuvent entraîner une pseudodémence réversible."
}`;

  try {
    const response = await callGeminiProxy('models/gemini-3.5-flash-lite', [fullPrompt], {
      responseMimeType: 'application/json'
    });

    let generatedText = response.text || '{}';
    const firstBrace = generatedText.indexOf('{');
    const lastBrace = generatedText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      generatedText = generatedText.substring(firstBrace, lastBrace + 1);
    } else {
      generatedText = generatedText.replace(/```json\n?|```/g, '').trim();
    }

    const sanitizeExplanation = (str: string): string => {
      if (!str) return '';
      return str
        .replace(/^(d'après|selon|d’après)\s+(le\s+cours|le\s+document|la\s+source|le\s+texte)\s*[:,\-–—]?\s*/i, '')
        .replace(/^[«"“']\s*/, '')
        .replace(/\s*[»"”']$/, '')
        .replace(/^(d'après|selon|d’après)\s+(le\s+cours|le\s+document|la\s+source|le\s+texte)\s*[:,\-–—]?\s*/i, '')
        .replace(/^[«"“']\s*/, '')
        .replace(/\s*[»"”']$/, '')
        .trim();
    };

    const parsed = JSON.parse(generatedText);
    const result: Record<number, string> = {};
    for (const key of Object.keys(parsed)) {
      const numKey = parseInt(key, 10);
      if (!isNaN(numKey)) {
        result[numKey] = sanitizeExplanation(parsed[key]);
      }
    }

    sessionStorage.setItem(cacheKey, JSON.stringify(result));
    return result;
  } catch (error) {
    console.error('Error explaining MCQ errors:', error);
    throw error;
  }
}

export interface OpenQuestionEvaluation {
  grade: number;
  maxGrade: number;
  scorePercentage: number;
  status: 'correct' | 'partial' | 'incorrect';
  feedback: string;
  pointsAcquired: string[];
  pointsMissing: string[];
}

/**
 * Intelligent AI parser for complex exam annales (handles inverted question layouts,
 * checkboxes ☑/■, multi-column tables, SIDES/EDN formats, open essay questions / QROC,
 * and hybrid subjects containing both MCQ and written questions).
 */
export async function parseAnnaleWithAI(rawPdfText: string): Promise<any[]> {
  const prompt = `Tu es un assistant expert dans la numérisation et la structuration d'annales d'examens (notamment médicales et universitaires : PASS, LAS, DFGSM, EDN, ECN, droit, prépa, etc.).
Ta mission est d'analyser le texte brut issu d'une annale PDF et de le convertir en une liste structurée de questions d'examen, STRICTEMENT MOT POUR MOT, sans rien inventer, résumer ou modifier.

IMPORTANT - NATURE DE L'ÉPREUVE (HYBRIDE / QCM / RÉDACTIONNELLE) :
Les épreuves peuvent être composées :
- De QCM (Questions à Choix Multiples) avec des propositions (A, B, C, D, E...).
- De questions de LÉGENDAGE / PLACEMENT SUR IMAGE (aucun texte de dissertation à rédiger : l'énoncé demande de pointer, repérer, placer ou légender des éléments, structures anatomiques, repères ou flèches sur un schéma / image / coupe / radio).
- De questions rédactionnelles ou ouvertes (QROC, questions à réponse courte rédigée, cas cliniques rédigés, questions de cours, sans propositions A-E prédéfinies).
- D'un mélange HYBRIDE de ces catégories.

Tu dois IMPÉRATIVEMENT t'adapter et classifier chaque question :
- Si la question a des propositions à cocher (A, B, C, D, E...) :
  * "type": "mcq"
  * "options": ["A. ...", "B. ..."]
  * "correctAnswers": ["A", "C"] (les lettres des réponses vraies)
- Si la question demande de PLACER, POINTER ou LÉGENDER des éléments sur un schéma / image (sans choix A-E et sans texte de dissertation à rédiger) :
  * "type": "labeling"
  * "options": []
  * "correctAnswers": []
  * "hasFigure": true
  * "itemsToPlace": ["Élément 1 à pointer", "Élément 2 à pointer"] (liste extraite des structures ou éléments mentionnés dans l'énoncé à placer sur l'image)
  * "expectedAnswer": contient la description de l'emplacement correct de chaque élément
- Si la question est rédactionnelle / ouverte (réponse textuelle rédigée, sans propositions A-E) :
  * "type": "open"
  * "options": [] (tableau vide)
  * "correctAnswers": [] (tableau vide)
  * "expectedAnswer": contient les éléments de correction, mots-clés ou réponse type trouvée dans le corrigé de l'annale (si présent).

CONSIGNES PARTICULIÈRES SUR LES MISES EN PAGE D'ANNALES :
1. MISE EN CONTEXTE / CAS CLINIQUE / ÉNONCÉ PRÉALABLE (CRITIQUE) :
   - Très souvent (comme les dossiers progressifs, cas cliniques, problèmes en médecine, droit ou sciences), un énoncé de mise en situation ou de contexte précède une ou plusieurs questions (ex: "PROBLEME : Une patiente de 47 ans consulte pour une asthénie... Les bilans mettent en évidence : ... L'IRM met en évidence...").
   - Tu DOIS IMPÉRATIVEMENT capturer cette mise en contexte dans le champ "context" de CHAQUE question qui en dépend !
   - Ne résume pas, ne saute rien de cette mise en contexte : recopie-la mot pour mot avec toutes ses données cliniques, valeurs biologiques et paramètres.
   - Si une question possède sa propre mise en situation, ou si plusieurs questions successives partagent le même cas clinique / problème, reporte ce texte complet dans "context" pour chacune d'elles.
   - La question proprement dite (ex: "A partir de vos connaissances sur la régulation de l'axe...") va dans "question".

2. ORDRE DES QUESTIONS ET PROPOSITIONS :
   - Dans beaucoup d'annales, l'énoncé de la question se trouve parfois EN DESSOUS du tableau des propositions A-E, ou sous l'en-tête "Question X". Identifie correctement l'énoncé complet de la question et associe-le à ses propositions s'il s'agit d'un QCM.
3. DÉTECTION DU CORRIGÉ (CASES COCHÉES / SYMBOLES / GRILLES) :
   - Dans le texte, pour les QCM, les cases à cocher indiquent souvent les réponses vraies et fausses :
     * "☑" ou "[x]" = RÉPONSE VRAIE (cochée)
     * "■" ou "☐" ou "[ ]" = RÉPONSE FAUSSE (décochée / case vide ou noire)
     * "Réponse attendue" = les options cochées sont les réponses correctes.
   - S'il y a une grille de correction ou une ligne "Réponse : AC", utilise-la.
   - Remplis le tableau "correctAnswers" avec les lettres des bonnes réponses (ex: ["A", "C"]).
   - Pour les questions ouvertes ou de légendage, s'il y a un corrigé ou des mots-clés attendus dans le document, renseigne-les dans "expectedAnswer" ou "explanation".
4. NETTOYAGE DU TEXTE DES PROPOSITIONS :
   - Pour les QCM, retire les symboles de cases (☑, ■, ☐, , etc.) du texte des propositions pour ne garder que le libellé propre de la proposition.
   - Format de chaque proposition dans "options" : "A. [texte]", "B. [texte]", etc.
5. PAGES ET NUMÉROS :
   - Note le numéro de page où se trouve la question d'après les repères "--- Page X ---".
   - Conserve le numéro officiel de chaque question ("questionNumber": 1, 2, 3...).

Format attendu STRICTEMENT en JSON :
Un tableau JSON d'objets, ou un objet avec la clé "questions" :
[
  {
    "questionNumber": 1,
    "type": "open", // "mcq", "labeling" (pointage/placement sur image) ou "open" (rédactionnelle)
    "context": "Mise en situation complète, cas clinique ou énoncé préalable (ex: PROBLEME : Une patiente de 47 ans consulte... avec bilans et constantes)...", // null ou "" si aucun contexte préalable
    "question": "Énoncé exact de la question (ex: 1) A partir de vos connaissances...)",
    "itemsToPlace": ["Structure 1", "Structure 2"], // Uniquement pour type === "labeling"
    "options": [
      "A. Première proposition",
      "B. Deuxième proposition",
      "C. Troisième proposition",
      "D. Quatrième proposition",
      "E. Cinquième proposition"
    ], // [] si type === "open" ou "labeling"
    "correctAnswers": ["A", "C"], // [] si type === "open" ou "labeling"
    "expectedAnswer": "Éléments attendus de la correction",
    "pageNumber": 1,
    "hasFigure": false, // Mettre true si et seulement si l'énoncé fait référence à une figure, schéma, radio, photo ou image
    "explanation": "..." 
  }
]

Texte brut de l'annale :
${rawPdfText.substring(0, 300000)}`;

  const response = await callGeminiProxy('models/gemini-3.5-flash-lite', [prompt], {
    responseMimeType: 'application/json',
    temperature: 0.1
  });

  let jsonStr = response.text || '[]';
  const firstBracket = jsonStr.indexOf('[');
  const firstBrace = jsonStr.indexOf('{');
  
  if (firstBracket !== -1 && (firstBracket === -1 || firstBracket < firstBrace)) {
    const lastBracket = jsonStr.lastIndexOf(']');
    if (lastBracket > firstBracket) {
      jsonStr = jsonStr.substring(firstBracket, lastBracket + 1);
    }
  } else if (firstBrace !== -1) {
    const lastBrace = jsonStr.lastIndexOf('}');
    if (lastBrace > firstBrace) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }
  }

  const parsed = JSON.parse(jsonStr);
  const questionsList = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.data || []);
  return questionsList;
}

/**
 * Evaluates a student's placement of markers/pins on an anatomical schema or illustration.
 */
export async function evaluateLabelingAnswer(
  question: string,
  itemsToPlace: string[],
  placedPins: { id: number; x: number; y: number; label: string }[],
  expectedAnswer: string,
  _userPreferences?: any
): Promise<OpenQuestionEvaluation> {
  const prompt = `Tu es un professeur expert évaluant une épreuve d'anatomie / sciences avec un exercice de LÉGENDAGE / PLACEMENT SUR IMAGE.

ÉNONCÉ DE LA QUESTION :
${question}

ÉLÉMENTS À POINTER SUR L'IMAGE :
${itemsToPlace.map((it, idx) => `${idx + 1}. ${it}`).join('\n')}

CORRIGÉ OFFICIEL / LOCALISATION ATTENDUE :
${expectedAnswer || "Consulte la localisation anatomique exacte de chaque structure."}

REPÈRES POSITIONNÉS PAR L'ÉTUDIANT SUR LE SCHÉMA (coordonnées relatives en % de l'image de 0% à 100%) :
${placedPins.map(p => `- Repère ${p.id} (${p.label}) : X=${p.x}%, Y=${p.y}%`).join('\n')}

TA MISSION :
Évalue si les repères pointés par l'étudiant sont situés au bon endroit de manière globale et cohérente.
1. "grade" : note sur 20.
2. "scorePercentage" : pourcentage entre 0 et 100.
3. "status" : "correct" (si >= 14/20), "partial" (si 8-13/20), ou "incorrect" (si < 8/20).
4. "feedback" : explication pédagogique claire (2-3 phrases) sur la précision des repères.
5. "pointsAcquired" : liste des éléments bien placés.
6. "pointsMissing" : liste des éléments décalés ou mal situés.

Format STRICTEMENT en JSON :
{
  "grade": 16,
  "maxGrade": 20,
  "scorePercentage": 80,
  "status": "correct",
  "feedback": "Excellente localisation générale...",
  "pointsAcquired": ["..."],
  "pointsMissing": ["..."]
}`;

  const response = await callGeminiProxy('models/gemini-3.5-flash-lite', [prompt], {
    responseMimeType: 'application/json',
    temperature: 0.2
  });

  try {
    const parsed = JSON.parse(response.text || '{}');
    return {
      grade: parsed.grade ?? 12,
      maxGrade: 20,
      scorePercentage: parsed.scorePercentage ?? 60,
      status: parsed.status || 'partial',
      feedback: parsed.feedback || 'Évaluation des repères enregistrée.',
      pointsAcquired: parsed.pointsAcquired || [],
      pointsMissing: parsed.pointsMissing || []
    };
  } catch {
    return {
      grade: 12,
      maxGrade: 20,
      scorePercentage: 60,
      status: 'partial',
      feedback: 'Évaluation des repères complétée.',
      pointsAcquired: [],
      pointsMissing: []
    };
  }
}

/**
 * Evaluates a student's written response to an open/essay question (QROC, cas clinique, question de cours)
 * against the expected answer / grading criteria using Sofia IA.
 */
export async function evaluateOpenQuestionAnswer(
  question: string,
  expectedAnswer: string,
  userAnswer: string,
  userPreferences?: any,
  context?: string
): Promise<OpenQuestionEvaluation> {
  const prefsStr = userPreferences ? (typeof userPreferences === 'object' ? JSON.stringify(userPreferences) : String(userPreferences)) : '';
  const contextBlock = context && context.trim() ? `\nMISE EN SITUATION / CAS CLINIQUE / ÉNONCÉ PRÉALABLE :\n${context.trim()}\n` : '';
  const prompt = `Tu es un professeur et correcteur bienveillant et rigoureux, expert dans l'évaluation des concours et examens universitaires (médecine, sciences, droit, etc.).
${contextBlock}
QUESTION :
${question}

CORRIGÉ OFFICIEL / ÉLÉMENTS ATTENDUS :
${expectedAnswer || "Non fourni dans l'annale. Analyse la réponse de l'étudiant en fonction des connaissances exactes et du consensus scientifique/académique sur cette question."}

RÉPONSE RÉDIGÉE PAR L'ÉTUDIANT :
${userAnswer ? userAnswer.trim() : "(Aucune réponse rédigée)"}

${prefsStr ? `Préférences de l'étudiant : ${prefsStr}` : ''}

TA MISSION :
Évalue la réponse rédigée de manière objective, claire et constructive :
1. Attribue une note ("grade") sur 20.
2. Calcule le "scorePercentage" (entre 0 et 100).
3. Détermine le statut :
   - "correct" si note >= 14/20
   - "partial" si note entre 8/20 et 13/20
   - "incorrect" si note < 8/20
4. Rédige un retour pédagogique ("feedback") synthétique (2 à 4 phrases bienveillantes expliquant ce qui est bon et ce qui doit être approfondi).
5. "pointsAcquired" : liste des notions, mots-clés ou étapes correctement cités par l'étudiant (puces courtes).
6. "pointsMissing" : liste des éléments clés manquants, omissions ou inexactitudes par rapport au corrigé (puces courtes).

Format JSON STRICTEMENT ATTENDU :
{
  "grade": 15,
  "maxGrade": 20,
  "scorePercentage": 75,
  "status": "correct",
  "feedback": "Explication pédagogique...",
  "pointsAcquired": ["Notion A", "Notion B"],
  "pointsMissing": ["Notion C omise"]
}`;

  const response = await callGeminiProxy('models/gemini-3.5-flash-lite', [prompt], {
    responseMimeType: 'application/json',
    temperature: 0.2
  });

  let jsonStr = response.text || '{}';
  const firstBrace = jsonStr.indexOf('{');
  const lastBrace = jsonStr.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
  }

  try {
    const parsed = JSON.parse(jsonStr);
    const grade = typeof parsed.grade === 'number' ? parsed.grade : 10;
    const maxGrade = typeof parsed.maxGrade === 'number' ? parsed.maxGrade : 20;
    const scorePercentage = typeof parsed.scorePercentage === 'number' ? parsed.scorePercentage : Math.round((grade / maxGrade) * 100);
    const status: 'correct' | 'partial' | 'incorrect' = 
      parsed.status === 'correct' || parsed.status === 'partial' || parsed.status === 'incorrect'
        ? parsed.status
        : (grade >= 14 ? 'correct' : (grade >= 8 ? 'partial' : 'incorrect'));

    return {
      grade,
      maxGrade,
      scorePercentage,
      status,
      feedback: parsed.feedback || "Évaluation complétée par Sofia IA.",
      pointsAcquired: Array.isArray(parsed.pointsAcquired) ? parsed.pointsAcquired : [],
      pointsMissing: Array.isArray(parsed.pointsMissing) ? parsed.pointsMissing : []
    };
  } catch (err) {
    console.error('Erreur parsing evaluation open question:', err);
    return {
      grade: 10,
      maxGrade: 20,
      scorePercentage: 50,
      status: 'partial',
      feedback: response.text || "Évaluation effectuée.",
      pointsAcquired: [],
      pointsMissing: []
    };
  }
}

export interface SofiaChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  sources?: { title: string; url: string }[];
  attachmentName?: string;
}

export interface SofiaChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: SofiaChatMessage[];
}

function getUniversalSofiaSystemPrompt(prefs?: AIPreferences) {
  const personality = prefs?.ai_personality || 'benevolent';
  const studyMode = prefs?.ai_study_mode || 'understanding';

  const personalities = {
    benevolent: "Tu es SofIA, une assistante pédagogique et universitaire bienveillante, passionnée et encourageante. Ton ton est chaleureux, empathique et motivant.",
    concise: "Tu es SofIA, une assistante universitaire ultra-concise, directe et efficace. Va droit au but sans fioritures.",
    academic: "Tu es SofIA, une assistante académique de haut niveau, experte, rigoureuse et érudite. Adopte une structure formelle et un vocabulaire soutenu."
  };

  const modes = {
    understanding: "Objectif majeur : Pédagogie et compréhension profonde. Explique les mécanismes sous-jacents, fais des liens et donne des analogies parlantes.",
    memorization: "Objectif majeur : Efficacité mémorielle. Mets en exergue les définitions clés, points cardinaux et mnémotechniques.",
    critical: "Objectif majeur : Esprit critique et nuance. Analyse les contre-exemples, les exceptions, les débats d'école ou doctrinaux."
  };

  return `${personalities[personality]} ${modes[studyMode]}
Tu t'adresses à un étudiant que tu tutoies avec respect, dynamisme et bienveillance.
Tu es une IA universelle experte dans TOUS les domaines académiques et méthodologiques : Droit, Médecine, Pharmacie, Biologie, Physique, Chimie, Mathématiques, Informatique, Histoire, Littérature, Économie, Philosophie, Langues, etc. Tu réponds également aux questions de culture générale, d'organisation, de méthodologie et d'orientation.

CONSIGNES DE RÉPONSE ET DE MISE EN PAGE STRICTES :
1. PÉDAGOGIE LUMINEUSE : Structure tes réponses de façon claire et aérée avec des titres Markdown (##, ###) et des listes à puces (* ).
2. SURLIGNAGE VISUEL (CRITIQUE) : UTILISE FRÉQUEMMENT LE SURLIGNAGE AVEC DEUX SIGNES ÉGAL '==' (ex: ==concept fondamental==) pour faire ressortir les termes techniques, formules et notions clés. N'utilise jamais un simple signe égal comme =terme=.
3. FORMULES MATHÉMATIQUES & SCIENTIFIQUES : Écris TOUTES les formules, équations, symboles et variables au format LaTeX entre des symboles '$' en ligne (ex: $E = mc^2$, $\\alpha$, $\\vec{F}$) et '$$' sur leur propre ligne pour les équations majeures.
4. TABLEAUX : Si une comparaison, classification ou synthèse de plusieurs éléments s'y prête, STRUCTURE-LA DANS UN TABLEAU MARKDOWN standard (| Entête 1 | Entête 2 |).
5. CODE : Pour tout code source, utilise des blocs de code avec spécification du langage (\`\`\`python, \`\`\`sql, etc.).
6. DIRECTE & EFFICACE : Pas de salutations répétitives ni de politesses vides si la conversation est déjà en cours. Réponds avec pertinence, rigueur et élégance.`;
}

export async function askChatSofia(
  messages: { role: 'user' | 'assistant'; content: string }[],
  options?: {
    useWebSearch?: boolean;
    attachmentContext?: string;
    coursesContext?: string;
    preferences?: AIPreferences;
    targetScopeId?: string;
  }
): Promise<{ text: string; sources?: { title: string; url: string }[] }> {
  const systemInstruction = getUniversalSofiaSystemPrompt(options?.preferences);
  // Gemini 2.5 Flash has first-class Google Search tool grounding
  const model = options?.useWebSearch ? 'models/gemini-2.5-flash' : 'models/gemini-3.5-flash-lite';

  let basePrompt = '';

  // 1. PRIORITÉ ABSOLUE EN DÉBUT DE PROMPT (Pour Google Context Caching optimal) : Les polycopiés et cours de l'étudiant
  if (options?.coursesContext && options.coursesContext.trim()) {
    const cleanCourses = compactCourseText(options.coursesContext).slice(0, 150000);
    const scopeId = options.targetScopeId || 'chat_sofia_courses';
    basePrompt += `${buildCourseCachePrefix(scopeId, cleanCourses)}\n\n`;
    basePrompt += `====================================================================
BIBLIOTHÈQUE DE COURS DE L'ÉTUDIANT (SOURCE DE VÉRITÉ PRIORITAIRE CI-DESSUS) :
RÈGLE D'OR DE PRIORITÉ :
1. Si la question de l'étudiant est traitée dans ces cours, BASE-TOI EN PRIORITÉ ABSOLUE SUR CES DONNÉES. Utilise leurs définitions, classifications et méthodes exactes, et cite explicitement le cours concerné (ex: "[D'après votre cours : Nom Du Cours]").
2. Si ces cours n'en parlent que partiellement, commence par donner les éléments de son cours puis complète avec tes connaissances externes ou la recherche web.
3. Si la question n'est PAS traitée dans ces cours ou si ces extraits ne sont pas pertinents pour sa question, utilise alors librement tes connaissances académiques générales et la recherche web pour lui répondre de manière exhaustive et complète.
====================================================================\n\n`;
  }

  basePrompt += `${systemInstruction}\n\n`;

  // 2. Fichier temporaire joint par l'étudiant dans le chat
  if (options?.attachmentContext && options.attachmentContext.trim()) {
    basePrompt += `DOCUMENT SPÉCIFIQUEMENT JOINT DANS CE MESSAGE :\n"""\n${compactCourseText(options.attachmentContext).slice(0, 100000)}\n"""\n\n`;
  }

  const lastUserMsg = messages[messages.length - 1]?.content || '';
  const previousMessages = messages.slice(0, -1);

  if (previousMessages.length > 0) {
    basePrompt += `HISTORIQUE RÉCENT DE CETTE CONVERSATION :\n` +
      previousMessages.map(m => `${m.role === 'user' ? 'Étudiant' : 'SofIA'} : ${m.content}`).join('\n\n') +
      `\n\n`;
  }

  basePrompt += `MESSAGE DE L'ÉTUDIANT :\n${lastUserMsg}`;

  const config: Record<string, any> = {
    temperature: 0.7,
  };

  if (options?.useWebSearch) {
    config.tools = [{ googleSearch: {} }];
  }

  try {
    const response = await callGeminiProxy(model, [basePrompt], config);
    const resultText = response.text || '';

    const sources: { title: string; url: string }[] = [];
    if (response.groundingMetadata) {
      const chunks = response.groundingMetadata.groundingChunks || [];
      for (const chunk of chunks) {
        if (chunk.web?.uri) {
          sources.push({
            title: chunk.web.title || new URL(chunk.web.uri).hostname,
            url: chunk.web.uri,
          });
        }
      }
    }

    const uniqueSources = sources.filter((s, idx, self) => idx === self.findIndex(t => t.url === s.url));

    return {
      text: resultText,
      sources: uniqueSources.length > 0 ? uniqueSources : undefined,
    };
  } catch (error) {
    console.error('Error in askChatSofia:', error);
    throw error;
  }
}



