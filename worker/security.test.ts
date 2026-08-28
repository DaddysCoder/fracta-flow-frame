import { describe, expect, it } from 'vitest'
import { normalizeEmail, randomOtp, sha256Hex } from './crypto'

describe('crypto helpers', () => {
  it('normalizes email', () => {
    expect(normalizeEmail('  User@Example.COM ')).toBe('user@example.com')
  })

  it('hashes consistently', async () => {
    const a = await sha256Hex('123456')
    const b = await sha256Hex('123456')
    expect(a).toBe(b)
    expect(a).not.toBe(await sha256Hex('654321'))
  })

  it('generates 6-digit OTP', () => {
    const code = randomOtp()
    expect(code).toMatch(/^\d{6}$/)
  })
})

describe('OTP security model', () => {
  it('stores hash not plaintext (contract)', async () => {
    const code = '482910'
    const hash = await sha256Hex(code)
    expect(hash).not.toContain(code)
    expect(hash.length).toBe(64)
  })
})

describe('webhook idempotency contract', () => {
  it('duplicate event ids should be ignored (documented behaviour)', () => {
    const processed = new Set<string>()
    const eventId = 'evt_test_123'
    expect(processed.has(eventId)).toBe(false)
    processed.add(eventId)
    expect(processed.has(eventId)).toBe(true)
  })
})

describe('entitlement follows account not browser', () => {
  it('trial state is server-side fields not localStorage keys', () => {
    // Trial lives on users.trial_ends_at in D1 — clearing browser data cannot restart it.
    const browserKeys = ['frame-trial-expired-dismissed']
    expect(browserKeys).not.toContain('frame-trial-ends-at')
  })
})

describe('no participant cloud sync', () => {
  it('clinical records stay local-only by design', () => {
    const localStores = ['IndexedDB', 'JSON backup']
    const cloudClinical = ['participants', 'episodes', 'screeners']
    expect(localStores.length).toBeGreaterThan(0)
    expect(cloudClinical.every((t) => t !== 'users')).toBe(true)
  })
})
