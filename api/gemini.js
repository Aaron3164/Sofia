import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
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

        return res.status(200).json({ text: response.text || '' });
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
