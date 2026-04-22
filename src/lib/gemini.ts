import { GoogleGenAI } from '@google/genai';
import { supabase } from './supabase';

export type AIPreferences = {
  theme?: 'light' | 'dark' | 'glass';
  ai_personality?: 'benevolent' | 'concise' | 'academic';
  ai_study_mode?: 'understanding' | 'memorization' | 'critical';
  ai_auto_flashcards?: boolean;
};

const TARGET_MODEL = 'gemini-3.1-flash-lite-preview';

const getGeminiClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('La clé API Gemini est manquante.');
  return new GoogleGenAI({ apiKey });
};

export async function getDailyUsage(): Promise<number> {
  const { data, error } = await supabase
    .from('ai_usage')
    .select('count')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .single();
  if (error || !data) return 0;
  return data.count;
}

async function ensureQuota() {
  const { data, error } = await supabase.rpc('check_and_increment_ai_usage');
  if (error || !data) {
     throw new Error('Limite de 20 générations par jour atteinte.');
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

  return `${personalities[personality]} ${modes[studyMode]}\n\n`;
}

export async function generateStudyMaterials(
  promptContext: string,
  mode: 'flashcards' | 'mcq' | 'resume',
  prefs?: AIPreferences
): Promise<string> {
  await ensureQuota();
  const ai = getGeminiClient();
  const systemInstruction = getSystemInstruction(prefs);

  const prompts = {
    flashcards: `Crée entre 50 et 60 flashcards de type Anki à partir de ce texte. Extraie TOUS les concepts, détails et définitions de manière exhaustive. 

CONSIGNE RECTO (front) : Sois explicite dans la question pour que l'étudiant sache précisément quoi répondre (ex: "Quelle est la définition de [concept] ?", "Quelles sont les 3 conditions de [X] ?", "En quoi consiste l'exception de [Y] ?"). Évite les questions trop vagues comme juste un nom de concept.

CONSIGNE VERSO (back) : Les réponses doivent rester CONCISES (entre 2 et 15 mots maximum). On veut une information percutante, pas de longs paragraphes.

Réponds STRICTEMENT en français. Format attendu : un tableau JSON d'objets avec "front" (question) et "back" (réponse).`,
    mcq: `Génère exactement 10 questions à choix multiples de niveau intermédiaire basées sur le texte. Il peut y avoir UNE ou PLUSIEURS bonnes réponses (format QCM multi-choix). 
Réponds STRICTEMENT en français. Format attendu : un tableau JSON d'objects avec "question", "options" (tableau de 4 ou 5 cordes), et "correctAnswers" (tableau contenant les réponses exactes).`,
    resume: `Tu es un expert en synthèse pédagogique. Ta mission est de créer un compte-rendu ULTRA-DÉTAILLÉ et EXHAUSTIF du texte fourni. 
    
CONSIGNE DE LONGUEUR ET DE PRÉCISION : NE SAUTE AUCUNE PARTIE. Analyse le texte section par section, paragraphe par paragraphe. Si une information est dans le texte, elle DOIT être dans ton résumé. Je préfère un texte très long plutôt qu'un texte qui oublie des détails.

CONSIGNE CRITIQUE : NE DIS PAS BONJOUR. NE TE PRÉSENTE PAS. COMMENCE IMMÉDIATEMENT PAR LE TITRE DU RÉSUMÉ OU LE PREMIER CHAPITRE. 

Consignes de formatage strictes :
- Utilise '# ', '## ', '### ', '#### ' pour la structure hiérarchique.
- Fais des listes à puces avec '* ' pour chaque détail important.
- Mets en **gras** les termes techniques.
- UTILISE MASSIVEMENT ET SYSTÉMATIQUEMENT '==' POUR SURLIGNER TOUTES LES INFORMATIONS LES PLUS FONDAMENTALES. 
- Utilise '__' pour souligner les nuances.
- Ne fais pas de conclusion ou de transition, reste sur le contenu pur.

Rédige tout en français de manière extrêmement précise, complète et académique.`
  };

  try {
    const response = await ai.models.generateContent({
        model: TARGET_MODEL,
        contents: `${systemInstruction}${prompts[mode]}\n\nContenu :\n${promptContext}`
    });
    return response.text || '';
  } catch (error) {
    console.error('Gemini Error:', error);
    throw error;
  }
}

export async function askQuestion(context: string, question: string, prefs?: AIPreferences): Promise<string> {
  await ensureQuota();
  const ai = getGeminiClient();
  const systemInstruction = getSystemInstruction(prefs);

  const baseInstruction = `Tu t'appelles Sofia. Tu es un agent IA d'apprentissage expert. Ton objectif est de fournir des explications CLAIRES, SYNTHÉTIQUES et VISUELLES.

CONSIGNE MATHÉMATIQUE (CRITIQUE) : Pour toute formule mathématique, équation, matrice ou symbole logique (comme les flèches de conséquence), UTILISE SYSTÉMATIQUEMENT le format LaTeX entre des symboles '$' (ex: $\rightarrow$, $\beta$, $x^2$, $\frac{a}{b}$). Pour les équations complexes, utilise '$$' sur une nouvelle ligne.

CONSIGNE CRITIQUE : NE DIS PAS BONJOUR. NE TE PRÉSENTE PAS. NE DIS PAS "SALUT C'EST SOFIA". RÉPONDS DIRECTEMENT À LA QUESTION.

Consignes de formatage strictes (PRIORITÉ #1) :
- UTILISE MASSIVEMENT LE SURLIGNAGE '==' pour les concepts clés, les termes techniques et les informations fondamentales.
- Utilise Markdown (#, ##, ###, ####) pour structurer ta réponse.
- Utilise des listes à puces (* ) pour briser les paragraphes longs.
- Utilise '__' pour souligner les précisions importantes.
- Tu DOIS tutoyer l'étudiant (utilise "tu").`;

  const fullPrompt = `${systemInstruction}${baseInstruction}\n\nContexte :\n${context}\n\nQuestion de l'étudiant : ${question}`;
  
  try {
    const response = await ai.models.generateContent({
        model: TARGET_MODEL,
        contents: fullPrompt,
    });
    return response.text || '';
  } catch (error) {
    console.error('Error asking question to Gemini:', error);
    throw error;
  }
}

export async function generateChatTitle(question: string): Promise<string> {
  const ai = getGeminiClient();
  try {
    const response = await ai.models.generateContent({
        model: TARGET_MODEL,
        contents: `Génère un titre très court (3 à 5 mots maximum) résumant cette question posée par un étudiant : "${question}".\nNe retourne QUE le titre, sans guillemets.`,
    });
    return (response.text || 'Nouvelle discussion').trim();
  } catch (error) {
    return 'Nouvelle discussion';
  }
}

export async function globalSearch(query: string, allCoursesContext: string, prefs?: AIPreferences): Promise<string> {
  await ensureQuota();
  const ai = getGeminiClient();
  const systemInstruction = getSystemInstruction(prefs);
  const fullPrompt = `${systemInstruction}Tu es un assistant universitaire expert.\nOn te fournit ci-dessous le contenu textuel extrait de plusieurs cours.\n\nL'étudiant recherche où un professeur a parlé du sujet suivant : "${query}".\n\nMission :\n1. Analyse le contexte.\n2. Détermine dans quels cours ce sujet est abordé.\n3. Fournis un résumé de ce qui a été dit.\n4. Rédige ta réponse de façon claire et structurée.\n\nContexte :\n${allCoursesContext}`;
  
  try {
    const response = await ai.models.generateContent({
        model: TARGET_MODEL,
        contents: fullPrompt,
    });
    return response.text || '';
  } catch (error) {
    console.error('Error during global AI search:', error);
    throw error;
  }
}
