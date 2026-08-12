// Data model — Phase 1 MVP subset of the full brief (§5).
// FunctionHypothesis and RiskFlag are Phase 2/3 and intentionally not modelled yet:
// this build never computes or displays a triangulated function, only raw entered data.

export type AntecedentTag = 'demand' | 'transition' | 'sensory' | 'social' | 'unknown'
export type ConsequenceTag = 'attention' | 'escape' | 'tangible' | 'automatic' | 'none_observed'
export type RiskFlagItem = 'injury' | 'property_damage' | 'elopement' | 'self_injury' | 'other'
export type ScreenerDomain = 'attention' | 'escape' | 'tangible' | 'automatic'
export type ScreenerAnswer = 'yes' | 'no' | 'unsure'

export interface Practitioner {
  id: string // single local profile, fixed id 'local-practitioner'
  name: string
  role: string
  disclaimerAcknowledgedAt: string | null
}

export interface Participant {
  id: string
  // Kept logically separate from all behavioural records below — never joined
  // into episode/screener exports without explicit practitioner action.
  identifyingDetails: string
  consentAttested: boolean
  consentAttestedAt: string | null
  consentAttestedBy: string | null // practitioner name/id, not vendor-verified
  createdAt: string
}

export interface Behaviour {
  id: string
  participantId: string
  name: string
  operationalDefinition: string // required — observable/measurable, no interpretation
  status: 'active' | 'archived'
  createdBy: string
  createdAt: string
}

export interface Episode {
  id: string
  behaviourId: string
  dateTime: string
  durationMinutes: number | null
  severityRating: 0 | 1 | 2 | 3
  frequencyContext: 0 | 1 | 2 | 3 | 4
  settingEvent: string
  antecedentText: string
  antecedentTag: AntecedentTag
  consequenceText: string
  consequenceTag: ConsequenceTag
  loggedBy: string
  riskFlags: RiskFlagItem[]
  createdAt: string
}

export interface ScreenerResponse {
  itemId: string
  domain: ScreenerDomain
  answer: ScreenerAnswer
}

export interface FunctionScreener {
  id: string
  behaviourId: string
  informantId: string // 'local-practitioner' in MVP (self-administered only)
  informantRole: string
  dateCompleted: string
  rawResponses: ScreenerResponse[]
  domainScores: Record<ScreenerDomain, number>
  createdAt: string
}
