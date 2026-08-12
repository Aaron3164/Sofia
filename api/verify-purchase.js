import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const payhipApiKey = process.env.PAYHIP_API_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Authenticate user from Supabase JWT
    const authHeader = req.headers.authorization;
    let userId = req.body?.user_id || req.query?.user_id;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
      }
    }

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Token de session valide requis' });
    }

    // 2. Extract transaction proof (sale_id or license_key)
    const saleId = req.body?.sale_id || req.query?.sale_id || req.query?.order_id || req.body?.order_id;
    const licenseKey = req.body?.license_key || req.query?.license_key;

    // Security Verification against Payhip API
    if (payhipApiKey && (saleId || licenseKey)) {
      const endpoint = saleId 
        ? `https://payhip.com/api/v2/sales/${saleId}`
        : `https://payhip.com/api/v2/license/verify?license_key=${encodeURIComponent(licenseKey)}`;
      
      const verifyRes = await fetch(endpoint, {
        headers: { 'X-Payhip-Key': payhipApiKey }
      });

      if (!verifyRes.ok) {
        return res.status(400).json({ error: 'Preuve d\'achat Payhip invalide ou introuvable.' });
      }

      const saleData = await verifyRes.json();
      if (saleData.data && saleData.data.enabled === false) {
        return res.status(400).json({ error: 'Licence ou achat révoqué.' });
      }
    } else if (!saleId && !licenseKey) {
      // Require proof of purchase to prevent URL parameter spoofing
      return res.status(400).json({ error: 'Preuve d\'achat (sale_id ou licence) requise.' });
    }

    // 3. Calculate 30-day premium expiration date (stackable if already premium)
    let baseDate = new Date();
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('premium_until')
      .eq('id', userId)
      .single();

    if (currentProfile?.premium_until && new Date(currentProfile.premium_until) > new Date()) {
      baseDate = new Date(currentProfile.premium_until);
    }

    const premiumUntil = new Date(baseDate);
    premiumUntil.setDate(premiumUntil.getDate() + 30);

    // 4. Update profile to Premium in Supabase
    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        plan: 'premium',
        premium_until: premiumUntil.toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (updateError) {
      console.error('Error updating profile in verify-purchase:', updateError);
      return res.status(500).json({ error: 'Échec de la mise à jour du profil' });
    }

    return res.status(200).json({
      status: 'success',
      plan: 'premium',
      premium_until: premiumUntil.toISOString(),
      message: 'Compte activé en Premium avec succès !'
    });

  } catch (err) {
    console.error('Verify purchase error:', err);
    return res.status(500).json({ error: err.message });
  }
}
