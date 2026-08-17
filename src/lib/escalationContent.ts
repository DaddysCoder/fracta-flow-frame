import type { EscalationCycle, EscalationPhase, EscalationPhaseEntry } from './types'

// Seed content for the six-phase behaviour escalation cycle (brief Part B,
// step 3). This is the general PBS/crisis-prevention field convention
// commonly known from Colvin's Acting-Out Behaviour Cycle — not a licensed
// instrument, safe to build on directly, but it is a starting checklist for
// a practitioner's own caseload, not a fixed instrument itself. Items carry
// stable IDs so wording can be revised later without orphaning data already
// stored against an ID (Formulation.escalationCycle[phase].checkedItems).

export interface EscalationItem {
  id: string
  label: string
}

export const ESCALATION_PHASES: EscalationPhase[] = [
  'baseline',
  'early_warning',
  'escalation',
  'peak',
  'de_escalation',
  'recovery',
]

export const ESCALATION_PHASE_LABEL: Record<EscalationPhase, string> = {
  baseline: 'Baseline',
  early_warning: 'Early warning',
  escalation: 'Escalation',
  peak: 'Peak / crisis',
  de_escalation: 'De-escalation',
  recovery: 'Recovery',
}

export const ESCALATION_ITEMS: Record<EscalationPhase, EscalationItem[]> = {
  baseline: [
    { id: 'baseline-calm', label: 'Calm' },
    { id: 'baseline-engaged', label: 'Engaged' },
    { id: 'baseline-typical-communication', label: 'Typical communication' },
    { id: 'baseline-settled-posture', label: 'Settled posture' },
  ],
  early_warning: [
    { id: 'early-warning-pacing', label: 'Pacing' },
    { id: 'early-warning-fidgeting', label: 'Fidgeting' },
    { id: 'early-warning-withdrawing', label: 'Withdrawing' },
    { id: 'early-warning-muttering', label: 'Muttering' },
    { id: 'early-warning-tense-posture', label: 'Tense posture' },
    { id: 'early-warning-avoiding-eye-contact', label: 'Avoiding eye contact' },
  ],
  escalation: [
    { id: 'escalation-raised-voice', label: 'Raised voice' },
    { id: 'escalation-swearing', label: 'Swearing' },
    { id: 'escalation-breathing-heavily', label: 'Breathing heavily' },
    { id: 'escalation-clenched-fists', label: 'Clenched fists' },
    { id: 'escalation-refusing-instructions', label: 'Refusing instructions' },
    { id: 'escalation-pushing-items', label: 'Pushing items' },
  ],
  peak: [
    { id: 'peak-kicking', label: 'Kicking' },
    { id: 'peak-screaming', label: 'Screaming' },
    { id: 'peak-hitting', label: 'Hitting' },
    { id: 'peak-throwing-items', label: 'Throwing items' },
    { id: 'peak-self-injury', label: 'Self-injury' },
    { id: 'peak-absconding', label: 'Absconding' },
  ],
  de_escalation: [
    { id: 'de-escalation-breathing-slowing', label: 'Breathing slowing' },
    { id: 'de-escalation-voice-lowering', label: 'Voice lowering' },
    { id: 'de-escalation-compliance-returning', label: 'Compliance returning' },
    { id: 'de-escalation-seeking-space', label: 'Seeking space' },
  ],
  recovery: [
    { id: 'recovery-quiet', label: 'Quiet' },
    { id: 'recovery-tired', label: 'Tired' },
    { id: 'recovery-apologetic', label: 'Apologetic' },
    { id: 'recovery-seeking-reassurance', label: 'Seeking reassurance' },
    { id: 'recovery-wanting-to-sleep', label: 'Wanting to sleep' },
  ],
}

export function emptyEscalationCycle(): EscalationCycle {
  const cycle = {} as EscalationCycle
  for (const phase of ESCALATION_PHASES) {
    cycle[phase] = { checkedItems: [], customItems: [] }
  }
  return cycle
}

function itemLabel(phase: EscalationPhase, itemId: string): string {
  return ESCALATION_ITEMS[phase].find((i) => i.id === itemId)?.label ?? itemId
}

function resolveEntry(phase: EscalationPhase, entry: EscalationPhaseEntry): string[] {
  return [...entry.checkedItems.map((id) => itemLabel(phase, id)), ...entry.customItems]
}

// Internal-ID -> display-text resolver, so Vector never needs Frame's
// content module to render a plan (contract brief A3, design call 3):
// FbaOutcome.escalationCycle carries resolved text, not item IDs.
export function resolveEscalationCycleDisplay(cycle: EscalationCycle): Record<EscalationPhase, string[]> {
  const resolved = {} as Record<EscalationPhase, string[]>
  for (const phase of ESCALATION_PHASES) {
    resolved[phase] = resolveEntry(phase, cycle[phase])
  }
  return resolved
}
