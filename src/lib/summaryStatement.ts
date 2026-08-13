import type { Behaviour, Episode, FunctionDomain, FunctionHypothesis } from './types'

// Phase 1.3 (brief §4) — auto-generated plain-English summary statement.
// Pure function, computed on demand from episodes/hypothesis rather than
// stored redundantly, so it always reflects current data.

const RECENT_EPISODE_LIMIT = 20

const FUNCTION_PHRASES: Record<FunctionDomain, string> = {
  attention: 'gain attention',
  escape: 'escape or avoid a demand or activity',
  tangible: 'gain access to a preferred item or activity',
  automatic: 'obtain or avoid a sensory experience',
}

// Same mode-aggregation approach as hypothesis.ts's dominantConsequence
// (count occurrences per value, take the max, and only return a winner if
// it's unique) — generalised here to arbitrary string tags, since
// dominantConsequence itself is hardcoded to the 4 fixed FAST domain keys
// and doesn't fit antecedent/setting-event checklist tags. hypothesis.ts is
// not modified; this is a parallel implementation of the same rule.
function modeOf(values: string[]): string | null {
  if (values.length === 0) return null
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  const max = Math.max(...counts.values())
  const modes = [...counts.entries()].filter(([, c]) => c === max).map(([v]) => v)
  return modes.length === 1 ? modes[0] : null
}

export function buildSummaryStatement(
  behaviour: Behaviour,
  episodes: Episode[],
  hypothesis: FunctionHypothesis | null,
): string {
  if (episodes.length === 0) {
    return 'Not enough data yet — log at least one episode to generate a summary statement.'
  }

  const recent = [...episodes].sort((a, b) => b.dateTime.localeCompare(a.dateTime)).slice(0, RECENT_EPISODE_LIMIT)

  const antecedent = modeOf(recent.flatMap((e) => e.antecedentTags))
  const settingEvent = modeOf(recent.flatMap((e) => e.settingEventTags))
  const consequenceLabel = modeOf(recent.flatMap((e) => e.consequenceTags))

  // Prefer the hypothesis's already-computed dominant pattern (identical
  // dominantConsequence logic, just already run) when one exists; fall back
  // to computing the same mode locally from the recent episode window when
  // no hypothesis has been computed yet.
  const taggedConsequences = recent.filter((e) => e.consequenceTag !== 'none_observed')
  const consequenceDomain: FunctionDomain | null = hypothesis
    ? hypothesis.episodePatternResult
    : (modeOf(taggedConsequences.map((e) => e.consequenceTag)) as FunctionDomain | null)

  if (!antecedent && !consequenceDomain && !settingEvent) {
    return 'Not enough consistent data yet to generate a summary statement — keep logging episodes with checklist detail.'
  }

  const parts: string[] = []
  parts.push(
    `When ${antecedent ? antecedent.toLowerCase() : 'a trigger occurs'}, ${behaviour.name} tends to happen${
      consequenceLabel ? `, followed by ${consequenceLabel.toLowerCase()}` : ''
    }.`,
  )
  parts.push(
    consequenceDomain
      ? `Therefore the function is likely to ${FUNCTION_PHRASES[consequenceDomain]}.`
      : 'The function is not yet clear from the data collected so far.',
  )
  if (settingEvent) {
    parts.push(`This is more likely when ${settingEvent.toLowerCase()}.`)
  }
  return parts.join(' ')
}
