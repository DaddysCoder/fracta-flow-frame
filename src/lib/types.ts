// Data model — Phase 1 MVP + Phase 2 triangulation + Phase 3 escalation/documentation (brief §5).

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
  name: string // short label — categories below are additive, not a replacement
  operationalDefinition: string // required — observable/measurable, no interpretation
  concernCategories: string[] // standard PBS/ABA categories + any "Other" free text added
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
  settingEvent: string // free text, kept alongside the checklist below
  settingEventTags: string[] // checklist selections (+ any "Other" additions)
  antecedentText: string // free text, kept alongside the checklist below
  antecedentTags: string[] // checklist selections (+ any "Other" additions)
  consequenceText: string // free text, kept alongside the checklist below
  consequenceTags: string[] // checklist selections (+ any "Other" additions)
  // Derived/rollup — computed from consequenceTags, never edited directly.
  // hypothesis.ts depends on this being exactly one FAST domain (or
  // 'none_observed'); it must keep working even though the UI now captures
  // richer multi-select detail underneath it (brief §4).
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

  // Phase 1.3 (brief §5) — practitioner's own clinical-judgement confidence,
  // 1 ("not sure") to 6 ("100% sure"), per the guide's Summary of Behaviour
  // form convention. Deliberately kept as a sibling field on the same
  // record rather than merged into confidenceLevel: confidenceLevel is
  // entirely data-derived (computed by hypothesis.ts, which this phase does
  // not touch), while this is the practitioner's own judgement call, set
  // separately after reviewing the computed result. null until set.
  // Optional (rather than required) specifically so pre-existing test
  // factories that construct a FunctionHypothesis without this field (e.g.
  // riskFlags.test.ts, which brief §7 requires stay byte-identical to
  // phase-1.2) keep compiling unmodified. Treat a missing/undefined value
  // the same as null ("not yet rated") wherever this is read.
  practitionerConfidenceRating?: 1 | 2 | 3 | 4 | 5 | 6 | null
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

export type ScreenerInviteStatus = 'pending' | 'completed' | 'cancelled'

export interface ScreenerInvite {
  id: string
  behaviourId: string // local only — never transmitted through the QR/URL
  token: string // short random string, embedded in both QR codes
  informantRole: string // e.g. "support worker", "parent", "sibling"
  createdAt: string // ISO string, not Date — consistent with the rest of this data model
  status: ScreenerInviteStatus
}

// Phase 1.1 — structured interview / initial-assessment mode (brief §3).
// Used once, early, per behaviour — distinct from the ongoing per-incident
// Episode log. Every field is guided-prompt free text, none required; the
// prompt is scaffolding for the conversation, not a form the interviewee
// fills in field-by-field.
export interface FormulationRecord {
  id: string
  behaviourId: string
  // Phase 1.4 (brief §2) — who this interview was conducted with, distinct
  // from conductedBy (the practitioner). Optional: a formulation is often
  // built from the practitioner's own records/observation rather than a
  // named interview, so this isn't forced on every record.
  informantName: string | null
  informantRole: string | null
  conductedBy: string
  conductedAt: string // ISO string, not Date — consistent with the rest of this data model
  descriptionRecentExample: string
  descriptionIntenseEpisode: string
  descriptionAntecedentAndResponse: string
  onset: string
  // Interview-stage impression only. Must NEVER feed hypothesis.ts's
  // confidence calculation — that stays driven only by real logged Episodes.
  frequencyImpression: string
  riskScenarioHigh: string
  riskScenarioLow: string
  escalationCycle: Record<EscalationPhase, EscalationPhaseData>
}

// Phase 1.2 — behaviour escalation cycle (brief §1). General PBS/crisis-
// prevention convention (Colvin's Acting-Out Behaviour Cycle), not a
// licensed instrument. Captured once during the Formulation interview, not
// re-entered per incident.
export type EscalationPhase =
  | 'baseline'
  | 'early_warning'
  | 'escalation'
  | 'peak_crisis'
  | 'de_escalation'
  | 'recovery'

export interface EscalationPhaseData {
  checkedItems: string[]
  customItems: string[]
}

// Phase 1.2 — per-behaviour reusable ABC checklist (brief §3).
//
// Deviation from the brief worth flagging: §3 describes the dynamic ABC
// checklist as sourced from "checkedItems + customItems across all of that
// behaviour's FormulationRecords" for antecedent/setting-event fields — but
// FormulationRecord as Phase 1.1 actually shipped it (above) has no
// antecedent/setting-event checklist fields, only free text plus (as of
// this phase) escalationCycle, which describes behaviour *presentation*
// across escalation phases, not antecedents/setting events/consequences.
// There is nothing in Formulation to union for those three ABC fields.
// EpisodeForm.tsx also has no "presentation" field, so escalationCycle
// doesn't feed episode logging either (brief §3 says skip that part when
// no such field exists).
//
// This store is the "per-behaviour reusable-items store" the brief
// explicitly allows as an alternative ("your call"). It starts seeded
// implicitly by the generic starter lists in scales.ts (never persisted
// until something is added), and every "Other" entered while logging a
// real episode is written here so it's offered next time.
export type EpisodeChecklistField = 'antecedent' | 'settingEvent' | 'consequence'

export interface BehaviourChecklistItem {
  id: string
  behaviourId: string
  field: EpisodeChecklistField
  label: string
  // Required (non-null) when field === 'consequence' — every consequence
  // item, custom or not, must resolve to exactly one FAST domain (or
  // 'none_observed') for Episode.consequenceTag (brief §3 hard constraint,
  // carried over from Phase 1.1/Phase 2).
  domain: ConsequenceTag | null
  createdAt: string
}

// Phase 1.2 — QR handoff extended to incident/ABC reporting (brief §4).
// Mirrors ScreenerInvite/ScreenerInviteStatus exactly.
export interface ReportInvite {
  id: string
  behaviourId: string // local only — never transmitted through the QR/URL
  token: string
  informantRole: string
  createdAt: string // ISO string, not Date — consistent with the rest of this data model
  status: ScreenerInviteStatus
}
