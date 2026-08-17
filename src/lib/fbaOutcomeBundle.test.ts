import { validateFbaOutcomeBundle } from '@fracta/contract'
import { describe, expect, it } from 'vitest'
import { assembleFbaOutcomeBundle, EFA_CAVEAT, type BehaviourBundleInput } from './fbaOutcomeBundle'
import { emptyEscalationCycle } from './escalationContent'
import { emptyChecklistEntry } from './abcOptions'
import type { Behaviour, Episode, Formulation, FunctionHypothesis, Participant, RiskFlag } from './types'

function participant(overrides: Partial<Participant> = {}): Participant {
  return {
    id: 'p1',
    identifyingDetails: 'J.D.',
    consentAttested: true,
    consentAttestedAt: '2026-01-01T00:00:00.000Z',
    consentAttestedBy: 'Jo',
    createdAt: '2026-01-01T00:00:00.000Z',
    linkId: 'link-abc-123',
    planCycle: null,
    knownBehaviourLabels: [],
    ...overrides,
  }
}

function behaviour(overrides: Partial<Behaviour> = {}): Behaviour {
  return {
    id: 'b1',
    participantId: 'p1',
    name: 'Hitting',
    operationalDefinition: 'Open palm contact with another person',
    status: 'active',
    createdBy: 'Jo',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function episode(overrides: Partial<Episode> = {}): Episode {
  return {
    id: 'e1',
    behaviourId: 'b1',
    dateTime: '2026-02-01T10:00:00.000Z',
    durationMinutes: 5,
    severityRating: 1,
    frequencyContext: 1,
    settingEvent: 'poor sleep',
    antecedentText: 'asked to stop preferred activity',
    antecedentTag: 'demand',
    consequenceText: 'attention given',
    consequenceTag: 'attention',
    loggedBy: 'Jo',
    riskFlags: [],
    createdAt: '2026-02-01T10:00:00.000Z',
    ...overrides,
  }
}

function hypothesis(overrides: Partial<FunctionHypothesis> = {}): FunctionHypothesis {
  return {
    id: 'h1',
    behaviourId: 'b1',
    computedAt: '2026-02-05T00:00:00.000Z',
    screenerFunctionResult: ['attention'],
    episodePatternResult: 'attention',
    episodeCount: 5,
    distinctDayCount: 4,
    agreementStatus: 'match',
    confidenceLevel: 'moderate',
    screenerDisagreement: false,
    contributingEpisodeIds: ['e1'],
    contributingScreenerIds: ['s1'],
    practitionerConfidence: null,
    ...overrides,
  }
}

function formulation(overrides: Partial<Formulation> = {}): Formulation {
  return {
    id: 'f1',
    behaviourId: 'b1',
    informantName: 'Support worker',
    informantRole: 'support worker',
    conductedBy: 'Jo',
    conductedAt: '2026-01-15T00:00:00.000Z',
    descriptionPrompts: { recentExample: '', intenseEpisode: '', antecedentAndResponse: '' },
    onset: '',
    frequencyImpression: '',
    riskScenarios: { highRisk: '', lowRisk: '' },
    escalationCycle: emptyEscalationCycle(),
    antecedentContext: emptyChecklistEntry(),
    consequenceContext: emptyChecklistEntry(),
    settingEvents: emptyChecklistEntry(),
    ...overrides,
  }
}

function riskFlag(overrides: Partial<RiskFlag> = {}): RiskFlag {
  return {
    id: 'rf1',
    behaviourId: 'b1',
    triggerType: 'severity_threshold',
    triggerDetail: 'x',
    triggeredAt: '2026-02-01T00:00:00.000Z',
    status: 'open',
    acknowledgedBy: null,
    acknowledgedAt: null,
    resolutionNote: null,
    ...overrides,
  }
}

function minimalBehaviourInput(): BehaviourBundleInput {
  return {
    behaviour: behaviour(),
    episodes: [episode()],
    formulations: [],
    latestHypothesis: hypothesis(),
    riskFlags: [],
  }
}

describe('assembleFbaOutcomeBundle', () => {
  it('fails closed when the participant has no linkId — no minting fallback', () => {
    const result = assembleFbaOutcomeBundle({
      participant: participant({ linkId: null }),
      generatedBy: 'Jo Practitioner, OT',
      generatedAt: '2026-08-17T00:00:00.000Z',
      sourceExportId: 'export-1',
      behaviours: [minimalBehaviourInput()],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/linkId/)
  })

  it('fails closed when a selected behaviour has no operational definition', () => {
    const result = assembleFbaOutcomeBundle({
      participant: participant(),
      generatedBy: 'Jo Practitioner, OT',
      generatedAt: '2026-08-17T00:00:00.000Z',
      sourceExportId: 'export-1',
      behaviours: [
        { ...minimalBehaviourInput(), behaviour: behaviour({ operationalDefinition: '   ' }) },
      ],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/operational definition/)
  })

  it('fails closed when a selected behaviour has no computed hypothesis', () => {
    const result = assembleFbaOutcomeBundle({
      participant: participant(),
      generatedBy: 'Jo Practitioner, OT',
      generatedAt: '2026-08-17T00:00:00.000Z',
      sourceExportId: 'export-1',
      behaviours: [{ ...minimalBehaviourInput(), latestHypothesis: null }],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/hypothesis/)
  })

  it('golden: minimal fixture — one behaviour, no formulations, no risk flags', () => {
    const result = assembleFbaOutcomeBundle({
      participant: participant(),
      generatedBy: 'Jo Practitioner, OT',
      generatedAt: '2026-08-17T00:00:00.000Z',
      sourceExportId: 'export-1',
      behaviours: [minimalBehaviourInput()],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.bundle).toEqual({
      contractVersion: '1.0',
      linkId: 'link-abc-123',
      generatedAt: '2026-08-17T00:00:00.000Z',
      generatedBy: 'Jo Practitioner, OT',
      sourceExportId: 'export-1',
      planCycleRef: null,
      outcomes: [
        {
          behaviourRef: 'b1',
          behaviour: {
            label: 'Hitting',
            operationalDefinition: 'Open palm contact with another person',
            status: 'active',
          },
          summaryStatement: {
            rendered: expect.stringContaining('the participant will Hitting'),
            slots: {
              routine: null,
              antecedent: 'asked to stop preferred activity',
              behaviour: 'Hitting',
              consequence: 'attention given',
              functionDirection: 'access',
              settingEvent: 'poor sleep',
            },
            completeness: 'partial', // routine has no source field, so never 'full'
          },
          hypothesis: {
            screenerResult: ['attention'],
            episodePatternResult: ['attention'],
            agreementStatus: 'match',
            computedConfidence: 'moderate',
            practitionerConfidence: null,
            lastComputedAt: '2026-02-05T00:00:00.000Z',
            caveat: EFA_CAVEAT,
          },
          evidenceBase: {
            episodeCount: 5,
            distinctDayCount: 4,
            screenerCount: 1,
            episodeIds: ['e1'],
            screenerIds: ['s1'],
          },
          escalationCycle: null,
          openRiskFlags: [],
        },
      ],
    })

    expect(validateFbaOutcomeBundle(result.bundle).ok).toBe(true)
  })

  it('golden: fully-populated fixture — formulations merged, risk flags, practitioner confidence', () => {
    const cycleA = emptyEscalationCycle()
    cycleA.early_warning = { checkedItems: ['early-warning-pacing'], customItems: ['grinding teeth'] }
    const cycleB = emptyEscalationCycle()
    cycleB.early_warning = { checkedItems: ['early-warning-fidgeting'], customItems: ['grinding teeth'] } // dup custom

    const result = assembleFbaOutcomeBundle({
      participant: participant(),
      generatedBy: 'Jo Practitioner, OT',
      generatedAt: '2026-08-17T00:00:00.000Z',
      sourceExportId: 'export-2',
      behaviours: [
        {
          behaviour: behaviour(),
          episodes: [episode()],
          formulations: [
            formulation({ id: 'f1', escalationCycle: cycleA }),
            formulation({ id: 'f2', escalationCycle: cycleB }),
          ],
          latestHypothesis: hypothesis({ practitionerConfidence: 5 }),
          riskFlags: [
            riskFlag({ id: 'rf1', status: 'open' }),
            riskFlag({ id: 'rf2', status: 'resolved' }), // excluded — not "open"
            riskFlag({ id: 'rf3', status: 'escalated_to_efa' }),
          ],
        },
      ],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const outcome = result.bundle.outcomes[0]
    expect(outcome.hypothesis.practitionerConfidence).toBe(5)
    expect(outcome.escalationCycle?.early_warning).toEqual(['Pacing', 'grinding teeth', 'Fidgeting'])
    expect(outcome.openRiskFlags.map((f) => f.flagId).sort()).toEqual(['rf1', 'rf3'])

    expect(validateFbaOutcomeBundle(result.bundle).ok).toBe(true)
  })
})
