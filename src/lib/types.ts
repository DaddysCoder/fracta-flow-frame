// Data model — Phase 1 MVP + Phase 2 triangulation (brief §5).
// RiskFlag/escalation automation is Phase 3 and still not modelled yet.

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

// FunctionDomain in the Phase 2 brief — reuses ScreenerDomain since
// Episode.consequenceTag and FunctionScreener.domainScores already share
// the same four FAST domains, by design (brief §2).
export type FunctionDomain = ScreenerDomain

export type AgreementStatus = 'match' | 'partial_match' | 'mismatch' | 'insufficient_data'
export type ConfidenceLevel = 'low' | 'moderate' | 'high'

export interface FunctionHypothesis {
  id: string
  behaviourId: string
  computedAt: string // ISO string, not Date — consistent with the rest of this data model

  screenerFunctionResult: FunctionDomain[] // top domain(s) from screener(s), ties possible
  episodePatternResult: FunctionDomain | null // dominant consequence tag, or null if no clear mode
  episodeCount: number
  distinctDayCount: number

  agreementStatus: AgreementStatus
  confidenceLevel: ConfidenceLevel

  // Cheap to compute now (aggregation logic already has to exist for
  // multi-screener averaging) and meaningful once Phase 4 multi-informant
  // collection ships. Always false with 0-1 screeners.
  screenerDisagreement: boolean

  // Audit trail — required, not optional. Every hypothesis must show its receipts.
  contributingEpisodeIds: string[]
  contributingScreenerIds: string[]
}
