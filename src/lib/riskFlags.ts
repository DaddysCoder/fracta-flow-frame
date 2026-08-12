import type { Episode, FunctionHypothesis, RiskFlagTriggerType } from './types'

// Phase 3 trigger logic (brief §3). Pure functions — no DB access — mirroring
// the hypothesis.ts pattern so the same logic backs both the wiring in
// actions.ts and unit tests.

export interface FlagCandidate {
  triggerType: RiskFlagTriggerType
  triggerDetail: string
}

// episodesAscByDate: all episodes for the behaviour in ascending date order,
// including the just-saved episode as the last element.
export function checkEpisodeTriggers(episodesAscByDate: Episode[]): FlagCandidate[] {
  const candidates: FlagCandidate[] = []
  if (episodesAscByDate.length === 0) return candidates
  const latest = episodesAscByDate[episodesAscByDate.length - 1]

  if (latest.severityRating === 3) {
    candidates.push({
      triggerType: 'severity_threshold',
      triggerDetail: 'Episode logged with severity rated Severe (3).',
    })
  } else if (episodesAscByDate.length >= 3) {
    const last3 = episodesAscByDate.slice(-3)
    const trendingUp =
      last3[0].severityRating < last3[1].severityRating &&
      last3[1].severityRating < last3[2].severityRating
    if (trendingUp) {
      candidates.push({
        triggerType: 'severity_threshold',
        triggerDetail: `3 consecutive episodes trending upward in severity (${last3
          .map((e) => e.severityRating)
          .join(' → ')}).`,
      })
    }
  }

  // Independent of severity — fires whenever any checklist item is ticked,
  // regardless of whether severity_threshold also fired above (brief §3, §6).
  if (latest.riskFlags.length > 0) {
    candidates.push({
      triggerType: 'risk_checklist_item',
      triggerDetail: `Risk checklist ticked: ${latest.riskFlags.join(', ')}.`,
    })
  }

  return candidates
}

// hypothesesAscByComputedAt: all hypotheses for the behaviour in ascending
// computedAt order, including the just-computed one as the last element.
export function checkHypothesisTriggers(hypothesesAscByComputedAt: FunctionHypothesis[]): FlagCandidate[] {
  const candidates: FlagCandidate[] = []
  if (hypothesesAscByComputedAt.length === 0) return candidates

  // Counts recompute events, not episodes — 3 separate times the practitioner
  // recomputed and got 'mismatch' again, not 3 mismatched episodes.
  const last3 = hypothesesAscByComputedAt.slice(-3)
  if (last3.length === 3 && last3.every((h) => h.agreementStatus === 'mismatch')) {
    candidates.push({
      triggerType: 'persistent_mismatch',
      triggerDetail: "Screener and episode data disagreed ('mismatch') across the last 3 recomputes.",
    })
  }

  const latest = hypothesesAscByComputedAt[hypothesesAscByComputedAt.length - 1]
  if (latest.confidenceLevel === 'low' && latest.episodeCount >= 8) {
    candidates.push({
      triggerType: 'sustained_low_confidence',
      triggerDetail: `Confidence remains low despite ${latest.episodeCount} logged episodes.`,
    })
  }

  return candidates
}
