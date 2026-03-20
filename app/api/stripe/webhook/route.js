import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Supabase admin client — bypasses RLS to update is_plus
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

async function setUserPlus(supabaseUid, stripeCustomerId, isPlus) {
  const admin = getAdminClient()
  await admin
    .from('profiles')
    .update({ is_plus: isPlus, stripe_customer_id: stripeCustomerId })
    .eq('id', supabaseUid)
}

async function setUserPlusByCustomer(stripeCustomerId, isPlus) {
  const admin = getAdminClient()
  await admin
    .from('profiles')
    .update({ is_plus: isPlus })
    .eq('stripe_customer_id', stripeCustomerId)
}

export async function POST(request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const uid = session.metadata?.supabase_uid
      const customerId = typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id
      if (uid && customerId) {
        await setUserPlus(uid, customerId, true)
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
      const active = ['active', 'trialing'].includes(sub.status)
      await setUserPlusByCustomer(customerId, active)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
      await setUserPlusByCustomer(customerId, false)
      break
    }
  }

  return NextResponse.json({ received: true })
}
