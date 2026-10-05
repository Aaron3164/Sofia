import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { GoogleGenAI } from '@google/genai';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  return {
    plugins: [
      react(),
      {
        name: 'gemini-api-dev-middleware',
        configureServer(server) {
          server.middlewares.use('/api/gemini', async (req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            if (req.method === 'OPTIONS') {
              res.statusCode = 200;
              return res.end();
            }

            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: 'Method not allowed' }));
            }

            if (!apiKey) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: 'La clé GEMINI_API_KEY est manquante dans .env' }));
            }

            let bodyStr = '';
            req.on('data', (chunk) => {
              bodyStr += chunk;
            });
            req.on('end', async () => {
              try {
                const body = JSON.parse(bodyStr || '{}');
                const { model = 'models/gemini-3.5-flash-lite', contents, config } = body;

                const ai = new GoogleGenAI({ apiKey });
                let attempts = 0;
                let lastError: any = null;

                while (attempts < 3) {
                  try {
                    attempts++;
                    const response = await ai.models.generateContent({ model, contents, config });
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ text: response.text || '' }));
                  } catch (err: any) {
                    lastError = err;
                    const errMsg = String(err?.message || err);
                    if ((errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('high demand')) && attempts < 3) {
                      await new Promise((r) => setTimeout(r, 1500));
                    } else {
                      throw err;
                    }
                  }
                }
                throw lastError;
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: err?.message || String(err) }));
              }
            });
          });
        }
      }
    ]
  };
});
