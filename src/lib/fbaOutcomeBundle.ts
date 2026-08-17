import type { EscalationPhase, FbaOutcome, FbaOutcomeBundle, OpenRiskFlagStatus } from '@fracta/contract'
import { resolveEscalationCycleDisplay } from './escalationContent'
import { computeSummaryStatement } from './summaryStatement'
import type {
  Behaviour,
  Episode,
  Formulation,
  FunctionHypothesis,
  Participant,
  RiskFlag,
  RiskFlagStatus,
} from './types'

// FbaOutcomeBundle assembly (brief Part B, step 8). Pure — takes already-
// fetched data, does no DB access itself — so it's directly unit-testable
// and mirrors the hypothesis.ts / documentExport.ts pattern.

export const EFA_CAVEAT =
  'Even a full match between screener and observed pattern is not equivalent to confirmation via experimental functional analysis. This is decision support, not a determination of function.'

const OPEN_RISK_FLAG_STATUSES: RiskFlagStatus[] = ['open', 'acknowledged', 'escalated_to_efa']

export interface BehaviourBundleInput {
  behaviour: Behaviour
  episodes: Episode[]
  formulations: Formulation[]
  latestHypothesis: FunctionHypothesis | null
  riskFlags: RiskFlag[]
}

export interface AssembleBundleInput {
  participant: Participant
  generatedBy: string
  generatedAt: string
  sourceExportId: string
  behaviours: BehaviourBundleInput[]
}

export type AssembleBundleOutcome =
  | { ok: true; bundle: FbaOutcomeBundle }
  | { ok: false; error: string }

function mergeEscalationCycle(formulations: Formulation[]): Record<EscalationPhase, string[]> | null {
  if (formulations.length === 0) return null

  const perFormulation = formulations.map((f) => resolveEscalationCycleDisplay(f.escalationCycle))
  const merged = {} as Record<EscalationPhase, string[]>
  const phases = Object.keys(perFormulation[0]) as EscalationPhase[]
  for (const phase of phases) {
    const seen = new Set<string>()
    const items: string[] = []
    for (const resolved of perFormulation) {
      for (const item of resolved[phase]) {
        const key = item.trim().toLowerCase()
        if (key === '' || seen.has(key)) continue
        seen.add(key)
        items.push(item)
      }
    }
    merged[phase] = items
  }
  return merged
}

function buildOutcome(input: BehaviourBundleInput): { ok: true; outcome: FbaOutcome } | { ok: false; error: string } {
  const { behaviour, episodes, formulations, latestHypothesis, riskFlags } = input

  if (!behaviour.operationalDefinition.trim()) {
    return {
      ok: false,
      error: `"${behaviour.name}" has no operational definition — add one before including it in a bundle.`,
    }
  }

  // A hypothesis carries lastComputedAt and screener/episode results that
  // cannot be honestly fabricated for a behaviour that has never had one
  // computed. Rather than inventing a timestamp, this behaviour is excluded
  // with a clear reason — an extension of the brief's two named fail-closed
  // conditions (missing linkId / missing operationalDefinition), in the
  // same "never fabricate" spirit as the summary statement and hypothesis
  // panels.
  if (!latestHypothesis) {
    return {
      ok: false,
      error: `"${behaviour.name}" has no computed hypothesis yet — recompute one before including it in a bundle.`,
    }
  }

  const summary = computeSummaryStatement(behaviour.name, episodes, latestHypothesis)

  const outcome: FbaOutcome = {
    behaviourRef: behaviour.id,
    behaviour: {
      label: behaviour.name,
      operationalDefinition: behaviour.operationalDefinition,
      // Frame only tracks active/archived; Behaviour has no 'monitoring'
      // state today, so archived maps to the closest contract status.
      status: behaviour.status === 'active' ? 'active' : 'resolved',
    },
    summaryStatement: summary,
    hypothesis: {
      screenerResult: latestHypothesis.screenerFunctionResult,
      episodePatternResult: latestHypothesis.episodePatternResult ? [latestHypothesis.episodePatternResult] : [],
      agreementStatus: latestHypothesis.agreementStatus,
      computedConfidence: latestHypothesis.confidenceLevel,
      practitionerConfidence: latestHypothesis.practitionerConfidence,
      lastComputedAt: latestHypothesis.computedAt,
      caveat: EFA_CAVEAT,
    },
    evidenceBase: {
      episodeCount: latestHypothesis.episodeCount,
      distinctDayCount: latestHypothesis.distinctDayCount,
      screenerCount: latestHypothesis.contributingScreenerIds.length,
      episodeIds: latestHypothesis.contributingEpisodeIds,
      screenerIds: latestHypothesis.contributingScreenerIds,
    },
    escalationCycle: mergeEscalationCycle(formulations),
    openRiskFlags: riskFlags
      .filter((f) => OPEN_RISK_FLAG_STATUSES.includes(f.status))
      .map((f) => ({
        flagId: f.id,
        triggerType: f.triggerType,
        triggeredAt: f.triggeredAt,
        status: f.status as OpenRiskFlagStatus,
      })),
  }

  return { ok: true, outcome }
}

export function assembleFbaOutcomeBundle(input: AssembleBundleInput): AssembleBundleOutcome {
  if (!input.participant.linkId) {
    return {
      ok: false,
      error:
        'This participant has no linkId. Frame never mints one — link this participant to Vector before generating a bundle.',
    }
  }
  if (input.behaviours.length === 0) {
    return { ok: false, error: 'Select at least one behaviour to include in the bundle.' }
  }

  const outcomes: FbaOutcome[] = []
  for (const b of input.behaviours) {
    const result = buildOutcome(b)
    if (!result.ok) return result
    outcomes.push(result.outcome)
  }

  const bundle: FbaOutcomeBundle = {
    contractVersion: '1.0',
    linkId: input.participant.linkId,
    generatedAt: input.generatedAt,
    generatedBy: input.generatedBy,
    sourceExportId: input.sourceExportId,
    planCycleRef: null, // set once ParticipantContext import (step 9) carries a real plan cycle to echo back
    outcomes,
  }

  return { ok: true, bundle }
}
