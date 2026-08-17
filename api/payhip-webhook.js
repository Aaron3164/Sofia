import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client using service role key to bypass RLS
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

console.log('Supabase Connection Diagnostics:', {
  hasUrl: !!supabaseUrl,
  urlLength: supabaseUrl ? supabaseUrl.length : 0,
  hasKey: !!supabaseServiceKey,
  keyLength: supabaseServiceKey ? supabaseServiceKey.length : 0
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper to manually parse request body from stream or string if Vercel's body-parser is bypassed
async function parseBody(req) {
  if (req.body) {
    if (typeof req.body === 'object' && req.body !== null && Object.keys(req.body).length > 0) {
      return req.body;
    }
    if (typeof req.body === 'string' && req.body.trim().length > 0) {
      const raw = req.body.trim();
      try {
        return JSON.parse(raw);
      } catch (err) {
        const params = new URLSearchParams(raw);
        const parsed = {};
        for (const [key, value] of params.entries()) {
          parsed[key] = value;
        }
        return parsed;
      }
    }
  }

  return new Promise((resolve) => {
    let rawData = '';
    req.on('data', (chunk) => {
      rawData += chunk.toString();
    });
    req.on('end', () => {
      if (!rawData) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(rawData));
      } catch (err) {
        try {
          const params = new URLSearchParams(rawData);
          const parsed = {};
          for (const [key, value] of params.entries()) {
            parsed[key] = value;
          }
          resolve(parsed);
        } catch (e) {
          resolve({});
        }
      }
    });
  });
}

export default async function handler(req, res) {
  // Allow GET request for simple healthcheck & diagnostics
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'Payhip Webhook Endpoint Active',
      diagnostics: {
        hasSupabaseUrl: !!supabaseUrl,
        supabaseUrlLength: supabaseUrl ? supabaseUrl.length : 0,
        hasServiceKey: !!supabaseServiceKey,
        serviceKeyLength: supabaseServiceKey ? supabaseServiceKey.length : 0
      }
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = await parseBody(req);
    console.log('[Payhip Webhook] Incoming Payload:', JSON.stringify(body, null, 2));

    let rawEmail = body.email || body.buyer_email || body.customer_email || body.payer_email || body.user_email || body.custom || '';
    if (typeof rawEmail !== 'string') rawEmail = String(rawEmail);

    let buyerEmail = rawEmail.trim();
    try {
      buyerEmail = decodeURIComponent(buyerEmail).trim().toLowerCase();
    } catch (e) {
      buyerEmail = buyerEmail.toLowerCase();
    }

    if (!buyerEmail) {
      console.warn('[Payhip Webhook] No email found in payload:', body);
      return res.status(400).json({ 
        error: 'Missing email in payload',
        receivedKeys: Object.keys(body)
      });
    }

    const activeProductId = body.product_id || body.pricing_plan_id || 'unknown';
    console.log(`[Payhip Webhook] Processing purchase of product/plan: ${activeProductId} for email: ${buyerEmail}`);

    // 1. Fetch users from Supabase Auth using admin API with pagination
    let user = null;
    let page = 1;
    let hasMore = true;
    const perPage = 50;

    while (!user && hasMore) {
      const { data, error: fetchError } = await supabase.auth.admin.listUsers({ page, perPage });
      
      if (fetchError) {
        console.error('[Payhip Webhook] Error listing users from Supabase:', fetchError);
        return res.status(500).json({ 
          error: 'Database fetch error',
          details: fetchError.message,
          hint: 'Vérifiez la variable SUPABASE_SERVICE_ROLE_KEY dans Vercel'
        });
      }

      const users = data?.users || [];
      if (users.length === 0) {
        hasMore = false;
        break;
      }

      user = users.find(u => {
        const uEmail = (u.email || u.user_metadata?.email || '').trim().toLowerCase();
        return uEmail === buyerEmail;
      });

      if (users.length < perPage) {
        hasMore = false;
      } else {
        page++;
      }
    }

    if (!user) {
      console.warn(`[Payhip Webhook] User with email "${buyerEmail}" not found in Supabase Auth.`);
      return res.status(200).json({ 
        status: 'user_not_found', 
        message: `Aucun compte Supabase trouvé avec l'adresse e-mail ${buyerEmail}. L'utilisateur doit créer son compte d'abord.` 
      });
    }

    // 2. Set premium expiration date to 30 days from purchase date
    const premiumUntil = new Date();
    premiumUntil.setDate(premiumUntil.getDate() + 30);

    // 3. Upsert user's plan in public.profiles
    const updateData = {
      id: user.id,
      plan: 'premium',
      premium_until: premiumUntil.toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('profiles')
      .upsert(updateData, { onConflict: 'id' });

    if (updateError) {
      console.error('[Payhip Webhook] Error updating profile to premium:', updateError);

      // Fallback: If premium_until column doesn't exist, update plan without premium_until
      if (updateError.message && updateError.message.includes('premium_until')) {
        console.warn('[Payhip Webhook] Column premium_until missing in profiles table. Retrying without premium_until...');
        delete updateData.premium_until;
        const { error: fallbackError } = await supabase
          .from('profiles')
          .upsert(updateData, { onConflict: 'id' });

        if (!fallbackError) {
          console.log(`[Payhip Webhook] Fallback Success: User ${buyerEmail} upgraded to premium (plan updated)`);
          return res.status(200).json({ 
            status: 'success', 
            message: 'User upgraded to premium successfully (without premium_until column)' 
          });
        }
      }

      return res.status(500).json({ 
        error: 'Profile update failed',
        details: updateError.message 
      });
    }

    console.log(`[Payhip Webhook] Success: User ${buyerEmail} (ID: ${user.id}) upgraded to premium until ${premiumUntil.toISOString()}`);
    return res.status(200).json({ status: 'success', message: 'User upgraded to premium successfully' });

  } catch (err) {
    console.error('[Payhip Webhook] Critical Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
