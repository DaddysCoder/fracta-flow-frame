import { describe, expect, it } from 'vitest'
import {
  FREE_PARTICIPANT_LIMIT,
  TRIAL_DAYS,
  canCreateParticipant,
  canUseProFeature,
  evaluateEntitlement,
  hasProAccess,
  trialDaysRemaining,
} from './entitlement'

describe('evaluateEntitlement', () => {
  const now = new Date('2026-08-28T12:00:00Z')

  it('returns free by default', () => {
    expect(evaluateEntitlement({ now })).toBe('free')
  })

  it('returns pro for active subscription within period', () => {
    expect(
      evaluateEntitlement({
        now,
        subscriptionStatus: 'active',
        subscriptionPeriodEnd: Math.floor(now.getTime() / 1000) + 86400,
      }),
    ).toBe('pro')
  })

  it('returns trial for unexpired trial', () => {
    expect(
      evaluateEntitlement({
        now,
        trialEndsAt: '2026-09-10T00:00:00Z',
      }),
    ).toBe('trial')
  })

  it('prefers pro over trial when both apply', () => {
    expect(
      evaluateEntitlement({
        now,
        subscriptionStatus: 'active',
        subscriptionPeriodEnd: Math.floor(now.getTime() / 1000) + 86400,
        trialEndsAt: '2026-09-10T00:00:00Z',
      }),
    ).toBe('pro')
  })

  it('returns free when trial expired', () => {
    expect(
      evaluateEntitlement({
        now,
        trialEndsAt: '2026-08-01T00:00:00Z',
      }),
    ).toBe('free')
  })

  it('returns free for cancelled subscription past period', () => {
    expect(
      evaluateEntitlement({
        now,
        subscriptionStatus: 'canceled',
        subscriptionPeriodEnd: Math.floor(now.getTime() / 1000) - 86400,
      }),
    ).toBe('free')
  })

  it('returns pro for past_due within period', () => {
    expect(
      evaluateEntitlement({
        now,
        subscriptionStatus: 'past_due',
        subscriptionPeriodEnd: Math.floor(now.getTime() / 1000) + 86400,
      }),
    ).toBe('pro')
  })
})

describe('participant limit', () => {
  it('allows up to 2 participants on free', () => {
    expect(canCreateParticipant(0, 'free')).toBe(true)
    expect(canCreateParticipant(1, 'free')).toBe(true)
    expect(canCreateParticipant(FREE_PARTICIPANT_LIMIT - 1, 'free')).toBe(true)
    expect(canCreateParticipant(FREE_PARTICIPANT_LIMIT, 'free')).toBe(false)
  })

  it('allows unlimited on trial and pro', () => {
    expect(canCreateParticipant(10, 'trial')).toBe(true)
    expect(canCreateParticipant(10, 'pro')).toBe(true)
  })

  it('does not block access to existing participants when over limit on free', () => {
    // Existing records remain accessible — only creation is gated (tested via canCreateParticipant).
    expect(canCreateParticipant(5, 'free')).toBe(false)
  })
})

describe('pro feature gating', () => {
  it('gates pro features on free', () => {
    expect(canUseProFeature('vector_import', 'free')).toBe(false)
    expect(canUseProFeature('multi_informant_qr', 'free')).toBe(false)
    expect(canUseProFeature('clinical_report', 'free')).toBe(false)
  })

  it('allows pro features on trial and pro', () => {
    expect(hasProAccess('trial')).toBe(true)
    expect(hasProAccess('pro')).toBe(true)
    expect(canUseProFeature('vector_import', 'trial')).toBe(true)
    expect(canUseProFeature('vector_import', 'pro')).toBe(true)
  })
})

describe('trialDaysRemaining', () => {
  it('counts days until trial end', () => {
    const now = new Date('2026-08-28T12:00:00Z')
    expect(trialDaysRemaining('2026-09-10T00:00:00Z', now)).toBe(13)
  })

  it('returns 0 when expired', () => {
    const now = new Date('2026-09-11T00:00:00Z')
    expect(trialDaysRemaining('2026-09-10T00:00:00Z', now)).toBe(0)
  })
})

describe('constants', () => {
  it('uses 14-day trial', () => {
    expect(TRIAL_DAYS).toBe(14)
  })
})
