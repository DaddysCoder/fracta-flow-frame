// Data model — Phase 1 MVP + Phase 2 triangulation + Phase 3 escalation/documentation (brief §5).

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

// Phase 3 — escalation & documentation (brief §2).

export type RiskFlagTriggerType =
  | 'severity_threshold'
  | 'persistent_mismatch'
  | 'sustained_low_confidence'
  | 'risk_checklist_item'

export type RiskFlagStatus = 'open' | 'acknowledged' | 'escalated_to_efa' | 'resolved'

export interface RiskFlag {
  id: string
  behaviourId: string
  triggerType: RiskFlagTriggerType
  triggerDetail: string // human-readable, e.g. "3 consecutive episodes rated Severe"
  triggeredAt: string // ISO string, not Date — consistent with the rest of this data model
  status: RiskFlagStatus
  acknowledgedBy: string | null // practitioner name — null until acknowledged
  acknowledgedAt: string | null
  resolutionNote: string | null
}

export type DocumentationFormat = 'clinical_report' | 'plan_appendix' | 'staff_training_summary'

export interface DocumentationExport {
  id: string
  participantId: string
  behaviourIds: string[] // supports multi-behaviour exports
  generatedAt: string // ISO string, not Date — consistent with the rest of this data model
  generatedBy: string
  format: DocumentationFormat
  contentSnapshot: string // fully rendered HTML at generation time — immutable once created
}

// Phase 4 — multi-informant handoff, QR only (brief §3).

// Strategy-library integration seam (brief §7, phase-3-escalation-docs.md).
// No strategy content or matching logic lives in this repo — this is only
// the contract a future strategy-library lookup must satisfy so it can plug
// into staff_training_summary exports without further changes here.

export interface MatchedStrategy {
  id: string
  name: string
  summary: string // short, practitioner-facing description of the strategy itself
  rationale: string // why this strategy fits the given function domain
  evidenceRef: string // citation/source backing the strategy, not full instrument content
  rank: number // 1-based; lower is more strongly recommended
}

// Function domain in, ranked evidence-based strategies out. Which domain to
// look up (when screener and episode data disagree) is a caller decision —
// see resolveStrategyLookupDomain in documentExport.ts for the placeholder
// this repo uses until the real library defines its own resolution needs.
export type StrategyLookup = (
  functionDomain: FunctionDomain,
) => Promise<MatchedStrategy[]> | MatchedStrategy[]

export type ScreenerInviteStatus = 'pending' | 'completed' | 'cancelled'

export interface ScreenerInvite {
  id: string
  behaviourId: string // local only — never transmitted through the QR/URL
  token: string // short random string, embedded in both QR codes
  informantRole: string // e.g. "support worker", "parent", "sibling"
  createdAt: string // ISO string, not Date — consistent with the rest of this data model
  status: ScreenerInviteStatus
}
