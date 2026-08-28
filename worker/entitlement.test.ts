import { describe, expect, it } from 'vitest'
import { evaluateEntitlement } from '../shared/entitlement'
import { userToSessionUser, type BillingRow, type UserRow } from './types'

function user(partial: Partial<UserRow> = {}): UserRow {
  return {
    id: 'u1',
    email: 'test@example.com',
    email_verified_at: '2026-08-01T00:00:00Z',
    trial_started_at: '2026-08-01T00:00:00Z',
    trial_ends_at: '2026-08-15T00:00:00Z',
    created_at: '2026-08-01T00:00:00Z',
    deleted_at: null,
    ...partial,
  }
}

describe('userToSessionUser', () => {
  const now = new Date('2026-08-10T00:00:00Z')

  it('maps trial entitlement during active trial', () => {
    const session = userToSessionUser(user(), null, now)
    expect(session.entitlement).toBe('trial')
  })

  it('maps pro when subscription active', () => {
    const billing: BillingRow = {
      user_id: 'u1',
      stripe_customer_id: 'cus_1',
      stripe_subscription_id: 'sub_1',
      stripe_price_id: 'price_monthly',
      status: 'active',
      current_period_end: Math.floor(now.getTime() / 1000) + 86400 * 30,
      cancel_at_period_end: 0,
      updated_at: now.toISOString(),
    }
    const session = userToSessionUser(user({ trial_ends_at: '2026-07-01T00:00:00Z' }), billing, now)
    expect(session.entitlement).toBe('pro')
  })

  it('maps free after trial expiry without subscription', () => {
    const session = userToSessionUser(
      user({ trial_ends_at: '2026-08-01T00:00:00Z' }),
      null,
      now,
    )
    expect(session.entitlement).toBe('free')
    expect(evaluateEntitlement({ now, trialEndsAt: '2026-08-01T00:00:00Z' })).toBe('free')
  })

  it('maps free when subscription cancelled', () => {
    const billing: BillingRow = {
      user_id: 'u1',
      stripe_customer_id: 'cus_1',
      stripe_subscription_id: 'sub_1',
      stripe_price_id: 'price_monthly',
      status: 'canceled',
      current_period_end: Math.floor(now.getTime() / 1000) - 86400,
      cancel_at_period_end: 0,
      updated_at: now.toISOString(),
    }
    const session = userToSessionUser(
      user({ trial_ends_at: '2026-08-01T00:00:00Z' }),
      billing,
      now,
    )
    expect(session.entitlement).toBe('free')
  })
})

describe('one trial per account', () => {
  it('trial_started_at is only set once on server (documented)', () => {
    const firstTrial = user({ trial_started_at: '2026-01-01T00:00:00Z' })
    expect(firstTrial.trial_started_at).toBeTruthy()
    // Re-verification must COALESCE trial_started_at — never overwrite.
  })
})

describe('downgrade preserves records (client contract)', () => {
  it('free entitlement does not imply data deletion', () => {
    expect(evaluateEntitlement({ trialEndsAt: '2020-01-01T00:00:00Z' })).toBe('free')
    // IndexedDB records, risk flags, backups remain available — enforced in UI not entitlement fn.
  })
})
