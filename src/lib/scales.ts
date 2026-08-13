// Original severity/frequency scale (brief §7.3).
// Practical, operational scale authored for this tool — NOT independently
// psychometrically validated the way BPI-01, OBS, or FAST are. Labelled as
// "practical" throughout the UI, never as "validated".

import type { ConsequenceTag, EscalationPhase, EscalationPhaseData } from './types'

export const FREQUENCY_SCALE = [
  { value: 0, label: 'Never observed' },
  { value: 1, label: 'Rarely (less than monthly)' },
  { value: 2, label: 'Occasionally (weekly)' },
  { value: 3, label: 'Frequently (daily)' },
  { value: 4, label: 'Constantly (multiple times daily or more)' },
] as const

export const SEVERITY_SCALE = [
  { value: 0, label: 'No problem / no impact', hint: '' },
  {
    value: 1,
    label: 'Mild',
    hint: 'Minor disruption, no harm, brief redirection resolves it',
  },
  {
    value: 2,
    label: 'Moderate',
    hint: 'Noticeable disruption/distress, some risk of harm or property damage, requires active intervention',
  },
  {
    value: 3,
    label: 'Severe',
    hint: 'Significant risk of harm to self/others or major property damage, requires immediate intervention/emergency response',
  },
] as const

export const RISK_FLAG_OPTIONS = [
  { value: 'injury', label: 'Injury to others' },
  { value: 'self_injury', label: 'Self-injury' },
  { value: 'property_damage', label: 'Property damage' },
  { value: 'elopement', label: 'Elopement' },
  { value: 'other', label: 'Other risk' },
] as const

// Phase 1.3 (brief §1). Adapted from the "Problem Behaviour Inventory"
// structure in LaVigna & Willis, as referenced by the Guide to Functional
// Behaviour Assessment for Schools (Qld Dept of Education). The source
// wording is school/child-context checklist language ("runs around the
// classroom", "refuses to do classwork", etc.) — every item below has been
// reworded from that context into general NDIS/disability-support wording,
// not imported verbatim. This is a starting set for human clinical review
// before being treated as final, same caveat as every other starter list
// in this build.
export interface ConcernCategoryGroup {
  heading: string
  items: string[]
}

export const BEHAVIOUR_CONCERN_GROUPS: ConcernCategoryGroup[] = [
  {
    heading: 'Aggression / harm to others',
    items: [
      'Hits others',
      'Bites others',
      'Kicks others',
      'Pinches others',
      'Scratches others',
      'Spits at others',
      'Strikes others with an object',
      'Threatens others',
      'Physically fights with others',
    ],
  },
  {
    heading: 'Property / environment',
    items: [
      'Throws objects',
      'Breaks things intentionally',
      'Turns over furniture',
      'Damages property',
    ],
  },
  {
    heading: 'Self-directed',
    items: [
      'Attempts to hurt self',
      'Bangs head',
      'Bites, scratches, or hits self',
      'Throws body against objects or surfaces',
    ],
  },
  {
    heading: 'Elopement / unsafe wandering',
    items: [
      'Runs away from support person or setting',
      'Wanders off unsupervised',
      'Climbs or jumps on furniture',
    ],
  },
  {
    heading: 'Verbal / vocal',
    items: [
      'Shouts angrily',
      'Yells or screams',
      'Swears',
      'Makes verbal threats',
    ],
  },
  {
    heading: 'Non-compliance / avoidance',
    items: [
      'Says no to requests',
      'Refuses to follow instructions',
      'Acts contrary to the direction given',
      "Doesn't respond to direction",
    ],
  },
  {
    heading: 'Repetitive / patterned behaviours',
    items: [
      'Counts or checks things repeatedly',
      'Repeatedly brings up the same topic',
    ],
  },
]

// Phase 1.3 (brief §2) — replaces the Phase 1.1 placeholder ABC checklists.
// Adapted from the FACTS (Functional Assessment Checklist for Teachers and
// Staff; March, Horner, Lewis-Palmer, Brown, Crone & Todd, 1999) as
// referenced by the Guide to Functional Behaviour Assessment for Schools
// (Qld Dept of Education). Reworded from school-context wording into
// general NDIS/disability-support context, not imported verbatim. "Other"
// is handled in the UI: it reveals a free-text input whose value gets
// appended to the checklist for reuse, same pattern as the concern
// categories above. Since Phase 1.2, these are the generic fallback lists
// that checklists.ts unions with per-behaviour custom items — the union
// logic itself is unchanged by this phase.

export const SETTING_EVENT_ITEMS = [
  'Hunger',
  'Conflict at home or elsewhere',
  'Missed medication',
  'Illness',
  'Lack of sleep',
  'Change in routine',
  'Recent failure or setback',
] as const

