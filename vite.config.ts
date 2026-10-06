import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { GoogleGenAI } from '@google/genai';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  let apiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (apiKey) apiKey = apiKey.replace(/^["']|["']$/g, ''); // Fix quote issue

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

          server.middlewares.use('/api/r2-presign', async (req, res) => {
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

            const accountId = env.R2_ACCOUNT_ID || env.VITE_R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || process.env.VITE_R2_ACCOUNT_ID;
            const accessKeyId = env.R2_ACCESS_KEY_ID || env.VITE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || process.env.VITE_R2_ACCESS_KEY_ID;
            const secretAccessKey = env.R2_SECRET_ACCESS_KEY || env.VITE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || process.env.VITE_R2_SECRET_ACCESS_KEY;
            const bucketName = env.R2_BUCKET_NAME || env.VITE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME || process.env.VITE_R2_BUCKET_NAME;
            const publicUrlBase = env.R2_PUBLIC_URL || env.VITE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL || process.env.VITE_R2_PUBLIC_URL;

            if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ 
                error: 'Cloudflare R2 non configuré. Veuillez renseigner R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY et R2_BUCKET_NAME dans le fichier .env' 
              }));
            }

            let bodyStr = '';
            req.on('data', (chunk) => {
              bodyStr += chunk;
            });
            req.on('end', async () => {
              try {
                const { filename, contentType = 'application/pdf', folder = 'pdfs' } = JSON.parse(bodyStr || '{}');
                if (!filename) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ error: 'filename is required' }));
                }

                const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
                const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

                const cleanName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
                const randomSuffix = Math.random().toString(36).substring(2, 9);
                const key = `${folder}/${Date.now()}-${randomSuffix}-${cleanName}`;

                const s3 = new S3Client({
                  region: 'auto',
                  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
                  credentials: {
                    accessKeyId,
                    secretAccessKey,
                  },
                });

                const command = new PutObjectCommand({
                  Bucket: bucketName,
                  Key: key,
                  ContentType: contentType,
                });

                const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
                const publicUrl = publicUrlBase
                  ? `${publicUrlBase.replace(/\/$/, '')}/${key}`
                  : `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${key}`;

                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ uploadUrl, publicUrl, key }));
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: err?.message || String(err) }));
              }
            });
          });

          server.middlewares.use('/api/r2-delete', async (req, res) => {
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

            const accountId = env.R2_ACCOUNT_ID || env.VITE_R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || process.env.VITE_R2_ACCOUNT_ID;
            const accessKeyId = env.R2_ACCESS_KEY_ID || env.VITE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || process.env.VITE_R2_ACCESS_KEY_ID;
            const secretAccessKey = env.R2_SECRET_ACCESS_KEY || env.VITE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || process.env.VITE_R2_SECRET_ACCESS_KEY;
            const bucketName = env.R2_BUCKET_NAME || env.VITE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME || process.env.VITE_R2_BUCKET_NAME;

            if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: 'Cloudflare R2 non configuré' }));
            }

            let bodyStr = '';
            req.on('data', (chunk) => {
              bodyStr += chunk;
            });
            req.on('end', async () => {
              try {
                const { url, key: objectKey } = JSON.parse(bodyStr || '{}');
                let targetKey = objectKey;
                if (!targetKey && url) {
                  try {
                    const parsedUrl = new URL(url);
                    targetKey = parsedUrl.pathname.replace(/^\//, '');
                  } catch (e) {
                    targetKey = url;
                  }
                }

                if (!targetKey) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ error: 'url or key is required' }));
                }

                const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
                const s3 = new S3Client({
                  region: 'auto',
                  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
                  credentials: { accessKeyId, secretAccessKey },
                });

                const command = new DeleteObjectCommand({
                  Bucket: bucketName,
                  Key: targetKey,
                });

                await s3.send(command);

                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: true, deletedKey: targetKey }));
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: err?.message || String(err) }));
              }
            });
          });

          server.middlewares.use('/api/drive-download', async (req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

            if (req.method === 'OPTIONS') {
              res.statusCode = 200;
              return res.end();
            }

            const parsedReqUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
            const fileId = parsedReqUrl.searchParams.get('fileId');
            const token = parsedReqUrl.searchParams.get('token') || req.headers.authorization?.replace(/^Bearer\s+/i, '');

            if (!fileId) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: 'fileId est requis' }));
            }

            try {
              let driveRes: any;
              if (token) {
                driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                if (!driveRes.ok) {
                  res.statusCode = driveRes.status;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ error: `Google Drive API error: ${driveRes.statusText}` }));
                }
              } else {
                const initialUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
                driveRes = await fetch(initialUrl, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  }
                });

                const contentType = driveRes.headers.get('content-type') || '';
                if (contentType.includes('text/html')) {
                  const html = await driveRes.text();
                  const confirmMatch = html.match(/confirm=([0-9A-Za-z_-]+)/);
                  if (confirmMatch && confirmMatch[1]) {
                    const confirmUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=${confirmMatch[1]}`;
                    driveRes = await fetch(confirmUrl, {
                      headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                      }
                    });
                  } else {
                    res.statusCode = 403;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({
                      error: "Impossible d'accéder au document Google Drive. Assurez-vous que le fichier est partagé avec 'Tous les utilisateurs disposant du lien' ou utilisez l'explorateur Google Drive connecté."
                    }));
                  }
                }
              }

              if (!driveRes.ok) {
                res.statusCode = driveRes.status;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: "Erreur lors du téléchargement du PDF depuis Google Drive." }));
              }

              const arrayBuf = await driveRes.arrayBuffer();
              const buffer = Buffer.from(arrayBuf);

              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader('Content-Length', buffer.length.toString());
              res.statusCode = 200;
              return res.end(buffer);
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: err?.message || String(err) }));
            }
          });
        }
      }
    ]
  };
});
