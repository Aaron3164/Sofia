import { GoogleGenAI } from '@google/genai';
import { supabase } from './supabase';

export type AIPreferences = {
  theme?: 'light' | 'dark' | 'glass';
  ai_personality?: 'benevolent' | 'concise' | 'academic';
  ai_study_mode?: 'understanding' | 'memorization' | 'critical';
  ai_auto_flashcards?: boolean;
};

// MODÈLE QUE VOUS UTILISIEZ (Quota 1500/jour)
const TARGET_MODEL = 'gemini-3.1-flash-lite-preview';

/**
 * Initialisation sécurisée du client Gemini
 */
const getGeminiClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('La clé API Gemini est manquante dans votre environnement Vercel.');
  }
  
  // Utilisation de la syntaxe objet pour la version 1.46+ de @google/genai
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
     throw new Error('Limite de 20 générations par jour atteinte. Passez au pack Premium !');
  }
}

function getSystemInstruction(prefs?: AIPreferences) {
  const personality = prefs?.ai_personality || 'benevolent';
  const studyMode = prefs?.ai_study_mode || 'understanding';
  const personalities = {
    benevolent: "Tu es Sofia, une assistante bienveillante. Tu DOIS tutoyer l'étudiant.",
    concise: "Tu es Sofia, une assistante concise. Tu DOIS tutoyer l'étudiant.",
    academic: "Tu es Sofia, une assistante académique. Tu DOIS tutoyer l'étudiant."
  };
  const modes = {
    understanding: "Objectif : COMPRÉHENSION.",
    memorization: "Objectif : MÉMORISATION.",
    critical: "Objectif : ESPRIT CRITIQUE."
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
    flashcards: `Génère des flashcards JSON (front/back).`,
    mcq: `Génère 10 questions QCM JSON.`,
    resume: `Génère un résumé détaillé en Markdown.`
  };

  try {
    const response = await ai.models.generateContent({
        model: TARGET_MODEL,
        contents: `${systemInstruction}${prompts[mode]}\n\nContext:\n${promptContext}`
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
  try {
    const response = await ai.models.generateContent({
        model: TARGET_MODEL,
        contents: `${systemInstruction}Contexte: ${context}\n\nQuestion: ${question}`,
    });
    return response.text || '';
  } catch (error) {
    console.error('Gemini Chat Error:', error);
    throw error;
  }
}

export async function generateChatTitle(question: string): Promise<string> {
  const ai = getGeminiClient();
  try {
    const response = await ai.models.generateContent({
        model: TARGET_MODEL,
        contents: `Titre de 3 mots pour : "${question}"`,
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
  try {
    const response = await ai.models.generateContent({
        model: TARGET_MODEL,
        contents: `${systemInstruction}Recherche sur : "${query}"\n\nContexte :\n${allCoursesContext}`,
    });
    return response.text || '';
  } catch (error) {
    console.error('Gemini Search Error:', error);
    throw error;
  }
}
