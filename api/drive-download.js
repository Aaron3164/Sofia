// API Vercel Serverless pour télécharger un flux PDF depuis Google Drive en mémoire
// ZÉRO stockage sur Cloudflare R2 - ce serveur retransmet uniquement le flux binaire au client.

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const fileId = req.query.fileId || req.body?.fileId;
  const token = req.query.token || req.body?.token || req.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (!fileId) {
    return res.status(400).json({ error: 'fileId est requis' });
  }

  try {
    let driveRes;

    // 1. Si un jeton OAuth 2.0 est disponible
    if (token) {
      driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!driveRes.ok) {
        const errorText = await driveRes.text();
        return res.status(driveRes.status).json({
          error: `Google Drive API error: ${driveRes.statusText}`,
          details: errorText
        });
      }
    } else {
      // 2. Si aucun jeton, tentative sur le lien de téléchargement direct
      const initialUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      driveRes = await fetch(initialUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      const contentType = driveRes.headers.get('content-type') || '';
      
      // Si Google renvoie une page HTML de confirmation (ex: avertissement virus pour gros fichiers)
      if (contentType.includes('text/html')) {
        const html = await driveRes.text();
        const confirmMatch = html.match(/confirm=([0-9A-Za-z_-]+)/);
        
        if (confirmMatch && confirmMatch[1]) {
          const confirmUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=${confirmMatch[1]}`;
          driveRes = await fetch(confirmUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
          });
        } else {
          return res.status(403).json({
            error: "Impossible d'accéder au document Google Drive. Assurez-vous que le fichier est partagé avec 'Tous les utilisateurs disposant du lien' ou utilisez l'explorateur Google Drive connecté.",
          });
        }
      }
    }

    if (!driveRes.ok) {
      return res.status(driveRes.status).json({
        error: "Erreur lors du téléchargement du PDF depuis Google Drive.",
      });
    }

    const arrayBuffer = await driveRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(buffer);
  } catch (err) {
    console.error('Erreur drive-download:', err);
    return res.status(500).json({
      error: err.message || 'Erreur serveur interne lors du téléchargement Google Drive',
    });
  }
}
