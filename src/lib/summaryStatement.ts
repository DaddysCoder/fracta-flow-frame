import type { SummaryStatementSlots } from '@fracta/contract'
import type { Episode, FunctionDomain, FunctionHypothesis } from './types'

// Slots-first summary statement (brief Part B, step 6).
//
// Slots are the source of truth; the sentence is rendered from them, not the
// reverse — so a later consumer (Vector's Form 07, via FbaOutcomeBundle in
// step 8) can re-render its own house style from the same structured data.
// SummaryStatementSlots is imported straight from @fracta/contract rather
// than redefined locally, so Frame's local shape is guaranteed compatible
// with the boundary type from the start.
//
// Deliberate PII-safety note: the template's "[participant]" placeholder is
// rendered as "the participant" here, never participant.identifyingDetails —
// this rendered sentence is exactly the string that later crosses into
// FbaOutcomeBundle.summaryStatement.rendered (contract A1: identifying
// details never cross the Frame/Vector boundary).

export interface SummaryStatement {
  rendered: string
  slots: SummaryStatementSlots
  completeness: 'full' | 'partial'
}

const DIRECTION_BY_DOMAIN: Record<FunctionDomain, 'access' | 'avoid'> = {
  attention: 'access',
  tangible: 'access',
  automatic: 'access',
  escape: 'avoid',
}

function modalNonEmptyText(values: string[]): string | null {
  const trimmed = values.map((v) => v.trim()).filter((v) => v.length > 0)
  if (trimmed.length === 0) return null

  const counts = new Map<string, number>()
  for (const v of trimmed) counts.set(v, (counts.get(v) ?? 0) + 1)

  let best: string | null = null
  let bestCount = 0
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value
      bestCount = count
    }
  }
  return best
}

function functionDirection(hypothesis: FunctionHypothesis | null): 'access' | 'avoid' | null {
  if (!hypothesis || hypothesis.agreementStatus === 'insufficient_data') return null
  const domain = hypothesis.episodePatternResult
  return domain ? DIRECTION_BY_DOMAIN[domain] : null
}

export function computeSummaryStatement(
  behaviourName: string,
  episodes: Episode[],
  hypothesis: FunctionHypothesis | null,
): SummaryStatement {
  const antecedent = modalNonEmptyText(episodes.map((e) => e.antecedentText))
  const consequence = modalNonEmptyText(episodes.map((e) => e.consequenceText))
  const settingEvent = modalNonEmptyText(episodes.map((e) => e.settingEvent))
  const direction = functionDirection(hypothesis)

  // routine has no source field anywhere in the current data model — always
  // null, which is an honest gap, not a bug: there is nothing to fabricate
  // it from.
  const routine: string | null = null

  const slots: SummaryStatementSlots = {
    routine,
    antecedent,
    behaviour: behaviourName,
    consequence,
    functionDirection: direction,
    settingEvent,
  }

  const completeness: 'full' | 'partial' =
    routine !== null && antecedent !== null && consequence !== null && direction !== null && settingEvent !== null
      ? 'full'
      : 'partial'

  const rendered = renderSentence(slots)

  return { rendered, slots, completeness }
}

function renderSentence(slots: SummaryStatementSlots): string {
  const routinePart = slots.routine ? `During ${slots.routine}` : 'In an as-yet-unidentified routine'
  const antecedentPart = slots.antecedent
    ? `when ${slots.antecedent}`
    : 'when the antecedent has not yet been clearly identified'
  const consequencePart = slots.consequence
    ? `because ${slots.consequence}`
    : 'for a consequence that has not yet been clearly identified'

  const functionSentence = slots.functionDirection
    ? `Therefore the function of the behaviour is to ${slots.functionDirection} something.`
    : 'The function of the behaviour has not yet been established.'

  const settingEventSentence = slots.settingEvent
    ? `The behaviour is more likely to occur when ${slots.settingEvent}.`
    : 'No consistent setting event has been identified yet.'

  return `${routinePart} ${antecedentPart}, the participant will ${slots.behaviour} ${consequencePart}. ${functionSentence} ${settingEventSentence}`
}
