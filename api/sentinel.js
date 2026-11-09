import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
const BLAND_API_KEY = process.env.BLAND_API_KEY || 'org_s_d910c3aea3213cc1f9bd70ba24cb4f9369106507fb3e61573c2a45aa3400ffb9';
const AARON_PHONE = process.env.AARON_PHONE || '+33767210597';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Credentials Compte de Service Google
const GOOGLE_CLIENT_EMAIL = "sentinel-bot@sofia-study-app.iam.gserviceaccount.com";
const GOOGLE_PRIVATE_KEY = (process.env.GOOGLE_SERVICE_PRIVATE_KEY || "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC76L1/bJcDPKZI\nOlBzi7gqjg9wI+7C+NaL1aqDttcjRhUPFyihhtq3Do2Dbpw5jVMzzqGeZ77sibzy\nd9YTyWg7CXYr+tm258p8oOsppLxui1GTzBN48X0E7QVe9pCBNj73fami2u3MDNq8\niJVH6iBXfV7wuOqiuyBcprbAe6eNt04FyFyO9MEX8HTDhASXCLa3vas8FAMCsBBJ\n/tRLfWzMTg9VI/nN4rjbIMb/i2yxnYvitYQvstfUCzkQMSy+BWs7n4tZzWZvz42v\nIGcR/UqcmDirI9hXpL938buCFrDyCIW79dJL3Btu45gysQGCai6j0FkgYBHjvTfV\nNsqu8929AgMBAAECggEAQK1nyDu6sMkH3PWBanvtbGxQQQOFM4PN6Pymv8ZHv6Lo\nLbUFba+KiZaPO+1vBVoxCLR3KZxA+Y6hQ/3eaBobb7Keg53IoS2gIwyKVN+YYh4+\n+nW0QB0ysGbawehxLaBbxPjyUhUz41eLVHhYlZOvBR4odwfW7yMkjO9vGMqXDe4y\naxtfLeSEnodYQLP7ZT2HUhxi58xKoifvTP/4h9C/DQi6mqhaMG0iSD2D5+SLVJn0\nP5/4rh32v5ZcCX/4hpvev4lgeyHKuyK0dXolzTLi6W4b3LDgtbP6d4d5L6DdrerG\nBdCdZbU2HcJnMkaJuO/AOQ29VuZ02/eAUVhFPWcBawKBgQDj0qnKEpCWWL4Z6akd\nwS2NTQPAXqCrEkKunhYYQBRUIXd9GZqWvR9wkkH85qgJ7xkHPvPbIaSs8pCV0kfH\nAUnAy8MWrWPKXkvFRi9fFxIAqjKISHYEvkf+UE4p9GnfejgmOGXE2nyWHB51PX0a\n538A7tZzUomE8t+RcSiGDIrXTwKBgQDTJlN4pb0BS4CEMazHdv+LloB1WiA/oXS/\nU/nJJi9Qyh4uMFAvaf6chEWlvJ4ZVlf0BAI1cDE2y+GQYEgI2LtPVfHe5d5IQ6Mq\ntI0xXX4PshhGk9J5DsB9xXp3btzQe682cRLw8rbBUabo2xHMOad/kWAfe4zpPFTB\n/5zGEic3MwKBgGJGBzPBmlkgYrBu2KKbJ/kh1ZJvv0LMF7OXQdSoH5zC6vYtyz9m\nyV8X2BstrCLM3rD/eNV3x79Kyw+1q3yuk4/01Wy80qUC1BB+3ARawUtEH5QmHbKi\nGhAbt/vlEJ5z7DCgd1XZIZDnBERyh7rJTUGrxRnt6qBM3B+y/lYEpweFAoGBALHR\nCeSFdvkbM1ygVMgZz7UnBoFNZ/EOMDpcJvQdwyT/QZFWQIDde30l611aza26yBEI\nOy/zjo59/jRO0PsaQgva7fjvjlU/GK8DJBCZkmr3aXguTsaCBNsmLi9cXnr4XiKz\n8OaXEA8Xiz94FbHuL7+/lrqMmqtkkmBZuhYX/Yx/AoGBAIOf59MnD+QWWcXpiX1N\nSe2oEYYczSw+UDiuxcwXMb8X47aNeFxrprf/wF6Pt9F5le9YkfYEh+bmsCw2mbb9\n8iAWGvqpal/3RNjbJK0l3LBwjJRQXj0tRPGY1L7nAydlwb5ucQ1xoo+SA8fymWaX\nAcmM9EduGShk25vwuFbjQl2U\n-----END PRIVATE KEY-----\n").replace(/\\n/g, '\n');

// Initialisation de l'authentification Google Search Console
const googleAuth = new google.auth.JWT({
  email: GOOGLE_CLIENT_EMAIL,
  key: GOOGLE_PRIVATE_KEY,
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
});

const searchConsole = google.searchconsole({ version: 'v1', auth: googleAuth });

/**
 * Declenche un appel vocal d'alerte via Bland AI vers Aaron
 */
