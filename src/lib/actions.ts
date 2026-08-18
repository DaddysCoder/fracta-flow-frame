import type { EntityTable } from 'dexie'
import { findDenylistedKeys, validateFbaOutcomeBundle, validateParticipantContext, type ParticipantContext } from '@fracta/contract'
import { db, newId } from './db'
import type {
  ConsequenceTag,
  DocumentationFormat,
  EscalationPhase,
  EscalationPhaseData,
  RiskFlagItem,
  ScreenerInviteStatus,
  ScreenerResponse,
} from './types'
import { scoreDomains } from './screener'
import { deriveConsequenceTag } from './scales'
import { computeHypothesis, type ComputeOutcome } from './hypothesis'
import { checkEpisodeTriggers, checkHypothesisTriggers, type FlagCandidate } from './riskFlags'
import { renderDocumentationExport } from './documentExport'
import { buildInviteUrl, generateToken } from './qrPayload'
import { buildReportInviteUrl } from './reportPayload'
import { assembleFbaOutcomeBundle } from './fbaOutcomeBundle'

export async function createParticipant(input: {
  identifyingDetails: string
  consentAttested: boolean
  practitionerName: string
}) {
  const id = newId()
  await db.participants.add({
    id,
    identifyingDetails: input.identifyingDetails.trim(),
    consentAttested: input.consentAttested,
    consentAttestedAt: input.consentAttested ? new Date().toISOString() : null,
    consentAttestedBy: input.consentAttested ? input.practitionerName : null,
    createdAt: new Date().toISOString(),
    // Recovered from claude/frame-phase-1-contract-qxzs36 — see
    // participantContextImport.ts for how these get populated for real.
    linkId: null,
    planCycle: null,
    knownBehaviourLabels: [],
  })
  return id
}

// Manual linkId entry — a fallback for correcting/entering a linkId by hand
// alongside importParticipantContext below.
export async function setParticipantLinkId(participantId: string, linkId: string | null) {
  const participant = await db.participants.get(participantId)
  if (!participant) throw new Error('Participant not found')
  await db.participants.update(participantId, { linkId: linkId?.trim() || null })
}

export type ImportParticipantContextOutcome =
  | { status: 'ok'; participantId: string; wasUpdate: boolean }
  | { status: 'error'; reason: string }

// Consumes a ParticipantContext file exported by Vector (contract A2).
// Validated against the contract before anything is written. A linkId
// already present locally updates that participant in place (plan cycle,
// consent, suggested behaviour labels refresh); a new linkId creates a new
// Frame participant. knownBehaviourLabels are stored for the "Add
// behaviour" screen to offer as suggestions — never auto-created here.
// Recovered from claude/frame-phase-1-contract-qxzs36.
export async function importParticipantContext(
  json: string,
  practitionerName: string,
): Promise<ImportParticipantContextOutcome> {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { status: 'error', reason: 'This file is not valid JSON.' }
  }

  const validation = validateParticipantContext(parsed)
  if (!validation.ok) {
    return { status: 'error', reason: `Not a valid ParticipantContext: ${validation.errors.join(' ')}` }
  }
  const context = parsed as ParticipantContext

  const existing = (await db.participants.toArray()).find((p) => p.linkId === context.linkId)

  if (existing) {
    await db.participants.update(existing.id, {
      planCycle: context.planCycle,
      knownBehaviourLabels: context.knownBehaviourLabels,
      consentAttested: context.consentAttested,
      consentAttestedAt: context.consentAttestedAt,
      consentAttestedBy: context.consentAttested ? practitionerName : existing.consentAttestedBy,
    })
    return { status: 'ok', participantId: existing.id, wasUpdate: true }
  }

  const id = newId()
  await db.participants.add({
    id,
    // displayLabel (initials/alias), never full identifying details — this
    // is exactly what crossed the boundary, so it's exactly what's shown
    // locally too (contract A1/A2).
    identifyingDetails: context.displayLabel,
    consentAttested: context.consentAttested,
    consentAttestedAt: context.consentAttestedAt,
    consentAttestedBy: context.consentAttested ? practitionerName : null,
    createdAt: new Date().toISOString(),
    linkId: context.linkId,
    planCycle: context.planCycle,
    knownBehaviourLabels: context.knownBehaviourLabels,
  })
  return { status: 'ok', participantId: id, wasUpdate: false }
}

