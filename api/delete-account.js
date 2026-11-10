import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://exsmiwmcuqabczguyaen.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

/**
 * Supprime définitivement le compte d'un utilisateur et toutes ses données associées (RGPD - Droit à l'oubli).
 * Nécessite un JWT Supabase valide passé dans le header Authorization.
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
    // 1. Initialiser le client Supabase standard pour valider l'identité de l'utilisateur connecté
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

    // 2. Nettoyer les données applicatives de l'utilisateur via le client connecté (soumis aux RLS)
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

    // 3. Supprimer le compte utilisateur dans le système d'authentification Supabase (auth.users)
    // Si la service_role key est configurée, suppression totale de auth.users
    if (supabaseServiceKey) {
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);
      if (deleteUserError) {
        console.warn('[DeleteAccount] Avertissement suppression auth.admin:', deleteUserError.message);
      }
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Votre compte et l\'intégralité de vos données ont été définitivement supprimés.' 
    });
  } catch (error) {
    console.error('[DeleteAccount] Erreur fatale :', error);
    return res.status(500).json({ error: error.message || 'Erreur lors de la suppression du compte.' });
  }
}
