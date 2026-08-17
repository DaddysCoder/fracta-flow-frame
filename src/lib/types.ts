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
  // Opaque link into Vector, minted by Vector and stored here — Frame never
  // generates one (contract A1). null for a Frame-only participant, which
  // cannot emit an FbaOutcomeBundle as a result (fails closed).
  linkId: string | null
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

  // Phase 1.3 — practitioner's own subjective confidence (brief Part B,
  // step 7), on the QLD guide's 1-6 "not sure" -> "100% sure" convention.
  // Set separately from computation via setPractitionerConfidence, never
  // computed and never merged/averaged into confidenceLevel — see
  // hypothesis.test.ts, which asserts hypothesis.ts never references it.
  practitionerConfidence: 1 | 2 | 3 | 4 | 5 | 6 | null
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

export type DocumentationFormat =
  | 'clinical_report'
  | 'plan_appendix'
  | 'staff_training_summary'
  // Phase 1.3 — the JSON payload for Vector's Form 07 (brief Part B, step
  // 8). Reuses the same immutable-snapshot storage mechanism as the HTML
  // formats above; contentSnapshot holds JSON.stringify(FbaOutcomeBundle)
  // instead of rendered HTML.
  | 'fba_outcome_bundle'

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

export type ScreenerInviteStatus = 'pending' | 'completed' | 'cancelled'

export interface ScreenerInvite {
  id: string
  behaviourId: string // local only — never transmitted through the QR/URL
  token: string // short random string, embedded in both QR codes
  informantRole: string // e.g. "support worker", "parent", "sibling"
  createdAt: string // ISO string, not Date — consistent with the rest of this data model
  status: ScreenerInviteStatus
}

// Phase 1.2 — formulation becomes a collection, escalation cycle (brief Part B, steps 2-3).
// Matches @fracta/contract's EscalationPhase values exactly, since the
// resolved display text for these phases is what crosses into
// FbaOutcome.escalationCycle (contract A3).
export type EscalationPhase =
  | 'baseline'
  | 'early_warning'
  | 'escalation'
  | 'peak'
  | 'de_escalation'
  | 'recovery'

// Shared shape for every "starter checklist + add your own" field in a
// Formulation — escalation-phase items, antecedent/consequence/setting-event
// context. checkedItems are stable IDs into fbaContent's option pools, not
// display text; customItems are free text.
export interface ChecklistEntry {
  checkedItems: string[]
  customItems: string[]
}

/** @deprecated use ChecklistEntry — kept as an alias so existing call sites keep compiling. */
export type EscalationPhaseEntry = ChecklistEntry

export type EscalationCycle = Record<EscalationPhase, EscalationPhaseEntry>

export interface FormulationDescriptionPrompts {
  recentExample: string
  intenseEpisode: string
  antecedentAndResponse: string
}

export interface FormulationRiskScenarios {
  highRisk: string
  lowRisk: string
}

export interface Formulation {
  id: string
  behaviourId: string
  informantName: string // who was interviewed
  informantRole: string
  conductedBy: string // practitioner
  conductedAt: string // ISO string, not Date — consistent with the rest of this data model

  descriptionPrompts: FormulationDescriptionPrompts
  onset: string
  // Interview-stage impression only. Referenced nowhere in the Phase 2
  // confidence calculation (hypothesis.ts), which relies solely on actual
  // logged episodes — see formulation.test.ts.
  frequencyImpression: string
  riskScenarios: FormulationRiskScenarios
  escalationCycle: EscalationCycle

  // Phase 1.3 — dynamic per-behaviour ABC checklists (brief Part B, step 5)
  // draw their option pool from these three fields, unioned across all of a
  // behaviour's formulations. Same starter-checklist + "add your own"
  // pattern as escalationCycle, against fbaContent's ANTECEDENT_CONTEXT_OPTIONS
  // / CONSEQUENCE_OPTIONS / SETTING_EVENT_OPTIONS.
  antecedentContext: ChecklistEntry
  consequenceContext: ChecklistEntry
  settingEvents: ChecklistEntry
}

// Custom items entered directly at ABC/episode-logging time (not through a
// formulation interview) get written back here so they're offered next time
// rather than re-typed (brief Part B, step 5) — kept separate from
// Formulation, which stays an interview-only, append-only audit record.
export type AbcOptionCategory = 'antecedent' | 'consequence' | 'settingEvent'

export interface BehaviourCustomOption {
  id: string
  behaviourId: string
  category: AbcOptionCategory
  text: string
  createdAt: string
}
