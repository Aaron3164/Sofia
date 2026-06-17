import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

Deno.serve(async (req) => {
  // Seul le protocole POST est accepté pour les webhooks
  if (req.method !== 'POST') {
    return new Response('Méthode non autorisée', { status: 405 })
  }

  try {
    const body = await req.json()
    const { email, type, signature } = body

    if (!email || !type || !signature) {
      return new Response('Requête invalide : Paramètres manquants', { status: 400 })
    }

    // Récupération des variables d'environnement dans Supabase
    const payhipApiKey = Deno.env.get('PAYHIP_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!payhipApiKey || !supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Variables d\'environnement manquantes dans Supabase')
      return new Response('Erreur interne du serveur', { status: 500 })
    }

    // Vérification de la signature Payhip (SHA-256 de la clé API)
    const encoder = new TextEncoder()
    const data = encoder.encode(payhipApiKey)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    if (signature !== expectedSignature) {
      console.warn('Non autorisé : Signature Payhip invalide')
      return new Response('Non autorisé', { status: 401 })
    }

    // Création du client Supabase avec la clé de rôle de service (pour contourner RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Détermination du forfait (plan) selon le type d'événement
    let plan = 'free'
    if (type === 'paid' || type === 'subscription.created') {
      plan = 'premium'
    } else if (type === 'refunded' || type === 'subscription.deleted') {
      plan = 'free'
    } else {
      console.log(`Événement non géré : ${type}`)
      return new Response('OK', { status: 200 })
    }

    // Appel de la fonction SQL RPC pour lier l'email à l'utilisateur et mettre à jour son plan
    const { error } = await supabase.rpc('update_profile_plan_by_email', {
      user_email: email,
      new_plan: plan
    })

    if (error) {
      console.error(`Erreur lors de la mise à jour du forfait pour l'email ${email} :`, error)
      return new Response('Erreur lors du traitement', { status: 500 })
    }

    console.log(`Plan mis à jour avec succès pour ${email} : ${plan}`)
    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('Erreur lors du traitement du webhook :', error)
    return new Response('Erreur interne du serveur', { status: 500 })
  }
})
