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
    // 1. Authenticate user strictly from Supabase JWT Token
    const authHeader = req.headers.authorization;
    let userId = req.body?.user_id || req.query?.user_id;
    let userEmail = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
        userEmail = user.email || '';
      }
    }

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Session utilisateur valide requise.' });
    }

    // 2. Extract transaction parameters if provided
    const saleId = req.body?.sale_id || req.query?.sale_id || req.query?.order_id || req.body?.order_id;
    const licenseKey = req.body?.license_key || req.query?.license_key;

    // 3. Optional Payhip API strict verification if PAYHIP_API_KEY is configured
    if (payhipApiKey) {
      let isVerified = false;

      if (saleId) {
        const verifyRes = await fetch(`https://payhip.com/api/v2/sales/${saleId}`, {
          headers: { 'X-Payhip-Key': payhipApiKey }
        });
        if (verifyRes.ok) {
          const saleData = await verifyRes.json();
          if (saleData.status === 'success' || saleData.status === 'paid' || saleData.data) {
            isVerified = true;
          }
        }
      } else if (userEmail) {
        // Query Payhip API by buyer email
        const verifyRes = await fetch(`https://payhip.com/api/v2/sales?email=${encodeURIComponent(userEmail)}`, {
          headers: { 'X-Payhip-Key': payhipApiKey }
        });
        if (verifyRes.ok) {
          const salesData = await verifyRes.json();
          if (salesData.data && salesData.data.length > 0) {
            isVerified = true;
          }
        }
      }

      if (!isVerified && (saleId || licenseKey)) {
        return res.status(400).json({ error: 'Aucun achat correspondant trouvé sur Payhip.' });
      }
    }

    // 4. Calculate 30-day premium expiration date (stackable if already active)
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

    // 5. Upgrade user profile to Premium in Supabase
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
      return res.status(500).json({ error: 'Échec de la mise à jour du profil.' });
    }

    console.log(`[Verify Purchase] Success: User ${userId} (${userEmail}) upgraded to Premium until ${premiumUntil.toISOString()}`);

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
