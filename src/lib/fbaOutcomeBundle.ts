import type {
  EscalationPhase as ContractEscalationPhase,
  FbaOutcome,
  FbaOutcomeBundle,
  FbaOutcomeSummaryStatement,
  OpenRiskFlagStatus,
} from '@fracta/contract'
import { buildSummaryStatement } from './summaryStatement'
import { ESCALATION_PHASE_ORDER } from './scales'
import type {
  Behaviour,
  Episode,
  EscalationPhase,
  FormulationRecord,
  FunctionDomain,
  FunctionHypothesis,
  Participant,
  RiskFlag,
  RiskFlagStatus,
} from './types'

// FbaOutcomeBundle assembly (contract A3) — recovered from
// claude/frame-phase-1-contract-qxzs36 and adapted to phase-1.5's actual
// domain model: FormulationRecord (not the deleted Formulation type),
// EscalationPhaseData whose checkedItems are already display strings (not
// item ids needing a resolve step — see scales.ts), and
// practitionerConfidenceRating (not practitionerConfidence). Pure — takes
// already-fetched data, does no DB access itself — so it's directly
// unit-testable and mirrors the hypothesis.ts / documentExport.ts pattern.

export const EFA_CAVEAT =
  'Even a full match between screener and observed pattern is not equivalent to confirmation via experimental functional analysis. This is decision support, not a determination of function.'

const OPEN_RISK_FLAG_STATUSES: RiskFlagStatus[] = ['open', 'acknowledged', 'escalated_to_efa']

// Frame's EscalationPhase.peak_crisis renamed to the contract's 'peak' —
// the two vocabularies parted ways when phase-1.5 kept 'peak_crisis' for
// UI clarity. Both name the same phase; this is the one place that maps
// between them.
const FRAME_TO_CONTRACT_PHASE: Record<EscalationPhase, ContractEscalationPhase> = {
  baseline: 'baseline',
  early_warning: 'early_warning',
  escalation: 'escalation',
  peak_crisis: 'peak',
  de_escalation: 'de_escalation',
  recovery: 'recovery',
}

export interface BehaviourBundleInput {
  behaviour: Behaviour
  episodes: Episode[]
  formulations: FormulationRecord[]
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

export type AssembleBundleOutcome = { ok: true; bundle: FbaOutcomeBundle } | { ok: false; error: string }

// Same mode-aggregation approach as summaryStatement.ts's modeOf — kept as a
// separate local copy rather than exported from there, since that module's
// own tests assert its shape stays untouched by later phases.
function modeOf(values: string[]): string | null {
  if (values.length === 0) return null
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  const max = Math.max(...counts.values())
  const modes = [...counts.entries()].filter(([, c]) => c === max).map(([v]) => v)
  return modes.length === 1 ? modes[0] : null
}

const RECENT_EPISODE_LIMIT = 20

function computeSummaryStatement(
  behaviour: Behaviour,
  episodes: Episode[],
  hypothesis: FunctionHypothesis | null,
): FbaOutcomeSummaryStatement {
  const rendered = buildSummaryStatement(behaviour, episodes, hypothesis)

  const recent = [...episodes].sort((a, b) => b.dateTime.localeCompare(a.dateTime)).slice(0, RECENT_EPISODE_LIMIT)
  const antecedent = modeOf(recent.flatMap((e) => e.antecedentTags))
  const settingEvent = modeOf(recent.flatMap((e) => e.settingEventTags))
  const consequence = modeOf(recent.flatMap((e) => e.consequenceTags))
  const taggedConsequences = recent.filter((e) => e.consequenceTag !== 'none_observed')
  const functionDomain: FunctionDomain | null = hypothesis
    ? hypothesis.episodePatternResult
    : (modeOf(taggedConsequences.map((e) => e.consequenceTag)) as FunctionDomain | null)

  const functionDirection: 'access' | 'avoid' | null =
    functionDomain === 'escape' ? 'avoid' : functionDomain ? 'access' : null

  const slots = {
    // Frame has no "routine" field anywhere in the data model this reads
    // from — never fabricated, so this slot (and therefore 'full'
    // completeness) is permanently unreachable until Frame grows one.
    routine: null,
    antecedent,
    behaviour: behaviour.name,
    consequence,
    functionDirection,
    settingEvent,
  }

  const completeness: 'full' | 'partial' = Object.values(slots).every((v) => v !== null) ? 'full' : 'partial'

  return { rendered, slots, completeness }
}

// checkedItems/customItems on EscalationPhaseData are already resolved
// display strings in phase-1.5 (see scales.ts's ESCALATION_PHASE_ITEMS) —
// unlike the contract branch's item-id scheme, there is no separate
// resolve step here, just union + de-dup across every formulation.
function mergeEscalationCycle(formulations: FormulationRecord[]): Record<ContractEscalationPhase, string[]> | null {
  if (formulations.length === 0) return null

  const merged = {} as Record<ContractEscalationPhase, string[]>
  for (const phase of ESCALATION_PHASE_ORDER) {
    const seen = new Set<string>()
    const items: string[] = []
    for (const formulation of formulations) {
      const entry = formulation.escalationCycle[phase]
      for (const item of [...entry.checkedItems, ...entry.customItems]) {
        const key = item.trim().toLowerCase()
        if (key === '' || seen.has(key)) continue
        seen.add(key)
        items.push(item)
      }
    }
    merged[FRAME_TO_CONTRACT_PHASE[phase]] = items
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
  // with a clear reason — in the same "never fabricate" spirit as the
  // summary statement and hypothesis panels.
  if (!latestHypothesis) {
    return {
      ok: false,
      error: `"${behaviour.name}" has no computed hypothesis yet — recompute one before including it in a bundle.`,
    }
  }

  const summary = computeSummaryStatement(behaviour, episodes, latestHypothesis)

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
      practitionerConfidence: latestHypothesis.practitionerConfidenceRating ?? null,
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
    // Set once a ParticipantContext import (participantContextImport.ts)
    // has carried a real plan cycle to echo back; null otherwise.
    planCycleRef: input.participant.planCycle
      ? { planType: input.participant.planCycle.planType, expiresAt: input.participant.planCycle.expiresAt }
      : null,
    outcomes,
  }

  return { ok: true, bundle }
}
