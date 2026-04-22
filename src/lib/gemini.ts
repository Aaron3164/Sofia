import { GoogleGenAI } from '@google/genai';
import { supabase } from './supabase';

export type AIPreferences = {
  theme?: 'light' | 'dark' | 'glass';
  ai_personality?: 'benevolent' | 'concise' | 'academic';
  ai_study_mode?: 'understanding' | 'memorization' | 'critical';
  ai_auto_flashcards?: boolean;
};

const getGeminiClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  // Debug log pour vérifier la présence de la clé (sans l'afficher)
  console.log('[DEBUG] Gemini API Key détectée:', apiKey ? 'OUI (longueur: ' + apiKey.length + ')' : 'NON (Vide)');

  if (!apiKey) {
    throw new Error('La clé API Gemini (VITE_GEMINI_API_KEY) est manquante. Vérifiez vos réglages Vercel.');
  }
  
  return new GoogleGenAI(apiKey);
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
  if (error) {
    if (error.message.includes('does not exist')) return;
    throw new Error('Erreur technique lors de la vérification du quota.');
  }
  if (!data) {
    throw new Error('Limite de 20 générations par jour atteinte. Passez au pack Premium !');
  }
}

function getSystemInstruction(prefs?: AIPreferences) {
  const personality = prefs?.ai_personality || 'benevolent';
  const studyMode = prefs?.ai_study_mode || 'understanding';
  const personalities = {
    benevolent: "Tu es Sofia, une assistante bienveillante. Tu DOIS tutoyer l'étudiant.",
    concise: "Tu es Sofia, une assistante ultra-concise. Tu DOIS tutoyer l'étudiant.",
    academic: "Tu es Sofia, une assistante académique experte. Tu DOIS tutoyer l'étudiant."
  };
  const modes = {
    understanding: "Objectif : COMPRÉHENSION approfondie.",
    memorization: "Objectif : MÉMORISATION efficace.",
    critical: "Objectif : ESPRIT CRITIQUE et nuances."
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
    flashcards: `Crée entre 50 et 60 flashcards JSON.`,
    mcq: `Génère 10 questions QCM JSON.`,
    resume: `Fais un résumé exhaustif en Markdown.`
  };
  const fullPrompt = `${systemInstruction}${prompts[mode]}\n\nContext:\n${promptContext}`;
  try {
    const response = await ai.models.generateContent({
        model: 'models/gemini-3.1-flash-lite-preview',
        contents: [fullPrompt]
    });
    return response.text || '';
  } catch (error) {
    throw error;
  }
}

export async function askQuestion(context: string, question: string, prefs?: AIPreferences): Promise<string> {
  await ensureQuota();
  const ai = getGeminiClient();
  const fullPrompt = `${getSystemInstruction(prefs)}Contexte: ${context}\nQuestion: ${question}`;
  try {
    const response = await ai.models.generateContent({
        model: 'models/gemini-3.1-flash-lite-preview',
        contents: [fullPrompt],
    });
    return response.text || '';
  } catch (error) {
    throw error;
  }
}

export async function generateChatTitle(question: string): Promise<string> {
  const ai = getGeminiClient();
  try {
    const response = await ai.models.generateContent({
        model: 'models/gemini-3.1-flash-lite-preview',
        contents: [`Titre court (3-5 mots) pour : "${question}"`],
    });
    return (response.text || 'Nouvelle discussion').trim();
  } catch {
    return 'Nouvelle discussion';
  }
}

export async function globalSearch(query: string, allCoursesContext: string, prefs?: AIPreferences): Promise<string> {
  await ensureQuota();
  const ai = getGeminiClient();
  const fullPrompt = `${getSystemInstruction(prefs)}Recherche sur : "${query}"\nContexte : ${allCoursesContext}`;
  try {
    const response = await ai.models.generateContent({
        model: 'models/gemini-3.1-flash-lite-preview',
        contents: [fullPrompt],
    });
    return response.text || '';
  } catch (error) {
    throw error;
  }
}
