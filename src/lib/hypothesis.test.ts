import { describe, expect, it } from 'vitest'
import { computeHypothesis } from './hypothesis'
import type { Episode, FunctionScreener, ConsequenceTag, FunctionDomain } from './types'

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
    severityRating: 1,
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

function makeScreener(domainScores: Record<FunctionDomain, number>): FunctionScreener {
  return {
    id: nextId(),
    behaviourId: 'b1',
    informantId: 'local-practitioner',
    informantRole: 'BSP',
    dateCompleted: '2026-01-01T09:00:00.000Z',
    rawResponses: [],
    domainScores,
    createdAt: '2026-01-01T09:00:00.000Z',
  }
}

function episodesOnDays(days: string[], tag: ConsequenceTag): Episode[] {
  return days.map((d) => makeEpisode({ dateTime: `${d}T10:00:00.000Z`, consequenceTag: tag }))
}

const attentionTopScreener = makeScreener({ attention: 6, escape: 0, tangible: 0, automatic: 0 })

describe('computeHypothesis', () => {
  it('blocks when no screener has been completed', () => {
    const episodes = episodesOnDays(['2026-01-01', '2026-01-02', '2026-01-03'], 'attention')
    const outcome = computeHypothesis(episodes, [])
    expect(outcome.status).toBe('blocked')
  })

  it('zero episodes logged → insufficient_data, no crash', () => {
    const outcome = computeHypothesis([], [attentionTopScreener])
    expect(outcome.status).toBe('ok')
    if (outcome.status !== 'ok') throw new Error('unreachable')
    expect(outcome.result.agreementStatus).toBe('insufficient_data')
    expect(outcome.result.confidenceLevel).toBe('low')
    expect(outcome.result.episodePatternResult).toBeNull()
  })

  it('screener completed but fewer than 3 episodes → insufficient_data, confidence low', () => {
    const episodes = episodesOnDays(['2026-01-01', '2026-01-02'], 'attention')
    const outcome = computeHypothesis(episodes, [attentionTopScreener])
    expect(outcome.status).toBe('ok')
    if (outcome.status !== 'ok') throw new Error('unreachable')
    expect(outcome.result.agreementStatus).toBe('insufficient_data')
    expect(outcome.result.confidenceLevel).toBe('low')
  })

  it('tied dominant tag → no forced dominant result, insufficient_data', () => {
    const episodes = [
      ...episodesOnDays(['2026-01-01', '2026-01-02'], 'attention'),
      ...episodesOnDays(['2026-01-03', '2026-01-04'], 'escape'),
    ]
    const outcome = computeHypothesis(episodes, [attentionTopScreener])
    expect(outcome.status).toBe('ok')
    if (outcome.status !== 'ok') throw new Error('unreachable')
    expect(outcome.result.episodePatternResult).toBeNull()
    expect(outcome.result.agreementStatus).toBe('insufficient_data')
    expect(outcome.result.confidenceLevel).toBe('low')
  })

  it('multiple screeners with materially different results → disagreement flag fires', () => {
    const screenerA = makeScreener({ attention: 6, escape: 0, tangible: 0, automatic: 0 })
    const screenerB = makeScreener({ attention: 0, escape: 6, tangible: 0, automatic: 0 })
    const episodes = episodesOnDays(['2026-01-01', '2026-01-02', '2026-01-03'], 'attention')
    const outcome = computeHypothesis(episodes, [screenerA, screenerB])
    expect(outcome.status).toBe('ok')
    if (outcome.status !== 'ok') throw new Error('unreachable')
    expect(outcome.result.screenerDisagreement).toBe(true)
  })

  it('screeners agreeing on a top domain → no disagreement flag', () => {
    const screenerA = makeScreener({ attention: 6, escape: 2, tangible: 0, automatic: 0 })
    const screenerB = makeScreener({ attention: 5, escape: 0, tangible: 0, automatic: 0 })
    const episodes = episodesOnDays(['2026-01-01', '2026-01-02', '2026-01-03'], 'attention')
    const outcome = computeHypothesis(episodes, [screenerA, screenerB])
    expect(outcome.status).toBe('ok')
    if (outcome.status !== 'ok') throw new Error('unreachable')
    expect(outcome.result.screenerDisagreement).toBe(false)
  })

  it('recompute after adding an episode moves confidence from moderate to high without reload', () => {
    const moderateEpisodes = episodesOnDays(['2026-01-01', '2026-01-02', '2026-01-03'], 'attention')
    const moderateOutcome = computeHypothesis(moderateEpisodes, [attentionTopScreener])
    expect(moderateOutcome.status).toBe('ok')
    if (moderateOutcome.status !== 'ok') throw new Error('unreachable')
    expect(moderateOutcome.result.confidenceLevel).toBe('moderate')

    const highEpisodes = episodesOnDays(
      ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05'],
      'attention',
    )
    const highOutcome = computeHypothesis(highEpisodes, [attentionTopScreener])
    expect(highOutcome.status).toBe('ok')
    if (highOutcome.status !== 'ok') throw new Error('unreachable')
    expect(highOutcome.result.confidenceLevel).toBe('high')
  })

  it('all episodes on the same day cap confidence at low regardless of count', () => {
    const sameDay = Array.from({ length: 10 }, () =>
      makeEpisode({ dateTime: '2026-01-01T10:00:00.000Z', consequenceTag: 'attention' }),
    )
    const outcome = computeHypothesis(sameDay, [attentionTopScreener])
    expect(outcome.status).toBe('ok')
    if (outcome.status !== 'ok') throw new Error('unreachable')
    expect(outcome.result.distinctDayCount).toBe(1)
    expect(outcome.result.confidenceLevel).toBe('low')
  })

  it('match when episode pattern is in the screener top domains', () => {
    const episodes = episodesOnDays(['2026-01-01', '2026-01-02', '2026-01-03'], 'attention')
    const outcome = computeHypothesis(episodes, [attentionTopScreener])
    expect(outcome.status).toBe('ok')
    if (outcome.status !== 'ok') throw new Error('unreachable')
    expect(outcome.result.agreementStatus).toBe('match')
  })

  it('partial_match when episode pattern is a secondary (non-top, present) screener domain', () => {
    const screener = makeScreener({ attention: 6, escape: 3, tangible: 0, automatic: 0 })
    const episodes = episodesOnDays(['2026-01-01', '2026-01-02', '2026-01-03'], 'escape')
    const outcome = computeHypothesis(episodes, [screener])
    expect(outcome.status).toBe('ok')
    if (outcome.status !== 'ok') throw new Error('unreachable')
    expect(outcome.result.agreementStatus).toBe('partial_match')
  })

  it('mismatch when episode pattern does not appear in the screener at all', () => {
    const screener = makeScreener({ attention: 6, escape: 0, tangible: 0, automatic: 0 })
    const episodes = episodesOnDays(['2026-01-01', '2026-01-02', '2026-01-03'], 'tangible')
    const outcome = computeHypothesis(episodes, [screener])
    expect(outcome.status).toBe('ok')
    if (outcome.status !== 'ok') throw new Error('unreachable')
    expect(outcome.result.agreementStatus).toBe('mismatch')
  })

  it('excludes none_observed episodes from the pattern tally', () => {
    const episodes = [
      ...episodesOnDays(['2026-01-01', '2026-01-02', '2026-01-03'], 'attention'),
      ...episodesOnDays(['2026-01-04', '2026-01-05'], 'none_observed'),
    ]
    const outcome = computeHypothesis(episodes, [attentionTopScreener])
    expect(outcome.status).toBe('ok')
    if (outcome.status !== 'ok') throw new Error('unreachable')
    expect(outcome.result.episodePatternResult).toBe('attention')
    // total episodeCount still includes the none_observed ones (counts toward baseline)
    expect(outcome.result.episodeCount).toBe(5)
  })

  it('records full audit trail of contributing episode and screener ids', () => {
    const episodes = episodesOnDays(['2026-01-01', '2026-01-02', '2026-01-03'], 'attention')
    const outcome = computeHypothesis(episodes, [attentionTopScreener])
    expect(outcome.status).toBe('ok')
    if (outcome.status !== 'ok') throw new Error('unreachable')
    expect(outcome.result.contributingEpisodeIds).toEqual(episodes.map((e) => e.id))
    expect(outcome.result.contributingScreenerIds).toEqual([attentionTopScreener.id])
  })
})
