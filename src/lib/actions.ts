import { db, newId } from './db'
import type {
  AntecedentTag,
  ConsequenceTag,
  RiskFlagItem,
  ScreenerResponse,
} from './types'
import { scoreDomains } from './screener'

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
