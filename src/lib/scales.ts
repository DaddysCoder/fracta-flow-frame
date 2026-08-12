// Original severity/frequency scale (brief §7.3).
// Practical, operational scale authored for this tool — NOT independently
// psychometrically validated the way BPI-01, OBS, or FAST are. Labelled as
// "practical" throughout the UI, never as "validated".

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

export const ANTECEDENT_TAGS = [
  { value: 'demand', label: 'Demand' },
  { value: 'transition', label: 'Transition' },
  { value: 'sensory', label: 'Sensory' },
  { value: 'social', label: 'Social' },
  { value: 'unknown', label: 'Unknown' },
] as const

export const CONSEQUENCE_TAGS = [
  { value: 'attention', label: 'Attention' },
  { value: 'escape', label: 'Escape' },
  { value: 'tangible', label: 'Tangible' },
  { value: 'automatic', label: 'Automatic' },
  { value: 'none_observed', label: 'None observed' },
] as const
