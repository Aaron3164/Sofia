import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

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

  const accountId = process.env.R2_ACCOUNT_ID || process.env.VITE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.VITE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.VITE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME || process.env.VITE_R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    return res.status(500).json({
      error: 'Cloudflare R2 is not fully configured.'
    });
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

    const { url, key: objectKey } = body || {};

    let targetKey = objectKey;
    if (!targetKey && url) {
      // Extract key from public URL if full URL is passed
      try {
        const parsedUrl = new URL(url);
        targetKey = parsedUrl.pathname.replace(/^\//, '');
      } catch (e) {
        targetKey = url;
      }
    }

    if (!targetKey) {
      return res.status(400).json({ error: 'url or key is required' });
    }

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: targetKey,
    });

    await s3.send(command);

    return res.status(200).json({
      success: true,
      deletedKey: targetKey
    });
  } catch (error) {
    console.error('[R2 Delete Error]:', error);
    return res.status(500).json({ error: error.message || String(error) });
  }
}
