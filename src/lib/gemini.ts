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

// ... le reste du fichier reste identique ...

