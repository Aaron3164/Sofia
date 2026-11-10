import { createClient } from '@supabase/supabase-js';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://exsmiwmcuqabczguyaen.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

const accountId = process.env.R2_ACCOUNT_ID || process.env.VITE_R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.VITE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.VITE_R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME || process.env.VITE_R2_BUCKET_NAME;

function isR2Url(url) {
  return typeof url === 'string' && (url.includes('r2.cloudflarestorage.com') || url.includes('.r2.dev'));
}

function extractR2Key(url) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/^\//, '');
  } catch (e) {
    return url;
  }
}

/**
 * Supprime définitivement le compte d'un utilisateur et TOUTES ses données associées :
 * 1. Base Supabase : course_data, nodes, spaced_repetition, mcq_grades, annales_grades, course_stats, ai_usage, profiles.
 * 2. Cloudflare R2 : Tous les fichiers PDF de cours et pièces jointes uploadés par cet utilisateur.
 * 3. Auth Supabase : Suppression complète du compte dans auth.users.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée. Utilisez POST.' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return res.status(401).json({ error: 'Token d\'authentification manquant.' });
  }

  try {
    // 1. Valider l'identité de l'utilisateur connecté via Supabase Auth
    const userClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4c21pd21jdXFhYmN6Z3V5YWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyOTE4OTgsImV4cCI6MjA4OTg2Nzg5OH0.MzsYbHAIZytFoU5gMYjcqc9CAl21BQXRRw6i9QiAdVE', {
      global: {
        headers: { Authorization: `Bearer ${token}` }
      }
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Session invalide ou expirée.' });
    }

    const userId = user.id;

    // 2. Récupérer toutes les URLs de fichiers stockés sur Cloudflare R2 avant de purger les tables
    const r2KeysToDelete = new Set();
    try {
      const { data: userCourses } = await userClient
        .from('course_data')
        .select('pdf_url, naive_attachments')
        .eq('user_id', userId);

      if (userCourses && Array.isArray(userCourses)) {
        userCourses.forEach((row) => {
          if (isR2Url(row?.pdf_url)) {
            const key = extractR2Key(row.pdf_url);
            if (key) r2KeysToDelete.add(key);
          }
          if (Array.isArray(row?.naive_attachments)) {
            row.naive_attachments.forEach((att) => {
              if (isR2Url(att?.url)) {
                const key = extractR2Key(att.url);
                if (key) r2KeysToDelete.add(key);
              }
            });
          }
        });
      }
    } catch (fetchErr) {
      console.warn('[DeleteAccount] Avertissement recherche fichiers R2:', fetchErr.message);
    }

    // 3. Supprimer tous les fichiers physiques sur Cloudflare R2
    if (r2KeysToDelete.size > 0 && accountId && accessKeyId && secretAccessKey && bucketName) {
      try {
        const s3 = new S3Client({
          region: 'auto',
          endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
          credentials: { accessKeyId, secretAccessKey },
        });

        await Promise.allSettled(
          Array.from(r2KeysToDelete).map((key) =>
            s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }))
          )
        );
        console.log(`[DeleteAccount] ${r2KeysToDelete.size} fichiers R2 supprimés avec succès pour l'utilisateur ${userId}.`);
      } catch (r2Err) {
        console.warn('[DeleteAccount] Avertissement purge Cloudflare R2:', r2Err.message);
      }
    }

    // 4. Purger l'ensemble des données applicatives de l'utilisateur dans Supabase (Tables SQL)
    await Promise.allSettled([
      userClient.from('course_data').delete().eq('user_id', userId),
      userClient.from('nodes').delete().eq('user_id', userId),
      userClient.from('spaced_repetition').delete().eq('user_id', userId),
      userClient.from('mcq_grades').delete().eq('user_id', userId),
      userClient.from('annales_grades').delete().eq('user_id', userId),
      userClient.from('course_stats').delete().eq('user_id', userId),
      userClient.from('ai_usage').delete().eq('user_id', userId),
      userClient.from('profiles').delete().eq('id', userId),
    ]);

    // 5. Supprimer le compte utilisateur dans le système d'authentification Supabase (auth.users)
    if (supabaseServiceKey) {
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);
      if (deleteUserError) {
        console.warn('[DeleteAccount] Avertissement suppression auth.admin:', deleteUserError.message);
      }
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Votre compte et l\'intégralité de vos données (Supabase et Cloudflare R2) ont été définitivement supprimés.' 
    });
  } catch (error) {
    console.error('[DeleteAccount] Erreur fatale :', error);
    return res.status(500).json({ error: error.message || 'Erreur lors de la suppression du compte.' });
  }
}
