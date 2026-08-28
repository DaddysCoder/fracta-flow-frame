import Stripe from 'stripe'
import { evaluateEntitlement } from '../shared/entitlement'
import { resolveSessionUser } from './auth'
import {
  errorResponse,
  getBillingForUser,
  json,
  publicOrigin,
  type Env,
} from './types'

function stripeClient(env: Env): Stripe | null {
  if (!env.STRIPE_SECRET_KEY) return null
  return new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' })
}

function priceIdForPlan(env: Env, plan: string): string | null {
  if (plan === 'monthly') return env.FRAME_STRIPE_MONTHLY_PRICE_ID ?? null
  if (plan === 'annual') return env.FRAME_STRIPE_ANNUAL_PRICE_ID ?? null
  return null
}

export async function handleBillingRequest(request: Request, env: Env, path: string): Promise<Response | null> {
  if (!path.startsWith('/api/billing')) return null

  if (path === '/api/billing/checkout' && request.method === 'POST') {
    return createCheckout(request, env)
  }
  if (path === '/api/billing/portal' && request.method === 'POST') {
    return createPortal(request, env)
  }
  if (path === '/api/billing/status' && request.method === 'GET') {
    return billingStatus(request, env)
  }

  return errorResponse('Not found', 404)
}

async function createCheckout(request: Request, env: Env): Promise<Response> {
  const stripe = stripeClient(env)
  if (!stripe) return errorResponse('Billing is not configured', 503)

  const user = await resolveSessionUser(request, env)
  if (!user) return errorResponse('Sign in required', 401)

  let body: { plan?: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const priceId = priceIdForPlan(env, body.plan ?? '')
  if (!priceId) return errorResponse('Invalid plan', 400)

  const origin = publicOrigin(env, request)
  const billing = await getBillingForUser(env.DB, user.id)
  let customerId = billing?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, metadata: { frame_user_id: user.id } })
    customerId = customer.id
    await env.DB.prepare(
      `INSERT INTO billing_customers (user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, status, current_period_end, cancel_at_period_end, updated_at)
       VALUES (?, ?, NULL, NULL, NULL, NULL, 0, ?)
       ON CONFLICT(user_id) DO UPDATE SET stripe_customer_id = excluded.stripe_customer_id, updated_at = excluded.updated_at`,
    )
      .bind(user.id, customerId, new Date().toISOString())
      .run()
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/billing`,
    client_reference_id: user.id,
    metadata: { frame_user_id: user.id },
  })

  return json({ url: session.url })
}

async function createPortal(request: Request, env: Env): Promise<Response> {
  const stripe = stripeClient(env)
  if (!stripe) return errorResponse('Billing is not configured', 503)

  const user = await resolveSessionUser(request, env)
  if (!user) return errorResponse('Sign in required', 401)

  const billing = await getBillingForUser(env.DB, user.id)
  if (!billing?.stripe_customer_id) {
    return errorResponse('No billing account yet', 400)
  }

  const origin = publicOrigin(env, request)
  const portal = await stripe.billingPortal.sessions.create({
    customer: billing.stripe_customer_id,
    return_url: `${origin}/billing`,
  })

  return json({ url: portal.url })
}

async function billingStatus(request: Request, env: Env): Promise<Response> {
  const user = await resolveSessionUser(request, env)
  if (!user) return json({ user: null })
  return json({ user })
}

export async function handleStripeWebhook(request: Request, env: Env): Promise<Response> {
  const stripe = stripeClient(env)
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !webhookSecret) return errorResponse('Webhook not configured', 503)

  const signature = request.headers.get('Stripe-Signature')
  if (!signature) return errorResponse('Missing signature', 400)

  const body = await request.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch {
    return errorResponse('Invalid webhook signature', 400)
  }

  const existing = await env.DB.prepare('SELECT id FROM stripe_webhook_events WHERE id = ?')
    .bind(event.id)
    .first()
  if (existing) {
    return json({ ok: true, duplicate: true })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await onCheckoutCompleted(env, stripe, event.data.object as Stripe.Checkout.Session)
        break
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(env, event.data.object as Stripe.Subscription)
        break
      case 'invoice.paid':
      case 'invoice.payment_failed':
        await syncSubscriptionFromInvoice(env, stripe, event.data.object as Stripe.Invoice)
        break
      default:
        break
    }
  } catch {
    console.error('[frame-billing] webhook handler error', event.type)
    return errorResponse('Webhook handler failed', 500)
  }

  await env.DB.prepare('INSERT INTO stripe_webhook_events (id, processed_at) VALUES (?, ?)')
    .bind(event.id, new Date().toISOString())
    .run()

  return json({ ok: true })
}

async function onCheckoutCompleted(env: Env, stripe: Stripe, session: Stripe.Checkout.Session) {
  if (session.mode !== 'subscription' || !session.customer) return
  const userId = session.client_reference_id ?? session.metadata?.frame_user_id
  if (!userId) return

  const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id
  await env.DB.prepare(
    `INSERT INTO billing_customers (user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, status, current_period_end, cancel_at_period_end, updated_at)
     VALUES (?, ?, NULL, NULL, NULL, NULL, 0, ?)
     ON CONFLICT(user_id) DO UPDATE SET stripe_customer_id = excluded.stripe_customer_id, updated_at = excluded.updated_at`,
  )
    .bind(userId, customerId, new Date().toISOString())
    .run()

  if (session.subscription) {
    const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id
    const sub = await stripe.subscriptions.retrieve(subId)
    await syncSubscription(env, sub)
  }
}

async function syncSubscriptionFromInvoice(env: Env, stripe: Stripe, invoice: Stripe.Invoice) {
  const subId = invoice.subscription
  if (!subId) return
  const id = typeof subId === 'string' ? subId : subId.id
  const sub = await stripe.subscriptions.retrieve(id)
  await syncSubscription(env, sub)
}

async function syncSubscription(env: Env, sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
  const priceId = sub.items.data[0]?.price?.id ?? null

  const billing = await env.DB.prepare('SELECT user_id FROM billing_customers WHERE stripe_customer_id = ?')
    .bind(customerId)
    .first<{ user_id: string }>()

  const userId = billing?.user_id
  if (!userId) {
    console.error('[frame-billing] subscription sync: user not found for customer')
    return
  }

  await env.DB.prepare(
    `INSERT INTO billing_customers (user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, status, current_period_end, cancel_at_period_end, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       stripe_customer_id = excluded.stripe_customer_id,
       stripe_subscription_id = excluded.stripe_subscription_id,
       stripe_price_id = excluded.stripe_price_id,
       status = excluded.status,
       current_period_end = excluded.current_period_end,
       cancel_at_period_end = excluded.cancel_at_period_end,
       updated_at = excluded.updated_at`,
  )
    .bind(
      userId,
      customerId,
      sub.id,
      priceId,
      sub.status,
      sub.current_period_end,
      sub.cancel_at_period_end ? 1 : 0,
      new Date().toISOString(),
    )
    .run()
}

export async function handleEntitlementRequest(request: Request, env: Env, path: string): Promise<Response | null> {
  if (path !== '/api/entitlement' || request.method !== 'GET') return null

  const user = await resolveSessionUser(request, env)
  if (!user) {
    return json({ entitlement: 'free' as const, authenticated: false })
  }

  return json({
    entitlement: user.entitlement,
    authenticated: true,
    email: user.email,
    trialEndsAt: user.trialEndsAt,
    subscriptionStatus: user.subscriptionStatus,
  })
}

export async function requirePro(request: Request, env: Env): Promise<Response | null> {
  const user = await resolveSessionUser(request, env)
  if (!user) return errorResponse('Sign in required', 401)
  const entitlement = evaluateEntitlement({
    subscriptionStatus: user.subscriptionStatus,
    subscriptionPeriodEnd: user.subscriptionPeriodEnd,
    trialEndsAt: user.trialEndsAt,
  })
  if (entitlement === 'free') return errorResponse('Frame Pro required', 403)
  return null
}
