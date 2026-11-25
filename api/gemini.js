import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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

  // 1. Authenticate user via Supabase JWT
  const authHeader = req.headers.authorization || req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentification requise : token manquant.' });
  }

  const token = authHeader.replace('Bearer ', '').trim();

  let supabaseClient = null;
  let authenticatedUserId = null;
  let quotaWasIncremented = false;

  if (supabaseUrl && supabaseAnonKey) {
    // Client initialized with user's access token so auth.uid() is populated in Supabase RPC
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Session invalide ou expirée. Veuillez vous reconnecter.' });
    }
    authenticatedUserId = user.id;

    // 2. Strict Server-Side Quota Verification & Increment (RPC already checks user plan)
    const { data: quotaAllowed, error: quotaError } = await supabaseClient.rpc('check_and_increment_ai_usage');

    if (quotaError) {
      console.error('[Gemini Proxy] Erreur RPC quota:', quotaError.message);
      // Only skip if the function does not exist in DB yet
      if (!quotaError.message.includes('does not exist')) {
        return res.status(500).json({ error: 'Erreur lors de la vérification de vos quotas IA.' });
      }
    } else if (quotaAllowed === false) {
      return res.status(429).json({ 
        error: 'QUOTA_EXCEEDED',
        message: 'Limite quotidienne de générations IA atteinte (5/jour en gratuit, 50/jour en Premium). Revenez demain ou passez Premium !'
      });
    } else if (quotaAllowed === true) {
      quotaWasIncremented = true;
    }
  }

  let apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (apiKey) apiKey = apiKey.replace(/^["']|["']$/g, '');
  if (!apiKey) {
    return res.status(500).json({ error: 'La clé GEMINI_API_KEY est manquante dans les variables d\'environnement du serveur Vercel.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }
    
    const { model = 'models/gemini-3.5-flash-lite', contents, config } = body || {};

    if (!contents) {
      return res.status(400).json({ error: 'Contenu manquant pour la génération.' });
    }

    // Garde-fou serveur anti-explosion de tokens en sortie (inclut les éventuels thinking tokens sur Gemini 2.5/3.x)
    const MAX_ALLOWED_OUTPUT_TOKENS = 20000;
    const requestedMax = Number(config?.maxOutputTokens);
    const safeConfig = {
      ...(config || {}),
      maxOutputTokens: Number.isFinite(requestedMax) && requestedMax > 0
        ? Math.min(requestedMax, MAX_ALLOWED_OUTPUT_TOKENS)
        : 8192,
      // Évite les faux positifs de censure sur les cours de médecine/reproduction/anatomie
      safetySettings: config?.safetySettings || [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ]
    };

    const ai = new GoogleGenAI({ apiKey });

    // Unified resilient cascade for all users:
    // 1. models/gemini-3.5-flash-lite (500 RPD free tier, prioritaire)
    // 2. models/gemini-3.1-flash-lite (500 RPD free tier)
    // 3. models/gemini-2.5-flash (20 RPD fallback / web search grounding)
    // Total free capacity: 1,000+ generations/day, 0€ cost.
    const candidateModels = model === 'models/gemini-2.5-flash'
      ? ['models/gemini-2.5-flash', 'models/gemini-3.5-flash-lite', 'models/gemini-3.1-flash-lite']
      : [
          'models/gemini-3.5-flash-lite',
          'models/gemini-3.1-flash-lite',
          'models/gemini-2.5-flash'
        ];

    let lastError = null;
    let fallbackMaxTokensResult = null;

    for (const currentModel of candidateModels) {
      try {
        const fastConfig = config?.thinkingConfig
          ? safeConfig
          : { ...safeConfig, thinkingConfig: { thinkingBudget: 0 } };

        let response;
        try {
          response = await ai.models.generateContent({
            model: currentModel,
            contents,
            config: fastConfig,
          });
        } catch (innerErr) {
          const innerMsg = String(innerErr?.message || innerErr);
          // Si ce modèle précis refuse thinkingBudget: 0 (400 / INVALID_ARGUMENT), réessayer sans thinkingConfig
          if (!config?.thinkingConfig && (innerMsg.includes('400') || innerMsg.includes('INVALID_ARGUMENT') || innerMsg.toLowerCase().includes('thinking'))) {
            response = await ai.models.generateContent({
              model: currentModel,
              contents,
              config: safeConfig,
            });
          } else {
            throw innerErr;
          }
        }

        const candidate = response.candidates?.[0];
        const finishReason = candidate?.finishReason;
        const textOut = response.text || '';
        const trimmedOut = textOut.trim();
        const looksCutMidBullet = /(?:^|\n)\s*[*-]$/.test(trimmedOut);

        // Si le modèle a coupé pour SAFETY/RECITATION ou texte vide, basculer sur le suivant
        if (!trimmedOut || (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS')) {
          console.warn(`[Gemini Proxy] Modèle ${currentModel} interrompu (finishReason=${finishReason}, len=${textOut.length}). Basculement...`);
          lastError = new Error(`Réponse interrompue (${finishReason || 'EMPTY'}) sur ${currentModel}`);
          continue;
        }

        // Si le modèle a saturé MAX_TOKENS ou coupé sur une puce isolée, garder en secours et tenter le modèle suivant
        if (finishReason === 'MAX_TOKENS' || looksCutMidBullet) {
          console.warn(`[Gemini Proxy] Modèle ${currentModel} tronqué (finishReason=${finishReason}, len=${textOut.length}). Tentative sur le modèle suivant...`);
          if (!fallbackMaxTokensResult || textOut.length > fallbackMaxTokensResult.text.length) {
            fallbackMaxTokensResult = {
              text: textOut,
              groundingMetadata: candidate?.groundingMetadata || null,
              usageMetadata: response.usageMetadata || null
            };
          }
          continue;
        }

        return res.status(200).json({ 
          text: textOut,
          groundingMetadata: candidate?.groundingMetadata || null,
          usageMetadata: response.usageMetadata || null
        });
      } catch (err) {
        lastError = err;
        const errMsg = String(err?.message || err);
        const isTransientOrMissing =
          errMsg.includes('503') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('high demand') ||
          errMsg.includes('overloaded') ||
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('404') ||
          errMsg.includes('NOT_FOUND');

        if (isTransientOrMissing) {
          console.warn(`[Gemini Proxy] Modèle ${currentModel} indisponible/saturé (${errMsg.slice(0, 80)}). Basculement immédiat...`);
          continue;
        }
        throw err;
      }
    }

    if (fallbackMaxTokensResult) {
      return res.status(200).json(fallbackMaxTokensResult);
    }

    throw lastError;
  } catch (error) {
    console.error('[Gemini Proxy Error]:', error);
    // Refund the daily quota credit if the Gemini call failed completely
    if (quotaWasIncremented && supabaseClient && authenticatedUserId) {
      try {
        const now = new Date();
        const utcDate = now.toISOString().split('T')[0];

        // 1. Try modern schema (user_id, usage_date, generation_count)
        const { data: dateRow, error: dateErr } = await supabaseClient
          .from('ai_usage')
          .select('generation_count, usage_date')
          .eq('user_id', authenticatedUserId)
          .order('usage_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!dateErr && dateRow && typeof dateRow.generation_count === 'number' && dateRow.generation_count > 0) {
          await supabaseClient
            .from('ai_usage')
            .update({ generation_count: Math.max(0, dateRow.generation_count - 1) })
            .eq('user_id', authenticatedUserId)
            .eq('usage_date', dateRow.usage_date || utcDate);
        } else {
          // 2. Fallback to legacy schema (user_id, count)
          const { data: usageRow } = await supabaseClient
            .from('ai_usage')
            .select('count')
            .eq('user_id', authenticatedUserId)
            .maybeSingle();
          if (usageRow && typeof usageRow.count === 'number' && usageRow.count > 0) {
            await supabaseClient
              .from('ai_usage')
              .update({ count: Math.max(0, usageRow.count - 1) })
              .eq('user_id', authenticatedUserId);
          }
        }
      } catch (refundErr) {
        console.warn('[Gemini Proxy] Could not refund quota credit:', refundErr);
      }
    }
    return res.status(500).json({ 
      error: error.message || 'Erreur lors de la génération avec Gemini.',
      details: error.toString()
    });
  }
}