async function triggerVoiceCall(title, detailMessage) {
  try {
    const payload = {
      phone_number: AARON_PHONE,
      task: `Tu es Sof.IA, l'intelligence artificielle officielle de la plateforme sofia-study.app créée par Aaron. Tu l'appelles en direct car ta sentinelle Cloud 24h/24 vient de détecter un événement très important. Voici l'alerte : "${title} : ${detailMessage}". Sois naturelle, concise, donne les chiffres précis et demande-lui s'il souhaite que tu prennes des mesures particulières.`,
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
    console.log('[Sentinel] Appel vocal Bland AI declenche :', data);
    return data;
  } catch (err) {
    console.error('[Sentinel] Erreur appel Bland AI :', err);
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
    // 1. SURVEILLANCE DES UTILISATEURS & VENTES (Supabase)
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: premiumUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('plan', 'premium');

    report.metrics.totalUsers = totalUsers || 0;
    report.metrics.premiumUsers = premiumUsers || 0;

    // 2. SURVEILLANCE SEARCH CONSOLE (Impressions, Clics & Position Google)
    try {
      const today = new Date();
      const threeDaysAgo = new Date(today.getTime() - (3 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
      const yesterday = new Date(today.getTime() - (1 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];

      const scRes = await searchConsole.searchanalytics.query({
        siteUrl: 'https://www.sofia-study.app/',
        requestBody: {
          startDate: threeDaysAgo,
          endDate: yesterday,
          dimensions: ['query']
        }
      });

      const rows = scRes.data.rows || [];
      const totalClicks = rows.reduce((acc, row) => acc + (row.clicks || 0), 0);
      const totalImpressions = rows.reduce((acc, row) => acc + (row.impressions || 0), 0);

      report.metrics.googleClicks = totalClicks;
      report.metrics.googleImpressions = totalImpressions;
      report.metrics.topQueries = rows.slice(0, 3).map(r => ({ query: r.keys[0], clicks: r.clicks, position: Math.round(r.position) }));
    } catch (scErr) {
      console.warn('[Sentinel] Search Console query warning (non bloquant) :', scErr.message);
      report.metrics.googleStatus = "En attente d'ajout de sentinel-bot dans les utilisateurs Search Console";
    }

    // 3. RECUPERATION ET COMPARAISON AVEC LE DERNIER ETAT
    let { data: lastState } = await supabase
      .from('app_sentinel_state')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastState) {
      await supabase.from('app_sentinel_state').insert({
        total_users: report.metrics.totalUsers,
        premium_users: report.metrics.premiumUsers,
        google_impressions: report.metrics.googleImpressions || 0,
        google_clicks: report.metrics.googleClicks || 0,
        last_check: new Date().toISOString()
      });
      console.log('[Sentinel] Etat initial enregistre en base.');
    } else {
      const newUsersDelta = (report.metrics.totalUsers || 0) - (lastState.total_users || 0);
      const newPremiumDelta = (report.metrics.premiumUsers || 0) - (lastState.premium_users || 0);
      const newImpressionsDelta = (report.metrics.googleImpressions || 0) - (lastState.google_impressions || 0);

      // Regle 1 : Vente Premium
      if (newPremiumDelta > 0) {
        const msg = `${newPremiumDelta} nouvel abonnement Premium vient d'etre payé ! Tu as désormais ${report.metrics.premiumUsers} abonnés.`;
        report.alerts.push({ type: 'revenue', message: msg });
        await triggerVoiceCall('Nouvelle vente Premium', msg);
      }
      // Regle 2 : Pic d'inscriptions
      else if (newUsersDelta >= 5) {
        const msg = `Pic d'inscriptions : +${newUsersDelta} nouveaux étudiants sur la plateforme ! Total : ${report.metrics.totalUsers} étudiants.`;
        report.alerts.push({ type: 'growth', message: msg });
        await triggerVoiceCall("Pic d'inscriptions étudiants", msg);
      }
      // Regle 3 : Pic Google Search Console (+50 impressions)
      else if (newImpressionsDelta >= 50) {
        const msg = `Percée sur Google détectée : +${newImpressionsDelta} nouvelles apparitions de ton site dans les recherches d'étudiants !`;
        report.alerts.push({ type: 'seo', message: msg });
        await triggerVoiceCall('Pic de visibilité Google', msg);
      }

      // Enregistrement de l'état
      await supabase.from('app_sentinel_state').insert({
        total_users: report.metrics.totalUsers,
        premium_users: report.metrics.premiumUsers,
        google_impressions: report.metrics.googleImpressions || 0,
        google_clicks: report.metrics.googleClicks || 0,
        last_check: new Date().toISOString()
      });
    }

    // Appel manuel de test si demande
    if (req.query?.trigger_test === 'true') {
      await triggerVoiceCall('Rapport de Situation Sentinelle', `Tout fonctionne parfaitement. Tu as actuellement ${report.metrics.totalUsers} utilisateurs, ${report.metrics.premiumUsers} abonnés Premium et la surveillance Search Console est opérationnelle.`);
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
