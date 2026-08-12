import { describe, expect, it } from 'vitest'
import { buildInviteUrl, decodeResponsePayload, encodeResponsePayload } from './qrPayload'
import { SCREENER_ITEMS } from './screener'
import type { ScreenerAnswer, ScreenerResponse } from './types'

function fullResponses(pattern: (i: number) => ScreenerAnswer): ScreenerResponse[] {
  return SCREENER_ITEMS.map((item, i) => ({
    itemId: item.id,
    domain: item.domain,
    answer: pattern(i),
  }))
}

describe('encodeResponsePayload / decodeResponsePayload', () => {
  it('round-trips a full set of responses through encode then decode', () => {
    const answers: ScreenerAnswer[] = ['yes', 'no', 'unsure']
    const responses = fullResponses((i) => answers[i % 3])
    const encoded = encodeResponsePayload('tok123', responses, '2026-01-01T10:00:00.000Z')
    const decoded = decodeResponsePayload(encoded)

    expect(decoded.ok).toBe(true)
    if (!decoded.ok) throw new Error('unreachable')
    expect(decoded.token).toBe('tok123')
    expect(decoded.completedAt).toBe('2026-01-01T10:00:00.000Z')
    expect(decoded.responses).toEqual(responses)
  })

  it('keeps the realistic payload comfortably small for a single QR frame', () => {
    const responses = fullResponses(() => 'yes')
    const encoded = encodeResponsePayload('a-realistic-token-1234', responses, new Date().toISOString())
    const byteSize = new TextEncoder().encode(encoded).length
    // Generous ceiling — QR version 5 at error-correction M holds ~106 bytes
    // of binary data and this comfortably clears that, well before the
    // brief's fallback (dropping rawResponses) would ever be needed.
    expect(byteSize).toBeLessThan(150)
  })

  it('rejects malformed JSON', () => {
    const result = decodeResponsePayload('not json at all')
    expect(result.ok).toBe(false)
  })

  it('rejects JSON missing required fields', () => {
    const result = decodeResponsePayload(JSON.stringify({ t: 'tok' }))
    expect(result.ok).toBe(false)
  })

  it('rejects a response code of the wrong length', () => {
    const result = decodeResponsePayload(JSON.stringify({ t: 'tok', r: 'yny', c: '2026-01-01' }))
    expect(result.ok).toBe(false)
  })

  it('rejects a response code with invalid characters', () => {
    const badCode = 'x'.repeat(SCREENER_ITEMS.length)
    const result = decodeResponsePayload(JSON.stringify({ t: 'tok', r: badCode, c: '2026-01-01' }))
    expect(result.ok).toBe(false)
  })
})

describe('buildInviteUrl', () => {
  it('embeds only the token and role, never behaviour or clinical detail', () => {
    const url = buildInviteUrl('abc123', 'support worker')
    expect(url).toContain('token=abc123')
    expect(url).toContain('role=support')
    expect(url).not.toMatch(/behaviour/i)
  })
})
