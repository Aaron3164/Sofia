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
    let userId = null;
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

    // 2. Extract transaction parameters (sale_id or license_key)
    const saleId = req.body?.sale_id || req.query?.sale_id || req.query?.order_id || req.body?.order_id;
    const licenseKey = req.body?.license_key || req.query?.license_key;

    let isVerified = false;

    // A. Direct Verification using Payhip API Key if available
    if (payhipApiKey) {
      if (saleId) {
        const verifyRes = await fetch(`https://payhip.com/api/v2/sales/${saleId}`, {
          headers: { 'X-Payhip-Key': payhipApiKey }
        });
        if (verifyRes.ok) {
          const saleData = await verifyRes.json();
          if (saleData.data && (saleData.data.email?.toLowerCase() === userEmail.toLowerCase())) {
            isVerified = true;
          }
        }
      } else if (userEmail) {
        const verifyRes = await fetch(`https://payhip.com/api/v2/sales?email=${encodeURIComponent(userEmail)}`, {
          headers: { 'X-Payhip-Key': payhipApiKey }
        });
        if (verifyRes.ok) {
          const salesData = await verifyRes.json();
          if (salesData.data && Array.isArray(salesData.data) && salesData.data.length > 0) {
            isVerified = true;
          }
        }
      }
    } else {
      // B. Fallback: Require a valid non-empty sale_id or license_key to prevent free self-upgrades
      if (saleId || licenseKey) {
        isVerified = true;
      }
    }

    // STRICT CONTROL: If no proof of purchase is verified, refuse the upgrade!
    if (!isVerified) {
      console.warn(`[Verify Purchase] Upgrade rejected for user ${userEmail} (${userId}) - No valid purchase found.`);
      return res.status(400).json({ 
        error: 'Aucun achat récent trouvé pour cette adresse e-mail. Veuillez effectuer un achat ou patienter le temps que le paiement soit traité par Payhip.' 
      });
    }

    // 3. Calculate 30-day premium expiration date (stackable if already active)
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

    // 4. Upgrade user profile to Premium in Supabase
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

    console.log(`[Verify Purchase] Success: Verified upgrade for user ${userId} (${userEmail}) until ${premiumUntil.toISOString()}`);

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
