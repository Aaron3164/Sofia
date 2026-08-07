import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client using service role key to bypass RLS
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('Supabase Connection Diagnostics:', {
  hasUrl: !!supabaseUrl,
  urlLength: supabaseUrl ? supabaseUrl.length : 0,
  hasKey: !!supabaseServiceKey,
  keyLength: supabaseServiceKey ? supabaseServiceKey.length : 0
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper to manually parse request body from stream if Vercel's body-parser is bypassed
async function parseBody(req) {
  if (req.body && Object.keys(req.body).length > 0) {
    return req.body;
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
        // Attempt JSON parse
        resolve(JSON.parse(rawData));
      } catch (err) {
        // Attempt URL-encoded parse
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = await parseBody(req);
    const { email, product_id, pricing_plan_id, type } = body;

    console.log('Incoming Payhip Payload:', JSON.stringify(body, null, 2));

    if (!email) {
      return res.status(400).json({ error: 'Missing email in payload' });
    }

    // Log the product/plan details for record keeping
    const activeProductId = product_id || pricing_plan_id || 'unknown';
    console.log(`[Payhip Webhook] Processing purchase of product/plan: ${activeProductId} for user ${email}`);

    // 1. Fetch users from Supabase Auth using the admin API
    const { data: { users }, error: fetchError } = await supabase.auth.admin.listUsers();
    
    if (fetchError) {
      console.error('Error listing users from Supabase:', fetchError);
      return res.status(500).json({ error: 'Database fetch error' });
    }

    // 2. Find the user ID matching the buyer's email
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      console.warn(`User with email ${email} not found in Supabase Auth. Upgrading aborted until they register.`);
      // Return 200 so Payhip doesn't keep retrying, but log the issue
      return res.status(200).json({ status: 'user_not_found', message: 'User must register first' });
    }

    // 3. Set premium expiration date to 30 days from now
    const premiumUntil = new Date();
    premiumUntil.setDate(premiumUntil.getDate() + 30);

    // 4. Update the user's plan and expiration date in public.profiles
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        plan: 'premium',
        premium_until: premiumUntil.toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating user profile to premium:', updateError);
      return res.status(500).json({ error: 'Profile update failed' });
    }

    console.log(`Success: User ${email} upgraded to premium until ${premiumUntil.toISOString()}`);
    return res.status(200).json({ status: 'success', message: 'User upgraded to premium successfully' });

  } catch (err) {
    console.error('Payhip Webhook error:', err);
    return res.status(500).json({ error: err.message });
  }
}
