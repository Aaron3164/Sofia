import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Server-side in-memory cache for repeated queries / documents
// key -> { text, groundingMetadata, expiresAt }
const responseCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours TTL
const MAX_CACHE_ENTRIES = 500;

function cleanOldCache() {
  const now = Date.now();
  for (const [key, item] of responseCache.entries()) {
    if (now > item.expiresAt) {
      responseCache.delete(key);
    }
  }
  // Trim oldest if exceeding max entries
  if (responseCache.size > MAX_CACHE_ENTRIES) {
    const keysToDelete = Array.from(responseCache.keys()).slice(0, 50);
    keysToDelete.forEach(k => responseCache.delete(k));
  }
}

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

  // Compute deterministic cache key from model, contents and config
  let cacheKey = null;
  try {
    const rawKey = `${model}:::${JSON.stringify(contents)}:::${JSON.stringify(config || {})}`;
    let hash = 5381;
    for (let i = 0; i < rawKey.length; i++) {
      hash = (hash * 33) ^ rawKey.charCodeAt(i);
    }
    cacheKey = `gemini_cache_${(hash >>> 0).toString(36)}_${rawKey.length}`;
  } catch (e) {
    console.warn('[Cache] Could not compute cacheKey:', e);
  }

  // Check server cache first: if hit, return immediately WITHOUT deducting user quota!
  if (cacheKey && responseCache.has(cacheKey)) {
    const cachedItem = responseCache.get(cacheKey);
    if (Date.now() < cachedItem.expiresAt) {
      return res.status(200).json({
        text: cachedItem.text,
        groundingMetadata: cachedItem.groundingMetadata,
        cached: true
      });
    } else {
      responseCache.delete(cacheKey);
    }
  }

  if (supabaseUrl && supabaseAnonKey) {
    // Client initialized with user's access token so auth.uid() is populated in Supabase RPC
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Session invalide ou expirée. Veuillez vous reconnecter.' });
    }

    // 2. Strict Server-Side Quota Verification & Increment
    const { data: quotaAllowed, error: quotaError } = await supabase.rpc('check_and_increment_ai_usage');

    if (quotaError) {
      console.error('[Gemini Proxy] Erreur RPC quota:', quotaError.message);
      // Only skip if the function does not exist in DB yet
      if (!quotaError.message.includes('does not exist')) {
        return res.status(500).json({ error: 'Erreur lors de la vérification de vos quotas IA.' });
      }
    } else if (quotaAllowed === false) {
      return res.status(429).json({ 
        error: 'QUOTA_EXCEEDED',
        message: 'Limite quotidienne de générations IA atteinte (10/jour en gratuit, 100/jour en Premium). Revenez demain ou passez Premium !'
      });
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

    // Robust retry loop (up to 3 attempts) for 503 / UNAVAILABLE / high demand
    let attempts = 0;
    let lastError = null;

    while (attempts < 3) {
      try {
        attempts++;
        const response = await ai.models.generateContent({
          model,
          contents,
          config,
        });

        const responseText = response.text || '';
        const groundingMeta = response.candidates?.[0]?.groundingMetadata || null;

        // Save in server cache for instant repeat reuse without hitting Gemini or consuming quota
        if (cacheKey && responseText) {
          cleanOldCache();
          responseCache.set(cacheKey, {
            text: responseText,
            groundingMetadata: groundingMeta,
            expiresAt: Date.now() + CACHE_TTL_MS
          });
        }

        return res.status(200).json({ 
          text: responseText,
          groundingMetadata: groundingMeta
        });
      } catch (err) {
        lastError = err;
        const errMsg = String(err?.message || err);
        const is503 = errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('high demand');
        
        if (is503 && attempts < 3) {
          console.warn(`[Gemini Proxy] Serveur Gemini saturé (tentative ${attempts}/3). Réessai dans 1.5s...`);
          await new Promise((r) => setTimeout(r, 1500));
        } else {
          throw err;
        }
      }
    }

    throw lastError;
  } catch (error) {
    console.error('[Gemini Proxy Error]:', error);
    return res.status(500).json({ 
      error: error.message || 'Erreur lors de la génération avec Gemini.',
      details: error.toString()
    });
  }
}
