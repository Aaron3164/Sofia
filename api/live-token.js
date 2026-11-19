import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const LIVE_AUDIO_MODEL = 'models/gemini-2.5-flash-native-audio-latest';
const MAX_COURSE_CONTEXT_CHARS = 120000; // ~25 000 à 30 000 mots (couvre 40 à 50 pages de cours complet)

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

  // 1. Authentification stricte via JWT Supabase & Décompte de 1 crédit par appel vocal
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

    // Décompte de 1 crédit sur le quota quotidien (5/j gratuit, 50/j premium)
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

    const { courseTitle = 'Cours sans titre', courseContext = '', courseSummary = '', voice = 'Kore' } = body || {};
    const safeTitle = String(courseTitle).slice(0, 120);
    const safeContext = String(courseContext || '').trim().slice(0, MAX_COURSE_CONTEXT_CHARS);
    const safeSummary = String(courseSummary || '').trim().slice(0, 25000);
    const safeVoice = ['Kore', 'Zephyr', 'Aoede', 'Leda'].includes(voice) ? voice : 'Kore';

    if (!safeContext && !safeSummary) {
      if (quotaWasIncremented && supabaseClient) {
        await supabaseClient.rpc('decrement_ai_usage').catch(() => {});
      }
      return res.status(400).json({ error: 'Aucun contenu de cours disponible pour la discussion vocale.' });
    }

    // Prompt adaptatif avec checklist obligatoire sur la synthèse
    const systemInstruction = `Tu es Sofia, une partenaire d'apprentissage intelligente, vivante et captivante.
Tu accompagnes l'étudiant sur son cours intitulé : "${safeTitle}".

${safeSummary ? `SYNTHÈSE CLÉ DU COURS (CHECKLIST PRIORITAIRE ABSOLUE) :
"""
${safeSummary}
"""
` : ''}SUPPORT DÉTAILLÉ DU COURS :
"""
${safeContext}
"""

TES MISSIONS D'ÉCHANGE ET D'ACCOMPAGNEMENT :
${safeSummary ? `1. COUVERTURE TOTALE DE LA SYNTHÈSE (RÈGLE D'OR) :
   - Le texte ci-dessus intitulé "SYNTHÈSE CLÉ DU COURS" contient TOUTES les notions, classifications, mécanismes et points cruciaux que l'étudiant DOIT maîtriser pour son examen.
   - Tu as une checklist mentale de TOUTES les notions mentionnées dans cette synthèse.
   - Ton devoir est de t'assurer qu'au fil de la discussion, TOUTES ces notions clés soient abordées, expliquées ou validées ensemble.
   - Si l'étudiant ne t'en parle pas de lui-même ou s'attarde sur autre chose, c'est à TOI d'amener habilement les notions manquantes dans la conversation (ex: "Au fait, il y a un autre point super important dans ce cours qu'on n'a pas encore touché...", "Et d'ailleurs, comment tu expliques... ?").
   - Ne laisse AUCUN point de la synthèse de côté avant la fin de l'échange.

2. Discussion vivante, naturelle et libre :` : `1. Discussion vivante, naturelle et libre :`}
   - Tu es complice, passionnée et encourageante (pas un interrogateur robotique).
   - Adapte-toi immédiatement à la façon dont l'étudiant veut apprendre :
     * S'il te demande d'expliquer sous forme d'histoire ou de métaphore imagée : fais-le avec talent et inventivité tout en respectant scrupuleusement la vérité du cours !
     * S'il veut faire un jeu de questions/réponses rapides : joue le jeu.
     * S'il veut que tu lui résumes un mécanisme complexe : sois limpide et captivante.
   - Tu peux débattre, rebondir, faire des analogies ou lui demander ce qu'il en pense.

${safeSummary ? '3' : '2'}. Format oral spontané :
   - Parle comme dans un vrai appel vocal : phrases directes, vivantes (2 à 4 phrases par réplique). Tutoie l'étudiant.
   - Évite les longs monologues magistraux : laisse-le réagir, pose-lui une mini-relance ou valide avec lui avant d'enchaîner.`;

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
                  voiceName: safeVoice
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

