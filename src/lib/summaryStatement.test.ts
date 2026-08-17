import { describe, expect, it } from 'vitest'
import { computeSummaryStatement } from './summaryStatement'
import type { Episode, FunctionHypothesis } from './types'

function episode(overrides: Partial<Episode> = {}): Episode {
  return {
    id: 'e',
    behaviourId: 'b',
    dateTime: '2026-01-01T00:00:00.000Z',
    durationMinutes: null,
    severityRating: 1,
    frequencyContext: 1,
    settingEvent: '',
    antecedentText: '',
    antecedentTag: 'unknown',
    consequenceText: '',
    consequenceTag: 'none_observed',
    loggedBy: 'Jo',
    riskFlags: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function hypothesis(overrides: Partial<FunctionHypothesis> = {}): FunctionHypothesis {
  return {
    id: 'h',
    behaviourId: 'b',
    computedAt: '2026-01-01T00:00:00.000Z',
    screenerFunctionResult: ['escape'],
    episodePatternResult: 'escape',
    episodeCount: 5,
    distinctDayCount: 5,
    agreementStatus: 'match',
    confidenceLevel: 'high',
    screenerDisagreement: false,
    contributingEpisodeIds: [],
    contributingScreenerIds: [],
    ...overrides,
  }
}

describe('computeSummaryStatement', () => {
  it('is partial with visible gaps when there are no episodes and no hypothesis', () => {
    const result = computeSummaryStatement('Hitting', [], null)
    expect(result.completeness).toBe('partial')
    expect(result.slots).toEqual({
      routine: null,
      antecedent: null,
      behaviour: 'Hitting',
      consequence: null,
      functionDirection: null,
      settingEvent: null,
    })
    expect(result.rendered).toMatch(/not yet been established/)
    expect(result.rendered).toMatch(/has not yet been clearly identified/)
  })

  it('never fabricates a function direction when the hypothesis is insufficient_data', () => {
    const episodes = [episode({ antecedentText: 'asked to do homework', consequenceText: 'task removed' })]
    const result = computeSummaryStatement('Hitting', episodes, hypothesis({ agreementStatus: 'insufficient_data' }))
    expect(result.slots.functionDirection).toBeNull()
    expect(result.completeness).toBe('partial')
  })

  it('populates antecedent/consequence/settingEvent from the modal (most frequent) episode text', () => {
    const episodes = [
      episode({ antecedentText: 'asked to stop', consequenceText: 'task removed', settingEvent: 'poor sleep' }),
      episode({ antecedentText: 'asked to stop', consequenceText: 'task removed', settingEvent: 'poor sleep' }),
      episode({ antecedentText: 'transition', consequenceText: 'attention given', settingEvent: '' }),
    ]
    const result = computeSummaryStatement('Hitting', episodes, hypothesis())
    expect(result.slots.antecedent).toBe('asked to stop')
    expect(result.slots.consequence).toBe('task removed')
    expect(result.slots.settingEvent).toBe('poor sleep')
  })

  it('maps an escape-dominant hypothesis to "avoid" and an attention-dominant one to "access"', () => {
    const episodes = [episode({ antecedentText: 'a', consequenceText: 'c', settingEvent: 's' })]
    expect(
      computeSummaryStatement('B', episodes, hypothesis({ episodePatternResult: 'escape' })).slots
        .functionDirection,
    ).toBe('avoid')
    expect(
      computeSummaryStatement('B', episodes, hypothesis({ episodePatternResult: 'attention' })).slots
        .functionDirection,
    ).toBe('access')
    expect(
      computeSummaryStatement('B', episodes, hypothesis({ episodePatternResult: 'tangible' })).slots
        .functionDirection,
    ).toBe('access')
    expect(
      computeSummaryStatement('B', episodes, hypothesis({ episodePatternResult: 'automatic' })).slots
        .functionDirection,
    ).toBe('access')
  })

  it('never renders participant identifying details — only "the participant"', () => {
    const episodes = [episode({ antecedentText: 'a', consequenceText: 'c', settingEvent: 's' })]
    const result = computeSummaryStatement('Elopement', episodes, hypothesis())
    expect(result.rendered).toMatch(/the participant will Elopement/)
  })

  it('is "full" only when every slot (including routine) is populated', () => {
    const episodes = [episode({ antecedentText: 'a', consequenceText: 'c', settingEvent: 's' })]
    const result = computeSummaryStatement('B', episodes, hypothesis())
    // routine has no source field anywhere in the data model, so it can
    // never be populated today — completeness is honestly 'partial'.
    expect(result.slots.routine).toBeNull()
    expect(result.completeness).toBe('partial')
  })
})
