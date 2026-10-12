import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

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

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Session invalide ou expirée.' });
    }
  }

  const accountId = process.env.R2_ACCOUNT_ID || process.env.VITE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.VITE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.VITE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME || process.env.VITE_R2_BUCKET_NAME;
  const publicUrlBase = process.env.R2_PUBLIC_URL || process.env.VITE_R2_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    return res.status(500).json({
      error: 'Cloudflare R2 is not fully configured. Missing R2 environment variables (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME).'
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

    const { filename, contentType = 'application/pdf', folder = 'pdfs' } = body || {};

    if (!filename) {
      return res.status(400).json({ error: 'filename is required' });
    }

    // Clean filename
    const ext = filename.split('.').pop() || 'pdf';
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

    // 1-hour presigned PUT URL
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    let publicUrl = '';
    if (publicUrlBase) {
      publicUrl = `${publicUrlBase.replace(/\/$/, '')}/${key}`;
    } else {
      publicUrl = `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${key}`;
    }

    return res.status(200).json({
      uploadUrl,
      publicUrl,
      key
    });
  } catch (error) {
    console.error('[R2 Presign Error]:', error);
    return res.status(500).json({ error: error.message || String(error) });
  }
}