export const ANTECEDENT_ITEMS = [
  'Given an instruction or demand',
  'Corrected or redirected',
  'Alone, with no attention or activity',
  'With peers or other people present',
  'Doing an activity',
  'Activity or item removed',
  'Transition between activities',
  'Task was too hard',
  'Task went on too long',
  'Unstructured time',
] as const

// Every entry must map to exactly one FAST domain (or 'none_observed') —
// this feeds Episode.consequenceTag, which hypothesis.ts's triangulation
// logic depends on (brief §4 hard constraint, carried over from Phase 2).
// Adding a new consequence checklist item without a clean domain mapping
// here breaks that matching logic — don't add one without updating this.
//
// The attention domain is deliberately split into two entries — staff/
// support worker vs. peer/other attention — so the checklist keeps that
// distinction visible in UI and exports (brief §2; "adult" reworded to
// "staff/support worker" per the wording pass in §0 — this is an adult
// NDIS/disability-support context, not a school). deriveConsequenceTag's
// existing first-match resolution already collapses either label to
// 'attention' with no changes needed there.
export const CONSEQUENCE_ITEMS: readonly { label: string; domain: ConsequenceTag }[] = [
  { label: 'Attention (staff/support worker) given or avoided', domain: 'attention' },
  { label: 'Attention (peer/other) given or avoided', domain: 'attention' },
  { label: 'Activity or item provided', domain: 'tangible' },
  { label: 'Sensory outcome obtained or avoided', domain: 'automatic' },
  { label: 'Task or activity avoided', domain: 'escape' },
  { label: 'None observed', domain: 'none_observed' },
]

// Rolls a multi-select consequence checklist up to the single ConsequenceTag
// that hypothesis.ts needs. When ticked items span more than one domain, the
// first match in CONSEQUENCE_ITEMS' listed order wins (attention, then
// escape, tangible, automatic, none observed) — a deterministic "primary
// reported consequence" convention, not an attempt to average conflicting
// signals. customDomainMap (Phase 1.2 §3) resolves per-behaviour custom
// consequence items added at logging time — every one of those is required
// to carry an explicit domain at entry (see BehaviourChecklistItem), so a
// custom item never silently bypasses this mapping.
export function deriveConsequenceTag(
  consequenceTags: string[],
  customDomainMap: Record<string, ConsequenceTag> = {},
): ConsequenceTag {
  for (const item of CONSEQUENCE_ITEMS) {
    if (consequenceTags.includes(item.label)) return item.domain
  }
  for (const tag of consequenceTags) {
    if (customDomainMap[tag]) return customDomainMap[tag]
  }
  return 'none_observed'
}

// Phase 1.2 (brief §1) — six-phase behaviour escalation cycle, general PBS/
// crisis-prevention convention (Colvin's Acting-Out Behaviour Cycle), not a
// licensed instrument. Starting items per phase — review against real
// caseload data before treating as authoritative, same caveat as every
// other starter list in this build.
export const ESCALATION_PHASE_ORDER: EscalationPhase[] = [
  'baseline',
  'early_warning',
  'escalation',
  'peak_crisis',
  'de_escalation',
  'recovery',
]

export const ESCALATION_PHASE_LABELS: Record<EscalationPhase, string> = {
  baseline: 'Baseline',
  early_warning: 'Early warning',
  escalation: 'Escalation',
  peak_crisis: 'Peak/crisis',
  de_escalation: 'De-escalation',
  recovery: 'Recovery',
}

export const ESCALATION_PHASE_ITEMS: Record<EscalationPhase, string[]> = {
  baseline: ['Calm', 'Engaged', 'Typical communication', 'Settled posture'],
  early_warning: [
    'Pacing',
    'Fidgeting',
    'Withdrawing',
    'Muttering',
    'Tense posture',
    'Avoiding eye contact',
  ],
  escalation: [
    'Raised voice',
    'Swearing',
    'Breathing loudly/heavily',
    'Clenched fists',
    'Refusing instructions',
    'Pushing items',
  ],
  peak_crisis: ['Kicking', 'Screaming', 'Hitting', 'Throwing items', 'Self-injury', 'Absconding'],
  de_escalation: ['Breathing slowing', 'Voice lowering', 'Compliance returning', 'Seeking space'],
  recovery: ['Quiet', 'Tired', 'Apologetic', 'Seeking reassurance', 'Wanting to sleep'],
}

export function emptyEscalationCycle(): Record<EscalationPhase, EscalationPhaseData> {
  const cycle = {} as Record<EscalationPhase, EscalationPhaseData>
  for (const phase of ESCALATION_PHASE_ORDER) {
    cycle[phase] = { checkedItems: [], customItems: [] }
  }
  return cycle
}