export type GenerateBundleOutcome = { status: 'ok'; exportId: string } | { status: 'blocked'; reason: string }

// Assembles and stores an FbaOutcomeBundle as an immutable DocumentationExport
// snapshot (contract A3) — the one-way Frame -> Vector handoff of assessment
// output. Recovered from claude/frame-phase-1-contract-qxzs36, adapted to
// read from FormulationRecord/scales.ts instead of the deleted
// Formulation/escalationContent.ts this branch shipped against.
export async function generateFbaOutcomeBundleExport(input: {
  participantId: string
  behaviourIds: string[]
  generatedBy: string
}): Promise<GenerateBundleOutcome> {
  const participant = await db.participants.get(input.participantId)
  if (!participant) throw new Error('Participant not found')

  const behaviours = (
    await Promise.all(input.behaviourIds.map((id) => db.behaviours.get(id)))
  ).filter((b): b is NonNullable<typeof b> => b !== undefined)

  const perBehaviour = await Promise.all(
    behaviours.map(async (behaviour) => {
      const [episodes, formulations, hypotheses, riskFlagsForBehaviour] = await Promise.all([
        db.episodes.where('behaviourId').equals(behaviour.id).sortBy('dateTime'),
        db.formulations.where('behaviourId').equals(behaviour.id).toArray(),
        db.hypotheses.where('behaviourId').equals(behaviour.id).sortBy('computedAt'),
        db.riskFlags.where('behaviourId').equals(behaviour.id).toArray(),
      ])
      return {
        behaviour,
        episodes,
        formulations,
        latestHypothesis: hypotheses.length ? hypotheses[hypotheses.length - 1] : null,
        riskFlags: riskFlagsForBehaviour,
      }
    }),
  )

  const id = newId()
  const assembled = assembleFbaOutcomeBundle({
    participant,
    generatedBy: input.generatedBy,
    generatedAt: new Date().toISOString(),
    sourceExportId: id,
    behaviours: perBehaviour,
  })
  if (!assembled.ok) return { status: 'blocked', reason: assembled.error }

  const validation = validateFbaOutcomeBundle(assembled.bundle)
  if (!validation.ok) {
    return { status: 'blocked', reason: `Bundle failed contract validation: ${validation.errors.join(' ')}` }
  }
  const leakedKeys = findDenylistedKeys(assembled.bundle)
  if (leakedKeys.length > 0) {
    return { status: 'blocked', reason: `Bundle contains disallowed identifying keys: ${leakedKeys.join(', ')}.` }
  }

  await db.documentationExports.add({
    id,
    participantId: input.participantId,
    behaviourIds: input.behaviourIds,
    generatedAt: assembled.bundle.generatedAt,
    generatedBy: input.generatedBy,
    format: 'fba_outcome_bundle',
    contentSnapshot: JSON.stringify(assembled.bundle, null, 2),
  })

  return { status: 'ok', exportId: id }
}

export async function createBehaviour(input: {
  participantId: string
  name: string
  operationalDefinition: string
  concernCategories: string[]
  createdBy: string
}) {
  const id = newId()
  await db.behaviours.add({
    id,
    participantId: input.participantId,
    name: input.name.trim(),
    operationalDefinition: input.operationalDefinition.trim(),
    concernCategories: input.concernCategories,
    status: 'active',
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
  })
  return id
}

