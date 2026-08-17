import { findDenylistedKeys, validateFbaOutcomeBundle } from '@fracta/contract'
import { db, newId } from './db'
import { assembleFbaOutcomeBundle } from './fbaOutcomeBundle'
import type {
  AntecedentTag,
  ChecklistEntry,
  ConsequenceTag,
  EscalationCycle,
  FormulationDescriptionPrompts,
  FormulationRiskScenarios,
  RiskFlagItem,
  ScreenerResponse,
} from './types'
import { scoreDomains } from './screener'
import { computeHypothesis, type ComputeOutcome } from './hypothesis'
import { checkEpisodeTriggers, checkHypothesisTriggers, type FlagCandidate } from './riskFlags'
import { renderDocumentationExport, type HtmlDocumentationFormat } from './documentExport'
import { buildInviteUrl, generateToken } from './qrPayload'

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
    linkId: null,
  })
  return id
}

// Manual linkId entry — a stopgap until the full ParticipantContext import
// exists. Vector still mints the value; this only lets a practitioner
// record one by hand so bundle export (brief Part B, step 8) can be
// exercised end-to-end before step 9 ships.
export async function setParticipantLinkId(participantId: string, linkId: string | null) {
  const participant = await db.participants.get(participantId)
  if (!participant) throw new Error('Participant not found')
  await db.participants.update(participantId, { linkId: linkId?.trim() || null })
}

export async function createBehaviour(input: {
  participantId: string
  name: string
  operationalDefinition: string
  createdBy: string
}) {
  const id = newId()
  await db.behaviours.add({
    id,
    participantId: input.participantId,
    name: input.name.trim(),
    operationalDefinition: input.operationalDefinition.trim(),
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
  antecedentText: string
  antecedentTag: AntecedentTag
  consequenceText: string
  consequenceTag: ConsequenceTag
  riskFlags: RiskFlagItem[]
  loggedBy: string
}) {
  const id = newId()
  await db.episodes.add({
    id,
    behaviourId: input.behaviourId,
    dateTime: input.dateTime,
    durationMinutes: input.durationMinutes,
    severityRating: input.severityRating,
    frequencyContext: input.frequencyContext,
    settingEvent: input.settingEvent.trim(),
    antecedentText: input.antecedentText.trim(),
    antecedentTag: input.antecedentTag,
    consequenceText: input.consequenceText.trim(),
    consequenceTag: input.consequenceTag,
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

// Formulation is a collection, not a single overwritable section (brief
// Part B, step 2) — every call adds a new dated record. Editing an existing
// formulation still goes through this same shape via db.formulations.put
// from the caller if ever needed, but there is no update path here: the
// UI never silently overwrites a past interview.
export async function createFormulation(input: {
  behaviourId: string
  informantName: string
  informantRole: string
  conductedBy: string
  descriptionPrompts: FormulationDescriptionPrompts
  onset: string
  frequencyImpression: string
  riskScenarios: FormulationRiskScenarios
  escalationCycle: EscalationCycle
  antecedentContext: ChecklistEntry
  consequenceContext: ChecklistEntry
  settingEvents: ChecklistEntry
}) {
  const id = newId()
  await db.formulations.add({
    id,
    behaviourId: input.behaviourId,
    informantName: input.informantName.trim(),
    informantRole: input.informantRole.trim(),
    conductedBy: input.conductedBy,
    conductedAt: new Date().toISOString(),
    descriptionPrompts: input.descriptionPrompts,
    onset: input.onset.trim(),
    frequencyImpression: input.frequencyImpression.trim(),
    riskScenarios: input.riskScenarios,
    escalationCycle: input.escalationCycle,
    antecedentContext: input.antecedentContext,
    consequenceContext: input.consequenceContext,
    settingEvents: input.settingEvents,
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
      ...outcome.result,
      // Practitioner confidence is a separate, subsequent annotation (step
      // 7) — never derived from the computation above.
      practitionerConfidence: null,
    })

    const hypothesesAsc = await db.hypotheses.where('behaviourId').equals(behaviourId).sortBy('computedAt')
    for (const candidate of checkHypothesisTriggers(hypothesesAsc)) {
      await raiseFlagIfNotOpen(behaviourId, candidate)
    }
  }
  return outcome
}

// Practitioner's own subjective confidence rating, attached to an already-
// computed hypothesis (brief Part B, step 7). Deliberately a separate
// update path from recomputeHypothesis: it annotates a clinical judgement
// onto an immutable computed record, never re-derives or overwrites the
// computed fields.
export async function setPractitionerConfidence(
  hypothesisId: string,
  rating: 1 | 2 | 3 | 4 | 5 | 6 | null,
) {
  const hypothesis = await db.hypotheses.get(hypothesisId)
  if (!hypothesis) throw new Error('Hypothesis not found')
  await db.hypotheses.update(hypothesisId, { practitionerConfidence: rating })
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
  format: HtmlDocumentationFormat
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

export type GenerateBundleOutcome =
  | { status: 'ok'; exportId: string }
  | { status: 'blocked'; reason: string }

// FbaOutcomeBundle export (brief Part B, step 8): assembles the bundle from
// current data, validates it against the contract (belt-and-braces — the
// same checks assembleFbaOutcomeBundle already enforces, plus the PII
// denylist fuzz check, run once more immediately before it's written), and
// stores it via the same immutable DocumentationExport snapshot mechanism
// used for the HTML formats, so it shows up in the same audit trail.
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

// Matches on token against a locally-stored pending invite (brief §2, step
// 3) — no server round trip. Wrapped in a transaction so two near-
// simultaneous imports of the same response QR can't both see 'pending' and
// both succeed (brief §6: scanning the same response QR twice must reject
// the second, not silently create two FunctionScreener records).
export async function importScreenerResponse(input: {
  token: string
  responses: ScreenerResponse[]
  completedAt: string
  informantName?: string
}): Promise<ImportOutcome> {
  return db.transaction('rw', [db.screenerInvites, db.screeners], async () => {
    const invite = await db.screenerInvites.where('token').equals(input.token).first()
    if (!invite) return { status: 'not_found' as const }
    if (invite.status === 'completed') return { status: 'already_used' as const }
    if (invite.status === 'cancelled') return { status: 'cancelled' as const }

    const informantRole = input.informantName?.trim()
      ? `${invite.informantRole} (${input.informantName.trim()})`
      : invite.informantRole

    const screenerId = newId()
    await db.screeners.add({
      id: screenerId,
      behaviourId: invite.behaviourId,
      informantId: newId(),
      informantRole,
      dateCompleted: input.completedAt,
      rawResponses: input.responses,
      domainScores: scoreDomains(input.responses),
      createdAt: new Date().toISOString(),
    })
    await db.screenerInvites.update(invite.id, { status: 'completed' })

    return { status: 'ok' as const, screenerId, behaviourId: invite.behaviourId }
  })
}
