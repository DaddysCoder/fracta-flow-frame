import { describe, expect, it } from 'vitest'
import { checkEpisodeTriggers, checkHypothesisTriggers } from './riskFlags'
import type { Episode, FunctionHypothesis } from './types'

let idCounter = 0
function nextId() {
  idCounter += 1
  return `id-${idCounter}`
}

function makeEpisode(overrides: Partial<Episode> = {}): Episode {
  return {
    id: nextId(),
    behaviourId: 'b1',
    dateTime: '2026-01-01T10:00:00.000Z',
    durationMinutes: null,
    severityRating: 0,
    frequencyContext: 1,
    settingEvent: '',
    antecedentText: 'demand placed',
    antecedentTag: 'demand',
    consequenceText: 'attention given',
    consequenceTag: 'attention',
    loggedBy: 'tester',
    riskFlags: [],
    createdAt: '2026-01-01T10:00:00.000Z',
    ...overrides,
  }
}

function makeHypothesis(overrides: Partial<FunctionHypothesis> = {}): FunctionHypothesis {
  return {
    id: nextId(),
    behaviourId: 'b1',
    computedAt: '2026-01-01T10:00:00.000Z',
    screenerFunctionResult: ['attention'],
    episodePatternResult: 'escape',
    episodeCount: 3,
    distinctDayCount: 3,
    agreementStatus: 'mismatch',
    confidenceLevel: 'moderate',
    screenerDisagreement: false,
    contributingEpisodeIds: [],
    contributingScreenerIds: [],
    ...overrides,
  }
}

describe('checkEpisodeTriggers', () => {
  it('risk checklist ticked on a severity=0 episode still fires, independent of severity', () => {
    const episodes = [makeEpisode({ severityRating: 0, riskFlags: ['elopement'] })]
    const candidates = checkEpisodeTriggers(episodes)
    expect(candidates).toEqual([
      { triggerType: 'risk_checklist_item', triggerDetail: expect.stringContaining('elopement') },
    ])
  })

  it('severity threshold and risk checklist both fire from the same episode as two separate flags', () => {
    const episodes = [makeEpisode({ severityRating: 3, riskFlags: ['injury'] })]
    const candidates = checkEpisodeTriggers(episodes)
    expect(candidates).toHaveLength(2)
    expect(candidates.map((c) => c.triggerType).sort()).toEqual(
      ['risk_checklist_item', 'severity_threshold'].sort(),
    )
  })

  it('no triggers fire for a mild episode with no risk items', () => {
    const episodes = [makeEpisode({ severityRating: 1, riskFlags: [] })]
    expect(checkEpisodeTriggers(episodes)).toEqual([])
  })

  it('3 consecutive episodes trending upward in severity fires severity_threshold', () => {
    const episodes = [
      makeEpisode({ severityRating: 0 }),
      makeEpisode({ severityRating: 1 }),
      makeEpisode({ severityRating: 2 }),
    ]
    const candidates = checkEpisodeTriggers(episodes)
    expect(candidates).toEqual([
      { triggerType: 'severity_threshold', triggerDetail: expect.stringContaining('trending upward') },
    ])
  })

  it('non-increasing severity sequence does not fire the trend trigger', () => {
    const episodes = [
      makeEpisode({ severityRating: 2 }),
      makeEpisode({ severityRating: 1 }),
      makeEpisode({ severityRating: 2 }),
    ]
    expect(checkEpisodeTriggers(episodes)).toEqual([])
  })
})

describe('checkHypothesisTriggers', () => {
  it('does not fire persistent_mismatch until 3 separate recomputes have all mismatched', () => {
    const twoMismatches = [
      makeHypothesis({ agreementStatus: 'mismatch' }),
      makeHypothesis({ agreementStatus: 'mismatch' }),
    ]
    expect(checkHypothesisTriggers(twoMismatches)).toEqual([])
  })

  it('fires persistent_mismatch on the 3rd consecutive mismatched recompute, counting recomputes not episodes', () => {
    const threeMismatches = [
      makeHypothesis({ agreementStatus: 'mismatch', episodeCount: 3 }),
      makeHypothesis({ agreementStatus: 'mismatch', episodeCount: 8 }), // 5 episodes logged between recomputes
      makeHypothesis({ agreementStatus: 'mismatch', episodeCount: 9 }),
    ]
    const candidates = checkHypothesisTriggers(threeMismatches)
    expect(candidates.map((c) => c.triggerType)).toContain('persistent_mismatch')
  })

  it('a non-mismatch recompute breaks the streak', () => {
    const hypotheses = [
      makeHypothesis({ agreementStatus: 'mismatch' }),
      makeHypothesis({ agreementStatus: 'match' }),
      makeHypothesis({ agreementStatus: 'mismatch' }),
    ]
    expect(checkHypothesisTriggers(hypotheses).map((c) => c.triggerType)).not.toContain('persistent_mismatch')
  })

  it('fires sustained_low_confidence when confidence stays low with 8+ episodes', () => {
    const hypotheses = [makeHypothesis({ agreementStatus: 'match', confidenceLevel: 'low', episodeCount: 8 })]
    const candidates = checkHypothesisTriggers(hypotheses)
    expect(candidates.map((c) => c.triggerType)).toContain('sustained_low_confidence')
  })

  it('does not fire sustained_low_confidence below the 8-episode threshold', () => {
    const hypotheses = [makeHypothesis({ agreementStatus: 'match', confidenceLevel: 'low', episodeCount: 7 })]
    expect(checkHypothesisTriggers(hypotheses)).toEqual([])
  })

  it('can fire both persistent_mismatch and sustained_low_confidence together', () => {
    const hypotheses = [
      makeHypothesis({ agreementStatus: 'mismatch', confidenceLevel: 'low', episodeCount: 8 }),
      makeHypothesis({ agreementStatus: 'mismatch', confidenceLevel: 'low', episodeCount: 9 }),
      makeHypothesis({ agreementStatus: 'mismatch', confidenceLevel: 'low', episodeCount: 10 }),
    ]
    const types = checkHypothesisTriggers(hypotheses).map((c) => c.triggerType)
    expect(types).toContain('persistent_mismatch')
    expect(types).toContain('sustained_low_confidence')
  })
})
