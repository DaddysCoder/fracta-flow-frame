import type {
  AgreementStatus,
  ConfidenceLevel,
  Episode,
  FunctionDomain,
  FunctionScreener,
} from './types'

// Phase 2 triangulation (brief §3). Pure functions — no DB access — so the
// same logic backs both the on-demand "Recompute" action and unit tests.

const DOMAINS: FunctionDomain[] = ['attention', 'escape', 'tangible', 'automatic']

export interface HypothesisComputation {
  screenerFunctionResult: FunctionDomain[]
  episodePatternResult: FunctionDomain | null
  episodeCount: number
  distinctDayCount: number
  agreementStatus: AgreementStatus
  confidenceLevel: ConfidenceLevel
  screenerDisagreement: boolean
  contributingEpisodeIds: string[]
  contributingScreenerIds: string[]
}

export type ComputeOutcome =
  | { status: 'blocked'; reason: string }
  | { status: 'ok'; result: HypothesisComputation }

export function computeHypothesis(
  episodes: Episode[],
  screeners: FunctionScreener[],
): ComputeOutcome {
  if (screeners.length === 0) {
    return {
      status: 'blocked',
      reason: 'Complete a function screener for this behaviour before computing a hypothesis.',
    }
  }

  const { topDomains, disagreement } = aggregateScreeners(screeners)
  const secondary = secondaryDomains(screeners, topDomains)

  const taggedEpisodes = episodes.filter((e) => e.consequenceTag !== 'none_observed')
  const episodePatternResult = dominantConsequence(taggedEpisodes)
  const hasDominantPattern = episodePatternResult !== null

  const episodeCount = episodes.length
  const distinctDayCount = new Set(episodes.map((e) => e.dateTime.slice(0, 10))).size

  let agreementStatus: AgreementStatus
  if (episodeCount < 3 || !hasDominantPattern) {
    agreementStatus = 'insufficient_data'
  } else if (topDomains.includes(episodePatternResult)) {
    agreementStatus = 'match'
  } else if (secondary.includes(episodePatternResult)) {
    agreementStatus = 'partial_match'
  } else {
    agreementStatus = 'mismatch'
  }

  const confidenceLevel = computeConfidence(episodeCount, distinctDayCount, hasDominantPattern)

  return {
    status: 'ok',
    result: {
      screenerFunctionResult: topDomains,
      episodePatternResult,
      episodeCount,
      distinctDayCount,
      agreementStatus,
      confidenceLevel,
      screenerDisagreement: disagreement,
      contributingEpisodeIds: episodes.map((e) => e.id),
      contributingScreenerIds: screeners.map((s) => s.id),
    },
  }
}

function combinedAverageScores(screeners: FunctionScreener[]): Record<FunctionDomain, number> {
  const totals: Record<FunctionDomain, number> = { attention: 0, escape: 0, tangible: 0, automatic: 0 }
  for (const s of screeners) {
    for (const d of DOMAINS) totals[d] += s.domainScores[d]
  }
  const avg = {} as Record<FunctionDomain, number>
  for (const d of DOMAINS) avg[d] = totals[d] / screeners.length
  return avg
}

function topDomainsFromScores(scores: Record<FunctionDomain, number>): FunctionDomain[] {
  const max = Math.max(...DOMAINS.map((d) => scores[d]))
  if (max <= 0) return []
  return DOMAINS.filter((d) => scores[d] === max)
}

function aggregateScreeners(screeners: FunctionScreener[]): {
  topDomains: FunctionDomain[]
  disagreement: boolean
} {
  const avg = combinedAverageScores(screeners)
  const topDomains = topDomainsFromScores(avg)

  let disagreement = false
  if (screeners.length >= 2) {
    const perScreenerTop = screeners.map((s) => topDomainsFromScores(s.domainScores))
    const intersection = perScreenerTop.reduce((acc, top) => acc.filter((d) => top.includes(d)))
    disagreement = intersection.length === 0
  }

  return { topDomains, disagreement }
}

function secondaryDomains(
  screeners: FunctionScreener[],
  topDomains: FunctionDomain[],
): FunctionDomain[] {
  const avg = combinedAverageScores(screeners)
  return DOMAINS.filter((d) => avg[d] > 0 && !topDomains.includes(d))
}

function dominantConsequence(taggedEpisodes: Episode[]): FunctionDomain | null {
  if (taggedEpisodes.length === 0) return null
  const counts: Record<FunctionDomain, number> = { attention: 0, escape: 0, tangible: 0, automatic: 0 }
  for (const e of taggedEpisodes) {
    counts[e.consequenceTag as FunctionDomain] += 1
  }
  const max = Math.max(...DOMAINS.map((d) => counts[d]))
  const modes = DOMAINS.filter((d) => counts[d] === max)
  return modes.length === 1 ? modes[0] : null
}

function computeConfidence(
  episodeCount: number,
  distinctDayCount: number,
  hasDominantPattern: boolean,
): ConfidenceLevel {
  if (episodeCount < 3 || !hasDominantPattern) return 'low'
  if (episodeCount >= 5 && distinctDayCount >= 5) return 'high'
  if (distinctDayCount >= 2) return 'moderate'
  // Enough episodes and a clear pattern, but all logged on the same day —
  // capped at low rather than a false "moderate"/"high" (brief §5, last case).
  return 'low'
}