export async function createEpisode(input: {
  behaviourId: string
  dateTime: string
  durationMinutes: number | null
  severityRating: 0 | 1 | 2 | 3
  frequencyContext: 0 | 1 | 2 | 3 | 4
  settingEvent: string
  settingEventTags: string[]
  antecedentText: string
  antecedentTags: string[]
  consequenceText: string
  consequenceTags: string[]
  riskFlags: RiskFlagItem[]
  loggedBy: string
}) {
  // Custom consequence items added at logging time carry an explicit domain
  // (Phase 1.2 §3) — resolve those so deriveConsequenceTag can use them too,
  // not just the static CONSEQUENCE_ITEMS list.
  const customConsequenceItems = await db.behaviourChecklistItems
    .where('behaviourId')
    .equals(input.behaviourId)
    .and((c) => c.field === 'consequence' && c.domain !== null)
    .toArray()
  const customDomainMap = Object.fromEntries(
    customConsequenceItems.map((c) => [c.label, c.domain as NonNullable<typeof c.domain>]),
  )

  const id = newId()
  await db.episodes.add({
    id,
    behaviourId: input.behaviourId,
    dateTime: input.dateTime,
    durationMinutes: input.durationMinutes,
    severityRating: input.severityRating,
    frequencyContext: input.frequencyContext,
    settingEvent: input.settingEvent.trim(),
    settingEventTags: input.settingEventTags,
    antecedentText: input.antecedentText.trim(),
    antecedentTags: input.antecedentTags,
    consequenceText: input.consequenceText.trim(),
    consequenceTags: input.consequenceTags,
    // Derived/rollup — never taken directly from the caller. hypothesis.ts
    // depends on this staying exactly one FAST domain or 'none_observed'
    // (brief §4 hard constraint).
    consequenceTag: deriveConsequenceTag(input.consequenceTags, customDomainMap),
    loggedBy: input.loggedBy,
    riskFlags: input.riskFlags,
    createdAt: new Date().toISOString(),
  })

  // Fires immediately on save, not on next recompute (brief §3).
  const episodesAsc = await db.episodes.where('behaviourId').equals(input.behaviourId).sortBy('dateTime')
  for (const candidate of checkEpisodeTriggers(episodesAsc)) {
    await raiseFlagIfNotOpen(input.behaviourId, candidate)
  }

  return id
}

// Phase 1.2 §3 — persists an "Add your own" checklist entry so it's offered
// as an ordinary option next time this behaviour's episodes are logged.
// domain is required (and validated) for field === 'consequence'; every
// consequence item must resolve to a FAST domain, custom or not.
export async function addBehaviourChecklistItem(input: {
  behaviourId: string
  field: 'antecedent' | 'settingEvent' | 'consequence'
  label: string
  domain?: ConsequenceTag
}) {
  const label = input.label.trim()
  if (!label) throw new Error('A label is required')
  if (input.field === 'consequence' && !input.domain) {
    throw new Error('A function domain is required for a custom consequence item')
  }

  const existing = await db.behaviourChecklistItems
    .where('behaviourId')
    .equals(input.behaviourId)
    .and((c) => c.field === input.field && c.label === label)
    .first()
  if (existing) return existing.id

  const id = newId()
  await db.behaviourChecklistItems.add({
    id,
    behaviourId: input.behaviourId,
    field: input.field,
    label,
    domain: input.field === 'consequence' ? (input.domain ?? null) : null,
    createdAt: new Date().toISOString(),
  })
  return id
}

export async function createScreener(input: {
  behaviourId: string
  informantId: string
  informantRole: string
  responses: ScreenerResponse[]
}) {
  const id = newId()
  await db.screeners.add({
    id,
    behaviourId: input.behaviourId,
    informantId: input.informantId,
    informantRole: input.informantRole,
    dateCompleted: new Date().toISOString(),
    rawResponses: input.responses,
    domainScores: scoreDomains(input.responses),
    createdAt: new Date().toISOString(),
  })
  return id
}

// On-demand only (brief §3.5) — never called automatically from
// createEpisode/createScreener. A practitioner explicitly triggers this via
// the "Recompute" button.
export async function recomputeHypothesis(behaviourId: string): Promise<ComputeOutcome> {
  const [episodes, screeners] = await Promise.all([
    db.episodes.where('behaviourId').equals(behaviourId).toArray(),
    db.screeners.where('behaviourId').equals(behaviourId).toArray(),
  ])

  const outcome = computeHypothesis(episodes, screeners)
  if (outcome.status === 'ok') {
    await db.hypotheses.add({
      id: newId(),
      behaviourId,
      computedAt: new Date().toISOString(),
      // Not part of hypothesis.ts's computed result (untouched by this
      // phase) — practitioner sets this afterwards via
      // setPractitionerConfidenceRating.
      practitionerConfidenceRating: null,
      ...outcome.result,
    })

    const hypothesesAsc = await db.hypotheses.where('behaviourId').equals(behaviourId).sortBy('computedAt')
    for (const candidate of checkHypothesisTriggers(hypothesesAsc)) {
      await raiseFlagIfNotOpen(behaviourId, candidate)
    }
  }
  return outcome
}

