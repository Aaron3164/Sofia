import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const LIVE_AUDIO_MODEL = 'models/gemini-2.5-flash-native-audio-latest';
const MAX_COURSE_CONTEXT_CHARS = 22000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Authentification stricte via JWT Supabase
  const authHeader = req.headers.authorization || req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentification requise : token manquant.' });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  let supabaseClient = null;
  let quotaWasIncremented = false;

  if (supabaseUrl && supabaseAnonKey) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Session invalide ou expirée. Veuillez vous reconnecter.' });
    }

    // Vérification & décompte du quota serveur (1 crédit par session vocale)
    const { data: quotaAllowed, error: quotaError } = await supabaseClient.rpc('check_and_increment_ai_usage');
    if (quotaError) {
      console.error('[LiveToken] Erreur RPC quota:', quotaError.message);
      if (!quotaError.message.includes('does not exist')) {
        return res.status(500).json({ error: 'Erreur lors de la vérification de vos quotas IA.' });
      }
    } else if (quotaAllowed === false) {
      return res.status(429).json({
        error: 'QUOTA_EXCEEDED',
        message: 'Limite quotidienne atteinte (5/jour en gratuit, 50/jour en Premium). Revenez demain ou passez Premium !'
      });
    } else if (quotaAllowed === true) {
      quotaWasIncremented = true;
    }
  }

  let apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (apiKey) apiKey = apiKey.replace(/^["']|["']$/g, '');
  if (!apiKey) {
    return res.status(500).json({ error: 'Clé GEMINI_API_KEY manquante côté serveur.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const { courseTitle = 'Cours sans titre', courseContext = '' } = body || {};
    const safeTitle = String(courseTitle).slice(0, 120);
    const safeContext = String(courseContext || '').trim().slice(0, MAX_COURSE_CONTEXT_CHARS);

    if (!safeContext) {
      if (quotaWasIncremented && supabaseClient) {
        await supabaseClient.rpc('decrement_ai_usage').catch(() => {});
      }
      return res.status(400).json({ error: 'Aucun contenu de cours disponible pour la discussion vocale.' });
    }

    // Prompt ultra-concis chargé uniquement pour "Parle avec Sofia"
    const systemInstruction = `Tu es Sofia, tutrice vocale dynamique et bienveillante.
Cours étudié : "${safeTitle}".
Contenu de référence :
"""
${safeContext}
"""
Règles pour l'oral :
- Parle en français naturel, tutoie l'étudiant, fais des réponses courtes (2 à 3 phrases max).
- Base-toi uniquement sur le cours ci-dessus (ne t'invente pas de notions hors-sujet).
- Dès le début, salue brièvement et pose une première question précise sur une notion clé du cours.
- Après chaque réponse de l'étudiant : valide ou corrige avec pédagogie, puis pose la question suivante (ou un mini cas concret).`;

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: 'v1alpha' }
    });

    const expireTime = new Date(Date.now() + 12 * 60 * 1000).toISOString(); // 12 min max

    const ephemeralToken = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        liveConnectConstraints: {
          model: LIVE_AUDIO_MODEL,
          config: {
            responseModalities: ['AUDIO'],
            outputAudioTranscription: {},
            inputAudioTranscription: {},
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: 'Aoede'
                }
              }
            },
            systemInstruction: {
              parts: [{ text: systemInstruction }]
            }
          }
        }
      }
    });

    return res.status(200).json({
      token: ephemeralToken.name,
      model: LIVE_AUDIO_MODEL,
      expiresAt: expireTime
    });
  } catch (error) {
    console.error('[LiveToken] Erreur création token éphémère:', error);
    if (quotaWasIncremented && supabaseClient) {
      await supabaseClient.rpc('decrement_ai_usage').catch(() => {});
    }
    return res.status(500).json({
      error: error?.message || 'Impossible de démarrer la session vocale.'
    });
  }
}

