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
  
  console.log('[DEBUG] Gemini API Key détectée:', apiKey ? 'OUI (longueur: ' + apiKey.length + ')' : 'NON (Vide)');

  if (!apiKey) {
    throw new Error('La clé API Gemini est manquante.');
  }
  
  // On repasse au format Objet { apiKey: ... } qui est requis par votre version
  return new GoogleGenAI({ apiKey: apiKey });
};

// ... (Tout le reste du fichier reste identique au bloc précédent) ...
// (Veillez à bien garder toutes les fonctions exportées en dessous)