// Phase 1.3 (brief §5) — practitioner's own clinical-judgement confidence
// rating on an already-computed hypothesis. Kept as a distinct update from
// recomputeHypothesis so setting it never triggers a recompute or touches
// the computed fields.
export async function setPractitionerConfidenceRating(hypothesisId: string, rating: 1 | 2 | 3 | 4 | 5 | 6) {
  const hypothesis = await db.hypotheses.get(hypothesisId)
  if (!hypothesis) throw new Error('Hypothesis not found')
  await db.hypotheses.update(hypothesisId, { practitionerConfidenceRating: rating })
}

// Skips raising a new flag if one of the same triggerType is already open for
// this behaviour — avoids spamming the dashboard with repeats of a condition
// the practitioner hasn't addressed yet. Once that flag is acknowledged,
// escalated, or resolved, a fresh occurrence raises a new one.
async function raiseFlagIfNotOpen(behaviourId: string, candidate: FlagCandidate) {
  const existingOpen = await db.riskFlags
    .where('behaviourId')
    .equals(behaviourId)
    .and((f) => f.triggerType === candidate.triggerType && f.status === 'open')
    .first()
  if (existingOpen) return

  await db.riskFlags.add({
    id: newId(),
    behaviourId,
    triggerType: candidate.triggerType,
    triggerDetail: candidate.triggerDetail,
    triggeredAt: new Date().toISOString(),
    status: 'open',
    acknowledgedBy: null,
    acknowledgedAt: null,
    resolutionNote: null,
  })
}

export async function acknowledgeFlag(flagId: string, practitionerName: string) {
  const flag = await db.riskFlags.get(flagId)
  if (!flag) throw new Error('Flag not found')
  if (flag.status !== 'open') throw new Error('Only open flags can be acknowledged')
  await db.riskFlags.update(flagId, {
    status: 'acknowledged',
    acknowledgedBy: practitionerName,
    acknowledgedAt: new Date().toISOString(),
  })
}

export async function escalateFlagToEfa(flagId: string) {
  const flag = await db.riskFlags.get(flagId)
  if (!flag) throw new Error('Flag not found')
  if (flag.status !== 'acknowledged') throw new Error('Acknowledge the flag before escalating it')
  await db.riskFlags.update(flagId, { status: 'escalated_to_efa' })
}

export async function resolveFlag(flagId: string, resolutionNote: string) {
  const note = resolutionNote.trim()
  if (!note) throw new Error('A resolution note is required to resolve a flag')
  const flag = await db.riskFlags.get(flagId)
  if (!flag) throw new Error('Flag not found')
  if (flag.status !== 'acknowledged') throw new Error('Acknowledge the flag before resolving it')
  await db.riskFlags.update(flagId, { status: 'resolved', resolutionNote: note })
}

export async function generateDocumentationExport(input: {
  participantId: string
  behaviourIds: string[]
  format: DocumentationFormat
  generatedBy: string
}) {
  const participant = await db.participants.get(input.participantId)
  if (!participant) throw new Error('Participant not found')

  const behaviours = (
    await Promise.all(input.behaviourIds.map((id) => db.behaviours.get(id)))
  ).filter((b): b is NonNullable<typeof b> => b !== undefined)

  const perBehaviour = await Promise.all(
    behaviours.map(async (behaviour) => {
      const [episodes, screeners, hypotheses, flags] = await Promise.all([
        db.episodes.where('behaviourId').equals(behaviour.id).sortBy('dateTime'),
        db.screeners.where('behaviourId').equals(behaviour.id).sortBy('dateCompleted'),
        db.hypotheses.where('behaviourId').equals(behaviour.id).sortBy('computedAt'),
        db.riskFlags.where('behaviourId').equals(behaviour.id).sortBy('triggeredAt'),
      ])
      return {
        behaviour,
        episodes,
        screeners,
        latestHypothesis: hypotheses.length ? hypotheses[hypotheses.length - 1] : null,
        flags,
      }
    }),
  )

  // Rendered once, here, at generation time — this string is what gets
  // stored. Later edits to the underlying episodes/screeners/flags never
  // change an already-generated export (brief §5).
  const contentSnapshot = renderDocumentationExport({
    format: input.format,
    participant,
    generatedBy: input.generatedBy,
    generatedAt: new Date().toISOString(),
    behaviours: perBehaviour,
  })

  const id = newId()
  await db.documentationExports.add({
    id,
    participantId: input.participantId,
    behaviourIds: input.behaviourIds,
    generatedAt: new Date().toISOString(),
    generatedBy: input.generatedBy,
    format: input.format,
    contentSnapshot,
  })
  return id
}

