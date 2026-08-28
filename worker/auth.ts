import type { D1Database } from '@cloudflare/workers-types'
import { TRIAL_DAYS } from '../shared/entitlement'
import { normalizeEmail, randomOtp, randomToken, sha256Hex } from './crypto'
import { sendOtpEmail } from './email'
import {
  OTP_EXPIRY_MINUTES,
  OTP_MAX_ATTEMPTS,
  OTP_RATE_LIMIT,
  OTP_RATE_WINDOW_MS,
  SESSION_COOKIE,
  SESSION_DAYS,
  clearCookie,
  cookie,
  errorResponse,
  getBillingForUser,
  isSecureRequest,
  json,
  parseCookies,
  userToSessionUser,
  type Env,
  type UserRow,
} from './types'

function isoNow(): string {
  return new Date().toISOString()
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

async function countRecentOtpRequests(db: D1Database, email: string): Promise<number> {
  const since = new Date(Date.now() - OTP_RATE_WINDOW_MS).toISOString()
  const row = await db
    .prepare('SELECT COUNT(*) as c FROM auth_codes WHERE email = ? AND created_at > ?')
    .bind(email, since)
    .first<{ c: number }>()
  return row?.c ?? 0
}

export async function handleAuthRequest(request: Request, env: Env, path: string): Promise<Response | null> {
  if (!path.startsWith('/api/auth')) return null

  if (path === '/api/auth/request-code' && request.method === 'POST') {
    return requestCode(request, env)
  }
  if (path === '/api/auth/verify-code' && request.method === 'POST') {
    return verifyCode(request, env)
  }
  if (path === '/api/auth/me' && request.method === 'GET') {
    return me(request, env)
  }
  if (path === '/api/auth/logout' && request.method === 'POST') {
    return logout(request, env)
  }

  return errorResponse('Not found', 404)
}

async function requestCode(request: Request, env: Env): Promise<Response> {
  let body: { email?: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const email = normalizeEmail(body.email ?? '')
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return errorResponse('Valid email required', 400)
  }

  const recent = await countRecentOtpRequests(env.DB, email)
  if (recent >= OTP_RATE_LIMIT) {
    return errorResponse('Too many sign-in attempts. Try again later.', 429)
  }

  const code = randomOtp()
  const codeHash = await sha256Hex(code)
  const id = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString()

  await env.DB.prepare(
    'INSERT INTO auth_codes (id, email, code_hash, expires_at, attempts, consumed_at, created_at) VALUES (?, ?, ?, ?, 0, NULL, ?)',
  )
    .bind(id, email, codeHash, expiresAt, isoNow())
    .run()

  try {
    await sendOtpEmail(env, email, code)
  } catch {
    return errorResponse('Unable to send sign-in email right now.', 503)
  }

  return json({ ok: true })
}

async function verifyCode(request: Request, env: Env): Promise<Response> {
  let body: { email?: string; code?: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const email = normalizeEmail(body.email ?? '')
  const code = (body.code ?? '').trim()
  if (!email || !/^\d{6}$/.test(code)) {
    return errorResponse('Email and 6-digit code required', 400)
  }

  const codeHash = await sha256Hex(code)
  const row = await env.DB.prepare(
    `SELECT * FROM auth_codes
     WHERE email = ? AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
  )
    .bind(email)
    .first<{
      id: string
      code_hash: string
      expires_at: string
      attempts: number
    }>()

  if (!row) {
    return errorResponse('Invalid or expired code', 401)
  }

  if (new Date(row.expires_at) <= new Date()) {
    return errorResponse('Invalid or expired code', 401)
  }

  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    return errorResponse('Too many attempts for this code. Request a new one.', 429)
  }

  if (row.code_hash !== codeHash) {
    await env.DB.prepare('UPDATE auth_codes SET attempts = attempts + 1 WHERE id = ?').bind(row.id).run()
    return errorResponse('Invalid or expired code', 401)
  }

  await env.DB.prepare('UPDATE auth_codes SET consumed_at = ? WHERE id = ?').bind(isoNow(), row.id).run()

  const now = new Date()
  let user = await env.DB.prepare('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL')
    .bind(email)
    .first<UserRow>()

  let trialStarted = false
  if (!user) {
    const userId = crypto.randomUUID()
    const trialEnds = addDays(now, TRIAL_DAYS).toISOString()
    await env.DB.prepare(
      `INSERT INTO users (id, email, email_verified_at, trial_started_at, trial_ends_at, created_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL)`,
    )
      .bind(userId, email, isoNow(), isoNow(), trialEnds, isoNow())
      .run()
    user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<UserRow>()
    trialStarted = true
  } else if (!user.email_verified_at) {
    const updates: { trial_started_at?: string; trial_ends_at?: string } = {}
    if (!user.trial_started_at) {
      updates.trial_started_at = isoNow()
      updates.trial_ends_at = addDays(now, TRIAL_DAYS).toISOString()
      trialStarted = true
    }
    await env.DB.prepare(
      `UPDATE users SET email_verified_at = COALESCE(email_verified_at, ?),
       trial_started_at = COALESCE(trial_started_at, ?),
       trial_ends_at = COALESCE(trial_ends_at, ?)
       WHERE id = ?`,
    )
      .bind(isoNow(), updates.trial_started_at ?? user.trial_started_at, updates.trial_ends_at ?? user.trial_ends_at, user.id)
      .run()
    user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first<UserRow>()
  }

  if (!user) return errorResponse('Account error', 500)

  const sessionToken = randomToken()
  const tokenHash = await sha256Hex(sessionToken)
  const sessionId = crypto.randomUUID()
  const sessionExpires = addDays(now, SESSION_DAYS).toISOString()

  await env.DB.prepare(
    'INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(sessionId, user.id, tokenHash, sessionExpires, isoNow())
    .run()

  const billing = await getBillingForUser(env.DB, user.id)
  const sessionUser = userToSessionUser(user, billing, now)

  const headers = new Headers()
  headers.append(
    'Set-Cookie',
    cookie(SESSION_COOKIE, sessionToken, SESSION_DAYS * 24 * 60 * 60, isSecureRequest(request)),
  )

  return json(
    {
      user: sessionUser,
      trialStarted,
      message: trialStarted
        ? 'Welcome to Frame Pro — your 14-day trial has started. No card required.'
        : undefined,
    },
    { headers },
  )
}

export async function resolveSessionUser(request: Request, env: Env) {
  const cookies = parseCookies(request.headers.get('Cookie'))
  const token = cookies[SESSION_COOKIE]
  if (!token) return null

  const tokenHash = await sha256Hex(token)
  const row = await env.DB.prepare(
    `SELECT s.user_id, s.expires_at, u.*
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND u.deleted_at IS NULL`,
  )
    .bind(tokenHash)
    .first<UserRow & { user_id: string; expires_at: string }>()

  if (!row || new Date(row.expires_at) <= new Date()) return null

  const billing = await getBillingForUser(env.DB, row.id)
  return userToSessionUser(row, billing)
}

async function me(request: Request, env: Env): Promise<Response> {
  const user = await resolveSessionUser(request, env)
  if (!user) return json({ user: null })
  return json({ user })
}

async function logout(request: Request, env: Env): Promise<Response> {
  const cookies = parseCookies(request.headers.get('Cookie'))
  const token = cookies[SESSION_COOKIE]
  if (token) {
    const tokenHash = await sha256Hex(token)
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run()
  }

  const headers = new Headers()
  headers.append('Set-Cookie', clearCookie(SESSION_COOKIE))
  return json({ ok: true }, { headers })
}

/** Test helper — create auth code row with known hash */
export async function insertAuthCodeForTest(
  db: D1Database,
  email: string,
  codeHash: string,
  opts: { expiresAt?: string; attempts?: number; consumedAt?: string | null } = {},
) {
  await db
    .prepare(
      'INSERT INTO auth_codes (id, email, code_hash, expires_at, attempts, consumed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(
      crypto.randomUUID(),
      email,
      codeHash,
      opts.expiresAt ?? new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      opts.attempts ?? 0,
      opts.consumedAt ?? null,
      isoNow(),
    )
    .run()
}
