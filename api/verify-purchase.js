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

    // 2. Extract purchase proof parameters
    const checkoutToken = req.body?.checkout_token || req.query?.checkout_token || req.body?.checkout_id || req.query?.checkout_id;
    const saleId = req.body?.sale_id || req.query?.sale_id || req.query?.order_id || req.body?.order_id;
    const licenseKey = req.body?.license_key || req.query?.license_key;

    let isVerified = false;

    // 3. Fetch user profile from Supabase
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const currentPreferences = currentProfile?.preferences || {};
    const pendingCheckout = currentPreferences.pending_checkout;

    // A. Validate Single-Use Checkout Token generated when user clicked "Passer au Premium"
    if (checkoutToken && pendingCheckout) {
      const isTokenMatch = pendingCheckout.token === checkoutToken;
      const isNotUsed = pendingCheckout.used === false;
      const createdAt = new Date(pendingCheckout.created_at || 0).getTime();
      const isNotExpired = (Date.now() - createdAt) < (30 * 60 * 1000); // 30 minutes window

      if (isTokenMatch && isNotUsed && isNotExpired) {
        isVerified = true;
      } else {
        console.warn(`[Verify Purchase] Invalid/consumed token for user ${userEmail}: match=${isTokenMatch}, notUsed=${isNotUsed}, notExpired=${isNotExpired}`);
      }
    }

    // B. Payhip API verification if sale_id or PAYHIP_API_KEY is configured
    if (!isVerified && payhipApiKey && (saleId || userEmail)) {
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
    }

    // STRICT ANTI-FRAUD REJECTION
    if (!isVerified) {
      console.warn(`[Verify Purchase] Fraud attempt or invalid claim rejected for user ${userEmail} (${userId})`);
      return res.status(400).json({ 
        error: 'Jeton d\'achat invalide, expiré ou déjà utilisé. Impossible d\'activer le Premium sans preuve d\'achat valide.' 
      });
    }

    // 4. Calculate 30-day premium expiration date from purchase date
    const premiumUntil = new Date();
    premiumUntil.setDate(premiumUntil.getDate() + 30);

    // 5. Mark token as CONSUMED and Upgrade user profile to Premium in Supabase
    const updatedPreferences = {
      ...currentPreferences,
      pending_checkout: pendingCheckout ? { ...pendingCheckout, used: true, consumed_at: new Date().toISOString() } : null
    };

    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        plan: 'premium',
        premium_until: premiumUntil.toISOString(),
        preferences: updatedPreferences,
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