// Phase 4 — multi-informant handoff, QR only (brief §2-3).

export async function createScreenerInvite(input: { behaviourId: string; informantRole: string }) {
  const id = newId()
  const token = generateToken()
  await db.screenerInvites.add({
    id,
    behaviourId: input.behaviourId,
    token,
    informantRole: input.informantRole,
    createdAt: new Date().toISOString(),
    status: 'pending',
  })
  return { id, token, url: buildInviteUrl(token, input.informantRole) }
}

export async function cancelScreenerInvite(inviteId: string) {
  const invite = await db.screenerInvites.get(inviteId)
  if (!invite) throw new Error('Invite not found')
  if (invite.status !== 'pending') throw new Error('Only pending invites can be cancelled')
  await db.screenerInvites.update(inviteId, { status: 'cancelled' })
}

export type ImportOutcome =
  | { status: 'ok'; screenerId: string; behaviourId: string }
  | { status: 'not_found' }
  | { status: 'already_used' }
  | { status: 'cancelled' }

export type ClaimOutcome<T> =
  | { status: 'ok'; invite: T }
  | { status: 'not_found' }
  | { status: 'already_used' }
  | { status: 'cancelled' }

// Shared transactional invite-claim pattern behind both importScreenerResponse
// and importIncidentReport (brief §4: "reuse that logic, don't reimplement
// it differently"). Matches on token against a locally-stored pending
// invite — no server round trip — and flips it to 'completed' inside the
// same transaction, so two near-simultaneous imports of the same response
// QR can't both see 'pending' and both succeed (brief §6: scanning the same
// response QR twice must reject the second, not silently create a
// duplicate downstream record).
async function claimInvite<T extends { id: string; token: string; behaviourId: string; status: ScreenerInviteStatus }>(
  table: EntityTable<T, 'id'>,
  token: string,
): Promise<ClaimOutcome<T>> {
  return db.transaction('rw', [table], async () => {
    const invite = await table.where('token').equals(token).first()
    if (!invite) return { status: 'not_found' as const }
    if (invite.status === 'completed') return { status: 'already_used' as const }
    if (invite.status === 'cancelled') return { status: 'cancelled' as const }
    // Dexie's update() typing doesn't resolve cleanly through a generic T
    // here (key type and UpdateSpec both depend on the concrete shape);
    // every table this is called with genuinely has a string id and status
    // field, so the loosened typing on this one call is safe at runtime.
    const loose = table as unknown as EntityTable<{ id: string; status: ScreenerInviteStatus }, 'id'>
    await loose.update(invite.id, { status: 'completed' })
    return { status: 'ok' as const, invite }
  })
}

export async function importScreenerResponse(input: {
  token: string
  responses: ScreenerResponse[]
  completedAt: string
  informantName?: string
}): Promise<ImportOutcome> {
  const claim = await claimInvite(db.screenerInvites, input.token)
  if (claim.status !== 'ok') return claim

  const informantRole = input.informantName?.trim()
    ? `${claim.invite.informantRole} (${input.informantName.trim()})`
    : claim.invite.informantRole

  const screenerId = newId()
  await db.screeners.add({
    id: screenerId,
    behaviourId: claim.invite.behaviourId,
    informantId: newId(),
    informantRole,
    dateCompleted: input.completedAt,
    rawResponses: input.responses,
    domainScores: scoreDomains(input.responses),
    createdAt: new Date().toISOString(),
  })

  return { status: 'ok', screenerId, behaviourId: claim.invite.behaviourId }
}

