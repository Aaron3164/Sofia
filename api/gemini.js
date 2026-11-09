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
  let isPremiumUser = false;

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

    // Fetch user plan for tier segmentation (Premium vs Free)
    try {
      const { data: profileData } = await supabaseClient
        .from('profiles')
        .select('plan, premium_until')
        .eq('id', user.id)
        .maybeSingle();

      if (profileData && profileData.plan === 'premium') {
        const isExpired = profileData.premium_until
          ? new Date(profileData.premium_until) < new Date()
          : false;
        isPremiumUser = !isExpired;
      }
    } catch (profileErr) {
      console.warn('[Gemini Proxy] Impossible de vérifier le plan utilisateur, repli sur gratuit:', profileErr);
    }

    // 2. Strict Server-Side Quota Verification & Increment
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

    const ai = new GoogleGenAI({ apiKey });

    // Unified resilient cascade for all users:
    // 1. models/gemini-3.5-flash-lite (500 RPD free tier)
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

    for (const currentModel of candidateModels) {
      let attempts = 0;
      while (attempts < 2) {
        try {
          attempts++;
          const response = await ai.models.generateContent({
            model: currentModel,
            contents,
            config,
          });

          return res.status(200).json({ 
            text: response.text || '',
            groundingMetadata: response.candidates?.[0]?.groundingMetadata || null,
            usageMetadata: response.usageMetadata || null
          });
        } catch (err) {
          lastError = err;
          const errMsg = String(err?.message || err);
          const is503Or404 =
            errMsg.includes('503') ||
            errMsg.includes('UNAVAILABLE') ||
            errMsg.includes('high demand') ||
            errMsg.includes('overloaded') ||
            errMsg.includes('404') ||
            errMsg.includes('NOT_FOUND');
          
          if (is503Or404) {
            console.warn(`[Gemini Proxy] Modèle ${currentModel} indisponible (${errMsg.slice(0, 80)}). Tentative ${attempts}/2...`);
            if (errMsg.includes('404') || errMsg.includes('NOT_FOUND')) {
              break; // Switch immediately to next fallback model if model name is not found
            }
            await new Promise((r) => setTimeout(r, 1200));
          } else {
            // Not a 503/404 error, rethrow immediately
            throw err;
          }
        }
      }
      console.warn(`[Gemini Proxy] Basculement automatique vers le modèle de secours suite à indisponibilité de ${currentModel}`);
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
