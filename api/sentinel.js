import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
const BLAND_API_KEY = process.env.BLAND_API_KEY || 'org_s_d910c3aea3213cc1f9bd70ba24cb4f9369106507fb3e61573c2a45aa3400ffb9';
const AARON_PHONE = process.env.AARON_PHONE || '+33767210597';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Declenche un appel vocal d'alerte via Bland AI vers Aaron
 */
async function triggerVoiceCall(title, detailMessage) {
  try {
    const payload = {
      phone_number: AARON_PHONE,
      task: `Tu es Sof.IA, l'assistante autonome et l'intelligence artificielle officielle de la plateforme sofia-study.app. Tu appelles Aaron directement car ta sentinelle de surveillance Cloud 24h/24 vient de détecter un événement critique nécessitant son attention immédiate. Voici l'alerte exacte : "${title} : ${detailMessage}". Sois concise, claire, donne les chiffres précis et demande-lui s'il souhaite que tu prennes des mesures ou qu'il s'en occupe.`,
      first_sentence: `Bonjour Aaron, c'est Sof.IA ! Alerte prioritaire sur ton application : ${title}.`,
      voice: 'maya',
      language: 'fr',
      model: 'enhanced',
      max_duration: 3
    };

    const res = await fetch('https://api.bland.ai/v1/calls', {
      method: 'POST',
      headers: {
        'authorization': BLAND_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log('[Sentinel] Appel Bland AI declenche :', data);
    return data;
  } catch (err) {
    console.error('[Sentinel] Erreur declenchement appel Bland AI :', err);
    return null;
  }
}

export default async function handler(req, res) {
  console.log('[Sentinel] Execution du cycle de veille Cloud...');

  const report = {
    timestamp: new Date().toISOString(),
    metrics: {},
    alerts: []
  };

  try {
    // 1. SURVEILLANCE DES UTILISATEURS (Supabase)
    const { count: totalUsers, error: userError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: premiumUsers, error: premError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('plan', 'premium');

    report.metrics.totalUsers = totalUsers || 0;
    report.metrics.premiumUsers = premiumUsers || 0;

    // 2. RECUPERER LE DERNIER ETAT CONNU DEPUIS LA MEMOIRE SENTINELLE
    let { data: lastState } = await supabase
      .from('app_sentinel_state')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastState) {
      // Première initialisation
      await supabase.from('app_sentinel_state').insert({
        total_users: report.metrics.totalUsers,
        premium_users: report.metrics.premiumUsers,
        last_check: new Date().toISOString()
      });
      console.log('[Sentinel] Etat initial enregistre en base.');
    } else {
      // Detection des deltas majeurs
      const newUsersDelta = (report.metrics.totalUsers || 0) - (lastState.total_users || 0);
      const newPremiumDelta = (report.metrics.premiumUsers || 0) - (lastState.premium_users || 0);

      // Regle 1 : Nouvelle vente Premium
      if (newPremiumDelta > 0) {
        const msg = `${newPremiumDelta} nouvel abonnement Premium vient d'etre active ! Total : ${report.metrics.premiumUsers} abonnés.`;
        report.alerts.push({ type: 'revenue', message: msg });
        await triggerVoiceCall('Nouvelle souscription Premium', msg);
      }
      // Regle 2 : Pic soudain de nouveaux utilisateurs (ex: 5 nouveaux inscrits)
      else if (newUsersDelta >= 5) {
        const msg = `Pic d'inscriptions detecte : +${newUsersDelta} etudiants inscrits ! Total plateforme : ${report.metrics.totalUsers} etudiants.`;
        report.alerts.push({ type: 'growth', message: msg });
        await triggerVoiceCall("Pic d'inscriptions etudiants", msg);
      }

      // Mise a jour de l'etat
      await supabase.from('app_sentinel_state').insert({
        total_users: report.metrics.totalUsers,
        premium_users: report.metrics.premiumUsers,
        last_check: new Date().toISOString()
      });
    }

    // Si appele manuellement avec ?trigger_call=true pour tester la sentinelle
    if (req.query?.trigger_test === 'true') {
      await triggerVoiceCall('Test du systeme sentinelle', `Tout fonctionne parfaitement. Tu as actuellement ${report.metrics.totalUsers} utilisateurs et ${report.metrics.premiumUsers} abonnes Premium.`);
    }

    return res.status(200).json({
      status: 'ok',
      report
    });
  } catch (error) {
    console.error('[Sentinel] Erreur execution :', error);
    return res.status(500).json({ error: error.message });
  }
}

