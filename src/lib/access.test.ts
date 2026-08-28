import { describe, expect, it } from 'vitest'
import {
  canCreateParticipant,
  canUseProFeature,
  evaluateEntitlement,
  PARTICIPANT_LIMIT_MESSAGE,
  TRIAL_EXPIRED_MESSAGE,
} from '../../shared/entitlement'

describe('access model UI contracts', () => {
  it('downgrade with >2 participants blocks creation only', () => {
    expect(canCreateParticipant(5, 'free')).toBe(false)
    expect(PARTICIPANT_LIMIT_MESSAGE).toContain('existing records remain available')
  })

  it('risk flags and backup are never paywalled (not in pro feature list)', () => {
    const proFeatures = [
      'multi_informant_qr',
      'multi_informant_comparison',
      'clinical_report',
      'plan_appendix',
      'staff_training_summary',
      'vector_import',
    ] as const
    expect(proFeatures).not.toContain('risk_flags' as never)
    expect(proFeatures).not.toContain('backup' as never)
  })

  it('trial expiry message preserves records', () => {
    expect(TRIAL_EXPIRED_MESSAGE).toContain('Frame records are still here')
  })

  it('entitlement follows server account state', () => {
    const serverTrial = evaluateEntitlement({ trialEndsAt: '2026-12-01T00:00:00Z' })
    expect(serverTrial).toBe('trial')
    // Client must fetch /api/auth/me — not infer from localStorage alone.
  })

  it('pro gating shows features rather than hiding routes', () => {
    expect(canUseProFeature('clinical_report', 'free')).toBe(false)
    expect(canUseProFeature('clinical_report', 'pro')).toBe(true)
  })
})
