// Original severity/frequency scale (brief §7.3).
// Practical, operational scale authored for this tool — NOT independently
// psychometrically validated the way BPI-01, OBS, or FAST are. Labelled as
// "practical" throughout the UI, never as "validated".

import type { ConsequenceTag } from './types'

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

// Phase 1.1 (brief §2). General PBS/ABA field convention, not sourced from
// any single licensed instrument — same "openly-citable, not a specific
// paid provider's list" principle as the rest of this build. Flagged in the
// brief as a starting set to review against real caseload data, not treated
// as authoritative here.
export const BEHAVIOUR_CONCERN_CATEGORIES = [
  'Physical aggression (toward others)',
  'Verbal aggression',
  'Self-injurious behaviour',
  'Property destruction',
  'Elopement/absconding',
  'Non-compliance/refusal',
  'Repetitive/stereotyped behaviour',
  'Verbal disruption',
  'Inappropriate sexual behaviour',
] as const

// Phase 1.1 (brief §4) — ABC checklists. "Other" is handled in the UI: it
// reveals a free-text input whose value gets appended to the checklist for
// reuse, same pattern as the concern categories above.

export const SETTING_EVENT_ITEMS = [
  'Illness/unwellness',
  'Poor sleep',
  'Hunger',
  'Change in routine',
  'Change in environment',
  'Medication change',
  'Sensory overload (noise/crowding/lighting)',
  'Transition between activities',
  'Presence of unfamiliar person',
] as const

export const ANTECEDENT_ITEMS = [
  'Demand/instruction given',
  'Request denied',
  'Attention withdrawn',
  'Transition required',
  'Preferred item/activity removed',
  'Waiting required',
  'Unexpected change',
  'Sensory trigger',
] as const

// Every entry must map to exactly one FAST domain (or 'none_observed') —
// this feeds Episode.consequenceTag, which hypothesis.ts's triangulation
// logic depends on (brief §4 hard constraint, carried over from Phase 2).
// Adding a new consequence checklist item without a clean domain mapping
// here breaks that matching logic — don't add one without updating this.
export const CONSEQUENCE_ITEMS: readonly { label: string; domain: ConsequenceTag }[] = [
  { label: 'Received staff/peer attention', domain: 'attention' },
  { label: 'Received reprimand/reaction', domain: 'attention' },
  { label: 'Task/demand removed', domain: 'escape' },
  { label: 'Activity ended', domain: 'escape' },
  { label: 'Removed from situation', domain: 'escape' },
  { label: 'Preferred item given', domain: 'tangible' },
  { label: 'Preferred activity allowed', domain: 'tangible' },
  { label: 'No clear external consequence observed', domain: 'automatic' },
  { label: 'Self-soothing/sensory outcome', domain: 'automatic' },
  { label: 'None observed', domain: 'none_observed' },
]

// Rolls a multi-select consequence checklist up to the single ConsequenceTag
// that hypothesis.ts needs. A "Other" addition (not in CONSEQUENCE_ITEMS)
// can't resolve to a domain and is skipped for this purpose — it still shows
// in the episode's free-text/checklist detail, just doesn't drive
// triangulation. When ticked items span more than one domain, the first
// match in CONSEQUENCE_ITEMS' listed order wins (attention, then escape,
// tangible, automatic, none observed) — a deterministic "primary reported
// consequence" convention, not an attempt to average conflicting signals.
export function deriveConsequenceTag(consequenceTags: string[]): ConsequenceTag {
  for (const item of CONSEQUENCE_ITEMS) {
    if (consequenceTags.includes(item.label)) return item.domain
  }
  return 'none_observed'
}
