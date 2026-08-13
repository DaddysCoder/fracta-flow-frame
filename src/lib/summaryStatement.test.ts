import { describe, expect, it } from 'vitest'
import { buildSummaryStatement } from './summaryStatement'
import type { Behaviour, Episode, FunctionHypothesis } from './types'

let idCounter = 0
function nextId() {
  idCounter += 1
  return `id-${idCounter}`
}

function makeBehaviour(overrides: Partial<Behaviour> = {}): Behaviour {
  return {
    id: 'b1',
    participantId: 'p1',
    name: 'Hitting',
    operationalDefinition: 'Strikes another person with an open or closed hand',
    concernCategories: [],
    status: 'active',
    createdBy: 'tester',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeEpisode(overrides: Partial<Episode> = {}): Episode {
  return {
    id: nextId(),
    behaviourId: 'b1',
    dateTime: '2026-01-01T10:00:00.000Z',
    durationMinutes: null,
    severityRating: 1,
    frequencyContext: 1,
    settingEvent: '',
    settingEventTags: [],
    antecedentText: 'demand placed',
    antecedentTags: [],
    consequenceText: 'attention given',
    consequenceTags: [],
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
    computedAt: '2026-01-01T11:00:00.000Z',
    screenerFunctionResult: ['attention'],
    episodePatternResult: 'attention',
    episodeCount: 3,
    distinctDayCount: 3,
    agreementStatus: 'match',
    confidenceLevel: 'moderate',
    screenerDisagreement: false,
    contributingEpisodeIds: [],
    contributingScreenerIds: [],
    ...overrides,
  }
}

describe('buildSummaryStatement', () => {
  it('handles the no-episodes case explicitly, not blank fields', () => {
    const statement = buildSummaryStatement(makeBehaviour(), [], null)
    expect(statement).toMatch(/not enough data/i)
  })

  it('handles episodes with no checklist tags at all — still not enough data', () => {
    const episodes = [makeEpisode({ consequenceTag: 'none_observed' })]
    const statement = buildSummaryStatement(makeBehaviour(), episodes, null)
    expect(statement).toMatch(/not enough/i)
  })

  it('builds a statement from the most common antecedent, consequence and setting event tags', () => {
    const episodes = [
      makeEpisode({
        antecedentTags: ['Given an instruction or demand'],
        settingEventTags: ['Lack of sleep'],
        consequenceTags: ['Attention (staff/support worker) given or avoided'],
        consequenceTag: 'attention',
      }),
      makeEpisode({
        antecedentTags: ['Given an instruction or demand'],
        settingEventTags: ['Lack of sleep'],
        consequenceTags: ['Attention (staff/support worker) given or avoided'],
        consequenceTag: 'attention',
      }),
    ]
    const statement = buildSummaryStatement(makeBehaviour(), episodes, makeHypothesis())
    expect(statement).toContain('given an instruction or demand')
    expect(statement).toContain('Hitting')
    expect(statement).toContain('gain attention')
    expect(statement).toContain('lack of sleep')
  })

  it('prefers the hypothesis episodePatternResult over recomputing locally', () => {
    const episodes = [
      makeEpisode({ consequenceTag: 'escape', consequenceTags: ['Task or activity avoided'] }),
    ]
    const hypothesis = makeHypothesis({ episodePatternResult: 'tangible' })
    const statement = buildSummaryStatement(makeBehaviour(), episodes, hypothesis)
    expect(statement).toContain('gain access to a preferred item or activity')
  })

  it('falls back to computing the dominant consequence locally when no hypothesis exists yet', () => {
    const episodes = [
      makeEpisode({ consequenceTag: 'escape' }),
      makeEpisode({ consequenceTag: 'escape' }),
    ]
    const statement = buildSummaryStatement(makeBehaviour(), episodes, null)
    expect(statement).toContain('escape or avoid a demand or activity')
  })

  it('falls back to the no-data placeholder when every field is a tie', () => {
    const episodes = [
      makeEpisode({ antecedentTags: ['A'], consequenceTag: 'none_observed' }),
      makeEpisode({ antecedentTags: ['B'], consequenceTag: 'none_observed' }),
    ]
    const statement = buildSummaryStatement(makeBehaviour(), episodes, makeHypothesis({ episodePatternResult: null }))
    expect(statement).toMatch(/not enough/i)
  })

  it('omits a tied antecedent field rather than guessing, while still using the known function', () => {
    const episodes = [
      makeEpisode({ antecedentTags: ['A'] }),
      makeEpisode({ antecedentTags: ['B'] }),
    ]
    const statement = buildSummaryStatement(makeBehaviour(), episodes, makeHypothesis({ episodePatternResult: 'attention' }))
    expect(statement).toContain('a trigger occurs')
    expect(statement).toContain('gain attention')
  })
})
