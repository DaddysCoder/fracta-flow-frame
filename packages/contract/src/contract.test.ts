import { describe, expect, it } from 'vitest'
import {
  CONTRACT_VERSION,
  ESCALATION_PHASES,
  FAST_DOMAINS,
  findDenylistedKeys,
  validateFbaOutcomeBundle,
  validateParticipantContext,
  type FbaOutcomeBundle,
  type ParticipantContext,
} from './index'

function fullParticipantContext(): ParticipantContext {
  return {
    contractVersion: CONTRACT_VERSION,
    linkId: 'link-abc-123',
    displayLabel: 'J.D.',
    planCycle: {
      planType: 'full',
      planStartDate: '2026-03-01',
      validityMonths: 12,
      expiresAt: '2027-03-01',
    },
    knownBehaviourLabels: ['Hitting', 'Elopement'],
    consentAttested: true,
    consentAttestedAt: '2026-03-01T00:00:00.000Z',
  }
}

function minimalFbaOutcomeBundle(): FbaOutcomeBundle {
  return {
    contractVersion: CONTRACT_VERSION,
    linkId: 'link-abc-123',
    generatedAt: '2026-08-17T00:00:00.000Z',
    generatedBy: 'Jo Practitioner, OT',
    sourceExportId: 'export-1',
    planCycleRef: null,
    outcomes: [
      {
        behaviourRef: 'behaviour-1',
        behaviour: {
          label: 'Hitting',
          operationalDefinition: 'Open palm contact with another person',
          status: 'active',
        },
        summaryStatement: {
          rendered: 'During transitions, J will hit because attention is provided.',
          slots: {
            routine: 'transitions',
            antecedent: null,
            behaviour: 'hit',
            consequence: 'attention provided',
            functionDirection: 'access',
            settingEvent: null,
          },
          completeness: 'partial',
        },
        hypothesis: {
          screenerResult: ['attention'],
          episodePatternResult: ['attention'],
          agreementStatus: 'match',
          computedConfidence: 'moderate',
          practitionerConfidence: null,
          lastComputedAt: '2026-08-01T00:00:00.000Z',
          caveat:
            'Even a full match between screener and observed pattern is not equivalent to confirmation via experimental functional analysis.',
        },
        evidenceBase: {
          episodeCount: 5,
          distinctDayCount: 4,
          screenerCount: 1,
          episodeIds: ['e1', 'e2', 'e3', 'e4', 'e5'],
          screenerIds: ['s1'],
        },
        escalationCycle: null,
        openRiskFlags: [],
      },
    ],
  }
}

function fullFbaOutcomeBundle(): FbaOutcomeBundle {
  const bundle = minimalFbaOutcomeBundle()
  bundle.planCycleRef = { planType: 'full', expiresAt: '2027-03-01' }
  bundle.outcomes[0].hypothesis.practitionerConfidence = 4
  bundle.outcomes[0].escalationCycle = {
    baseline: ['Calm, engaged'],
    early_warning: ['Pacing', 'Withdrawing'],
    escalation: ['Raised voice'],
    peak: ['Hitting'],
    de_escalation: ['Breathing slowing'],
    recovery: ['Seeking reassurance'],
  }
  bundle.outcomes[0].openRiskFlags = [
    { flagId: 'flag-1', triggerType: 'severity_threshold', triggeredAt: '2026-08-01T00:00:00.000Z', status: 'open' },
  ]
  bundle.outcomes[0].summaryStatement.completeness = 'full'
  bundle.outcomes[0].summaryStatement.slots.antecedent = 'asked to stop preferred activity'
  bundle.outcomes[0].summaryStatement.slots.settingEvent = 'missed medication'
  return bundle
}

