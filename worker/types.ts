import type { D1Database } from '@cloudflare/workers-types'
import type { Entitlement } from '../shared/entitlement'
import { evaluateEntitlement } from '../shared/entitlement'

export interface Env {
  DB: D1Database
  ASSETS: Fetcher
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  FRAME_STRIPE_MONTHLY_PRICE_ID?: string
  FRAME_STRIPE_ANNUAL_PRICE_ID?: string
  RESEND_API_KEY?: string
  FRAME_SESSION_SECRET?: string
  /** Public site origin for Stripe redirects, e.g. https://frame.whatbit.dev */
  FRAME_PUBLIC_ORIGIN?: string
}

export interface UserRow {
  id: string
  email: string
  email_verified_at: string | null
  trial_started_at: string | null
  trial_ends_at: string | null
  created_at: string
  deleted_at: string | null
}

export interface BillingRow {
  user_id: string
  stripe_customer_id: string
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  status: string | null
  current_period_end: number | null
  cancel_at_period_end: number
  updated_at: string
}

export interface SessionUser {
  id: string
  email: string
  emailVerifiedAt: string | null
  trialStartedAt: string | null
  trialEndsAt: string | null
  entitlement: Entitlement
  subscriptionStatus: string | null
  subscriptionPeriodEnd: number | null
  cancelAtPeriodEnd: boolean
}

export const SESSION_COOKIE = 'frame_session'
export const SESSION_DAYS = 30
export const OTP_EXPIRY_MINUTES = 10
export const OTP_MAX_ATTEMPTS = 5
export const OTP_RATE_LIMIT = 3
export const OTP_RATE_WINDOW_MS = 60 * 60 * 1000

export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  return new Response(JSON.stringify(data), { ...init, headers })
}

export function errorResponse(message: string, status: number): Response {
  return json({ error: message }, { status })
}

export async function getBillingForUser(db: D1Database, userId: string): Promise<BillingRow | null> {
  return db.prepare('SELECT * FROM billing_customers WHERE user_id = ?').bind(userId).first<BillingRow>()
}

export function userToSessionUser(user: UserRow, billing: BillingRow | null, now = new Date()): SessionUser {
  const entitlement = evaluateEntitlement({
    now,
    subscriptionStatus: billing?.status ?? null,
    subscriptionPeriodEnd: billing?.current_period_end ?? null,
    trialEndsAt: user.trial_ends_at,
  })

  return {
    id: user.id,
    email: user.email,
    emailVerifiedAt: user.email_verified_at,
    trialStartedAt: user.trial_started_at,
    trialEndsAt: user.trial_ends_at,
    entitlement,
    subscriptionStatus: billing?.status ?? null,
    subscriptionPeriodEnd: billing?.current_period_end ?? null,
    cancelAtPeriodEnd: Boolean(billing?.cancel_at_period_end),
  }
}

export function publicOrigin(env: Env, request: Request): string {
  if (env.FRAME_PUBLIC_ORIGIN) return env.FRAME_PUBLIC_ORIGIN.replace(/\/$/, '')
  const url = new URL(request.url)
  return url.origin
}

export function cookie(name: string, value: string, maxAgeSeconds: number, secure: boolean): string {
  const parts = [
    `${name}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ]
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

export function clearCookie(name: string): string {
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}

export function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {}
  const out: Record<string, string> = {}
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (k) out[k] = rest.join('=')
  }
  return out
}

export function isSecureRequest(request: Request): boolean {
  const url = new URL(request.url)
  return url.protocol === 'https:' || request.headers.get('X-Forwarded-Proto') === 'https'
}
