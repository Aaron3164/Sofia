import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Authenticate user from Supabase JWT Token
    const authHeader = req.headers.authorization;
    let userId = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
      }
    }

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Session utilisateur valide requise.' });
    }

    // 2. Generate a secure random single-use checkout token
    const randomHex = crypto.randomBytes(24).toString('hex');
    const checkoutToken = `chk_${randomHex}`;

    // 3. Save pending checkout token into user profile preferences
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', userId)
      .single();

    const existingPrefs = currentProfile?.preferences || {};
    const updatedPreferences = {
      ...existingPrefs,
      pending_checkout: {
        token: checkoutToken,
        created_at: new Date().toISOString(),
        used: false
      }
    };

    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        preferences: updatedPreferences,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (updateError) {
      console.error('Error saving checkout token:', updateError);
      return res.status(500).json({ error: 'Impossible de créer le jeton de paiement.' });
    }

    console.log(`[Checkout Token] Generated single-use token ${checkoutToken} for user ${userId}`);

    return res.status(200).json({
      status: 'success',
      checkout_token: checkoutToken
    });

  } catch (err) {
    console.error('Create checkout token error:', err);
    return res.status(500).json({ error: err.message });
  }
}