describe('@fracta/contract', () => {
  it('has exactly four FastDomain members', () => {
    expect(FAST_DOMAINS).toHaveLength(4)
    expect(FAST_DOMAINS).toEqual(['attention', 'escape', 'tangible', 'automatic'])
  })

  it('has exactly six EscalationPhase members', () => {
    expect(ESCALATION_PHASES).toHaveLength(6)
    expect(ESCALATION_PHASES).toEqual([
      'baseline',
      'early_warning',
      'escalation',
      'peak',
      'de_escalation',
      'recovery',
    ])
  })

  describe('round-trip serialisation', () => {
    it('round-trips ParticipantContext (Vector -> Frame)', () => {
      const original = fullParticipantContext()
      const roundTripped = JSON.parse(JSON.stringify(original))
      expect(roundTripped).toEqual(original)
      expect(validateParticipantContext(roundTripped).ok).toBe(true)
    })

    it('round-trips FbaOutcomeBundle, minimal fixture (Frame -> Vector)', () => {
      const original = minimalFbaOutcomeBundle()
      const roundTripped = JSON.parse(JSON.stringify(original))
      expect(roundTripped).toEqual(original)
      expect(validateFbaOutcomeBundle(roundTripped).ok).toBe(true)
    })

    it('round-trips FbaOutcomeBundle, fully-populated fixture (Frame -> Vector)', () => {
      const original = fullFbaOutcomeBundle()
      const roundTripped = JSON.parse(JSON.stringify(original))
      expect(roundTripped).toEqual(original)
      expect(validateFbaOutcomeBundle(roundTripped).ok).toBe(true)
    })
  })

  describe('contractVersion', () => {
    it('rejects a ParticipantContext with an unknown contractVersion', () => {
      const ctx = { ...fullParticipantContext(), contractVersion: '2.0' }
      const result = validateParticipantContext(ctx)
      expect(result.ok).toBe(false)
      expect(result.errors.join(' ')).toMatch(/contractVersion/)
    })

    it('rejects an FbaOutcomeBundle with an unknown contractVersion', () => {
      const bundle = { ...minimalFbaOutcomeBundle(), contractVersion: '0.9' }
      const result = validateFbaOutcomeBundle(bundle)
      expect(result.ok).toBe(false)
      expect(result.errors.join(' ')).toMatch(/contractVersion/)
    })
  })

  describe('FbaOutcomeBundle validation', () => {
    it('fails when outcomes is empty', () => {
      const bundle = { ...minimalFbaOutcomeBundle(), outcomes: [] }
      const result = validateFbaOutcomeBundle(bundle)
      expect(result.ok).toBe(false)
      expect(result.errors.join(' ')).toMatch(/at least one/)
    })

    it('warns, but does not fail, above 6 outcomes', () => {
      const one = minimalFbaOutcomeBundle().outcomes[0]
      const bundle = { ...minimalFbaOutcomeBundle(), outcomes: Array.from({ length: 7 }, () => one) }
      const result = validateFbaOutcomeBundle(bundle)
      expect(result.ok).toBe(true)
      expect(result.warnings.join(' ')).toMatch(/7 outcomes/)
    })

    it('fails when linkId is absent — no minting fallback', () => {
      const bundle: Record<string, unknown> = { ...minimalFbaOutcomeBundle() }
      delete bundle.linkId
      const result = validateFbaOutcomeBundle(bundle)
      expect(result.ok).toBe(false)
      expect(result.errors.join(' ')).toMatch(/linkId is required/)
    })

    it('fails when hypothesis.caveat is empty', () => {
      const bundle = minimalFbaOutcomeBundle()
      bundle.outcomes[0].hypothesis.caveat = ''
      const result = validateFbaOutcomeBundle(bundle)
      expect(result.ok).toBe(false)
      expect(result.errors.join(' ')).toMatch(/caveat/)
    })

    it('fails when hypothesis.caveat is whitespace only', () => {
      const bundle = minimalFbaOutcomeBundle()
      bundle.outcomes[0].hypothesis.caveat = '   '
      const result = validateFbaOutcomeBundle(bundle)
      expect(result.ok).toBe(false)
      expect(result.errors.join(' ')).toMatch(/caveat/)
    })

    it('fails when behaviour.operationalDefinition is empty', () => {
      const bundle = minimalFbaOutcomeBundle()
      bundle.outcomes[0].behaviour.operationalDefinition = ''
      const result = validateFbaOutcomeBundle(bundle)
      expect(result.ok).toBe(false)
      expect(result.errors.join(' ')).toMatch(/operationalDefinition/)
    })
  })

  describe('PII denylist fuzz test', () => {
    it('finds no denylisted keys in a serialised ParticipantContext', () => {
      const serialised = JSON.parse(JSON.stringify(fullParticipantContext()))
      expect(findDenylistedKeys(serialised)).toEqual([])
    })

    it('finds no denylisted keys in a serialised FbaOutcomeBundle, other than generatedBy', () => {
      const serialised = JSON.parse(JSON.stringify(fullFbaOutcomeBundle()))
      expect(findDenylistedKeys(serialised)).toEqual([])
    })

    it('flags a denylisted key if one sneaks into the structure', () => {
      const withLeak = { ...fullParticipantContext(), extra: { dateOfBirth: '2000-01-01' } }
      const serialised = JSON.parse(JSON.stringify(withLeak))
      expect(findDenylistedKeys(serialised)).toEqual(['dateOfBirth'])
    })

    it('does not flag generatedBy itself', () => {
      expect(findDenylistedKeys({ generatedBy: 'Jo Practitioner, OT' })).toEqual([])
    })
  })
})
