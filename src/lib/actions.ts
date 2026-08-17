import { db, newId } from './db'
import type {
  AntecedentTag,
  ConsequenceTag,
  DocumentationFormat,
  RiskFlagItem,
  ScreenerResponse,
  StrategyLookup,
} from './types'
import { scoreDomains } from './screener'
import { computeHypothesis, type ComputeOutcome } from './hypothesis'
import { checkEpisodeTriggers, checkHypothesisTriggers, type FlagCandidate } from './riskFlags'
import { renderDocumentationExport, resolveStrategyLookupDomain } from './documentExport'
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
  })
  return id
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
    })

    const hypothesesAsc = await db.hypotheses.where('behaviourId').equals(behaviourId).sortBy('computedAt')
    for (const candidate of checkHypothesisTriggers(hypothesesAsc)) {
      await raiseFlagIfNotOpen(behaviourId, candidate)
    }
  }
  return outcome
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
  // Optional strategy-library plug-in point (see types.ts StrategyLookup /
  // MatchedStrategy). Only consulted for staff_training_summary, and only
  // when a caller actually supplies one — there is no default
  // implementation, so omitting it reproduces today's stub behaviour
  // exactly.
  strategyLookup?: StrategyLookup
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
      const latestHypothesis = hypotheses.length ? hypotheses[hypotheses.length - 1] : null

      let matchedStrategies
      if (input.format === 'staff_training_summary' && input.strategyLookup) {
        const domain = resolveStrategyLookupDomain(latestHypothesis)
        if (domain) matchedStrategies = await input.strategyLookup(domain)
      }

      return {
        behaviour,
        episodes,
        screeners,
        latestHypothesis,
        flags,
        matchedStrategies,
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