// Phase 1.1 — structured interview / initial-assessment mode (brief §3).
// Supports multiple records per behaviour; none of these fields ever feed
// hypothesis.ts (frequencyImpression in particular is an interview-stage
// impression, not a substitute for real logged Episode data).
export async function createFormulation(input: {
  behaviourId: string
  informantName?: string
  informantRole?: string
  conductedBy: string
  descriptionRecentExample: string
  descriptionIntenseEpisode: string
  descriptionAntecedentAndResponse: string
  onset: string
  frequencyImpression: string
  riskScenarioHigh: string
  riskScenarioLow: string
  escalationCycle: Record<EscalationPhase, EscalationPhaseData>
}) {
  const id = newId()
  await db.formulations.add({
    id,
    behaviourId: input.behaviourId,
    informantName: input.informantName?.trim() || null,
    informantRole: input.informantRole?.trim() || null,
    conductedBy: input.conductedBy,
    conductedAt: new Date().toISOString(),
    descriptionRecentExample: input.descriptionRecentExample.trim(),
    descriptionIntenseEpisode: input.descriptionIntenseEpisode.trim(),
    descriptionAntecedentAndResponse: input.descriptionAntecedentAndResponse.trim(),
    onset: input.onset.trim(),
    frequencyImpression: input.frequencyImpression.trim(),
    riskScenarioHigh: input.riskScenarioHigh.trim(),
    riskScenarioLow: input.riskScenarioLow.trim(),
    escalationCycle: input.escalationCycle,
  })
  return id
}

// Phase 1.2 §4 — QR handoff extended to incident/ABC reporting. Mirrors
// createScreenerInvite/cancelScreenerInvite exactly.
export async function createReportInvite(input: { behaviourId: string; informantRole: string }) {
  const id = newId()
  const token = generateToken()
  await db.reportInvites.add({
    id,
    behaviourId: input.behaviourId,
    token,
    informantRole: input.informantRole,
    createdAt: new Date().toISOString(),
    status: 'pending',
  })
  return { id, token, url: buildReportInviteUrl(token, input.informantRole) }
}

export async function cancelReportInvite(inviteId: string) {
  const invite = await db.reportInvites.get(inviteId)
  if (!invite) throw new Error('Invite not found')
  if (invite.status !== 'pending') throw new Error('Only pending invites can be cancelled')
  await db.reportInvites.update(inviteId, { status: 'cancelled' })
}

export type ImportReportOutcome =
  | { status: 'ok'; episodeId: string; behaviourId: string }
  | { status: 'not_found' }
  | { status: 'already_used' }
  | { status: 'cancelled' }

// Claims the invite first (via the same claimInvite used by
// importScreenerResponse — brief §4: reuse the pattern, don't reimplement
// it), then creates the episode through the ordinary createEpisode path so
// it gets the exact same risk-flag trigger checks and consequence-domain
// resolution as a manually-logged episode. Claiming happens before episode
// creation specifically so a duplicate scan is rejected before ever calling
// createEpisode, not just before the episode would be visible.
export async function importIncidentReport(input: {
  token: string
  dateTime: string
  durationMinutes: number | null
  severityRating: 0 | 1 | 2 | 3
  frequencyContext: 0 | 1 | 2 | 3 | 4
  settingEvent: string
  settingEventTags: string[]
  antecedentText: string
  antecedentTags: string[]
  consequenceText: string
  consequenceTags: string[]
  riskFlags: RiskFlagItem[]
  informantName?: string
}): Promise<ImportReportOutcome> {
  const claim = await claimInvite(db.reportInvites, input.token)
  if (claim.status !== 'ok') return claim

  const loggedBy = input.informantName?.trim()
    ? `${claim.invite.informantRole} (${input.informantName.trim()})`
    : claim.invite.informantRole

  const episodeId = await createEpisode({
    behaviourId: claim.invite.behaviourId,
    dateTime: input.dateTime,
    durationMinutes: input.durationMinutes,
    severityRating: input.severityRating,
    frequencyContext: input.frequencyContext,
    settingEvent: input.settingEvent,
    settingEventTags: input.settingEventTags,
    antecedentText: input.antecedentText,
    antecedentTags: input.antecedentTags,
    consequenceText: input.consequenceText,
    consequenceTags: input.consequenceTags,
    riskFlags: input.riskFlags,
    loggedBy,
  })

  return { status: 'ok', episodeId, behaviourId: claim.invite.behaviourId }
}
