import { SCREENER_ITEMS } from './screener'
import type { ScreenerAnswer, ScreenerResponse } from './types'

// Phase 4 QR payload codec (brief §5).
//
// Payload-size discipline: rather than transmitting domain + full item text
// per response (what the brief anticipated needing to trim), the response
// QR encodes only a fixed-length string of single-character answer codes in
// SCREENER_ITEMS' canonical order. The importing side already has that same
// canonical order locally, so domain and itemId are reconstructed on decode
// without ever needing to be transmitted. This keeps the full rawResponses
// detail (no audit-trail trade-off) while the payload stays tiny — see
// qrPayload.test.ts for the measured byte size against the real 24-item set.

const ANSWER_CODE: Record<ScreenerAnswer, string> = { yes: 'y', no: 'n', unsure: 'u' }
const CODE_ANSWER: Record<string, ScreenerAnswer> = { y: 'yes', n: 'no', u: 'unsure' }

export interface ResponsePayload {
  t: string // token
  r: string // answer-code string, one char per SCREENER_ITEMS entry, in order
  c: string // completedAt, ISO
}

export function encodeResponsePayload(
  token: string,
  responses: ScreenerResponse[],
  completedAt: string,
): string {
  const byItemId = new Map(responses.map((r) => [r.itemId, r]))
  const code = SCREENER_ITEMS.map((item) => {
    const response = byItemId.get(item.id)
    if (!response) throw new Error(`Missing response for item ${item.id}`)
    return ANSWER_CODE[response.answer]
  }).join('')

  const payload: ResponsePayload = { t: token, r: code, c: completedAt }
  return JSON.stringify(payload)
}

export type DecodeResult =
  | { ok: true; token: string; responses: ScreenerResponse[]; completedAt: string }
  | { ok: false; error: string }

export function decodeResponsePayload(raw: string): DecodeResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'This does not look like a valid screener response code.' }
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).t !== 'string' ||
    typeof (parsed as Record<string, unknown>).r !== 'string' ||
    typeof (parsed as Record<string, unknown>).c !== 'string'
  ) {
    return { ok: false, error: 'This does not look like a valid screener response code.' }
  }

  const { t, r, c } = parsed as ResponsePayload

  if (!t.trim()) {
    return { ok: false, error: 'This response code is missing its invite token.' }
  }
  if (r.length !== SCREENER_ITEMS.length || [...r].some((ch) => !(ch in CODE_ANSWER))) {
    return { ok: false, error: 'This response code is malformed or from a different screener version.' }
  }

  const responses: ScreenerResponse[] = SCREENER_ITEMS.map((item, i) => ({
    itemId: item.id,
    domain: item.domain,
    answer: CODE_ANSWER[r[i]],
  }))

  return { ok: true, token: t, responses, completedAt: c }
}

export function buildInviteUrl(token: string, role: string): string {
  const url = new URL('/screener', window.location.origin)
  url.searchParams.set('token', token)
  url.searchParams.set('role', role)
  return url.toString()
}

export function generateToken(): string {
  // Short and easy to eyeball-compare, not cryptographically significant —
  // it only needs to be unlikely to collide among this practitioner's own
  // pending invites, not to resist guessing (brief §7: no account/identity
  // system for informants).
  return Math.random().toString(36).slice(2, 10)
}
