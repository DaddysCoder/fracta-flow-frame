import { db, newId } from './db'
import type { ParticipantContact, ParticipantProfile } from './types'

const LAST_BACKUP_KEY = 'fba-screener:last-backup-at'
const REMINDER_INTERVAL_DAYS = 7

// Durability caveat (brief §Architecture): browser local storage is not
// bulletproof long-term — iOS Safari in particular clears it aggressively.
// The product prompts regular export/backup rather than treating on-device
// storage as permanent.

export async function exportAllData(): Promise<void> {
  const [practitioners, participants, behaviours, episodes, screeners] = await Promise.all([
    db.practitioners.toArray(),
    db.participants.toArray(),
    db.behaviours.toArray(),
    db.episodes.toArray(),
    db.screeners.toArray(),
  ])

  const payload = {
    exportedAt: new Date().toISOString(),
    format: 'fba-screener-backup-v1',
    data: { practitioners, participants, behaviours, episodes, screeners },
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fba-screener-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)

  localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString())
}

export async function importData(file: File): Promise<void> {
  const text = await file.text()
  const parsed = JSON.parse(text)
  if (parsed?.format !== 'fba-screener-backup-v1') {
    throw new Error('This file is not a recognised FBA Screener backup.')
  }
  const { practitioners, participants, behaviours, episodes, screeners } = parsed.data
  await db.transaction(
    'rw',
    [db.practitioners, db.participants, db.behaviours, db.episodes, db.screeners],
    async () => {
      await db.practitioners.bulkPut(practitioners ?? [])
      await db.participants.bulkPut(participants ?? [])
      await db.behaviours.bulkPut(behaviours ?? [])
      await db.episodes.bulkPut(episodes ?? [])
      await db.screeners.bulkPut(screeners ?? [])
    },
  )
  localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString())
}

// Tier 0 participant profile import — a separate, one-way format from the
// full backup above. See docs/participant-import-schema.md for the full
// contract this mirrors; PBS's export side must match it exactly.
export const PARTICIPANT_IMPORT_SCHEMA = 'pbs-participant-profile-import-v1'

export interface ParticipantImportPayload {
  schema: string
  exportedAt?: string
  sourceSystem?: string
  participant: {
    preferredName: string
    legalName: string
    dob: string
    ndisNumber: string
    location?: string | null
    contacts?: ParticipantContact[]
  }
  referrer: {
    identity: string
  }
  practitioner?: {
    identity: string
  } | null
  provider?: {
    details: string
  } | null
}

export interface ParsedParticipantImport {
  profile: ParticipantProfile
  identifyingDetails: string
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Participant import is missing required field "${field}".`)
  }
  return value.trim()
}

function optionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function requireObject(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Participant import is missing the "${field}" section.`)
  }
  return value as Record<string, unknown>
}

// Pure and DB-free, matching the hypothesis.ts/riskFlags.ts pattern so the
// same validation backs both the real import action and its unit tests.
// Never guesses a missing required field — throws with a specific message
// naming exactly what's missing, so a malformed PBS export fails loudly
// rather than silently creating a half-populated participant.
export function parseParticipantImportPayload(raw: unknown): ParsedParticipantImport {
  const payload = requireObject(raw, 'root')
  if (payload.schema !== PARTICIPANT_IMPORT_SCHEMA) {
    throw new Error(
      `This file is not a recognised participant profile import (expected schema "${PARTICIPANT_IMPORT_SCHEMA}", got ${JSON.stringify(payload.schema)}).`,
    )
  }

  const p = requireObject(payload.participant, 'participant')
  const preferredName = requireString(p.preferredName, 'participant.preferredName')
  const legalName = requireString(p.legalName, 'participant.legalName')
  const dob = requireString(p.dob, 'participant.dob')
  if (!ISO_DATE_RE.test(dob)) {
    throw new Error('participant.dob must be an ISO date in YYYY-MM-DD form.')
  }
  const ndisNumber = requireString(p.ndisNumber, 'participant.ndisNumber')
  const location = optionalString(p.location)

  const contacts: ParticipantContact[] = []
  if (p.contacts !== undefined) {
    if (!Array.isArray(p.contacts)) throw new Error('participant.contacts must be an array.')
    p.contacts.forEach((c, i) => {
      const contact = requireObject(c, `participant.contacts[${i}]`)
      contacts.push({
        label: requireString(contact.label, `participant.contacts[${i}].label`),
        detail: requireString(contact.detail, `participant.contacts[${i}].detail`),
      })
    })
  }

  const referrer = requireObject(payload.referrer, 'referrer')
  const referrerIdentity = requireString(referrer.identity, 'referrer.identity')

  let practitionerIdentity: string | null = null
  if (payload.practitioner != null) {
    practitionerIdentity = optionalString(requireObject(payload.practitioner, 'practitioner').identity)
  }

  let providerDetails: string | null = null
  if (payload.provider != null) {
    providerDetails = optionalString(requireObject(payload.provider, 'provider').details)
  }

  const profile: ParticipantProfile = {
    preferredName,
    legalName,
    dob,
    ndisNumber,
    location,
    contacts,
    referrerIdentity,
    practitionerIdentity,
    providerDetails,
    sourceSystem: optionalString(payload.sourceSystem),
    exportedAt: optionalString(payload.exportedAt),
    importedAt: null, // stamped by importParticipantProfile at actual import time
  }

  return { profile, identifyingDetails: `${preferredName} (${legalName})` }
}

// Always creates a new participant — this is how Frame receives a
// participant it doesn't already have, not a merge into an existing one
// (brief step 4). Consent is attested the same way as manual creation
// (Participants.tsx): importing identity data from a file does not itself
// constitute Frame's own consent attestation.
export async function importParticipantProfile(
  file: File,
  input: { consentAttested: boolean; practitionerName: string },
): Promise<string> {
  const text = await file.text()
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('Participant import file is not valid JSON.')
  }
  const { profile, identifyingDetails } = parseParticipantImportPayload(raw)

  const id = newId()
  const now = new Date().toISOString()
  await db.participants.add({
    id,
    identifyingDetails,
    consentAttested: input.consentAttested,
    consentAttestedAt: input.consentAttested ? now : null,
    consentAttestedBy: input.consentAttested ? input.practitionerName : null,
    createdAt: now,
    profile: { ...profile, importedAt: now },
  })
  return id
}

export function getLastBackupAt(): Date | null {
  const raw = localStorage.getItem(LAST_BACKUP_KEY)
  return raw ? new Date(raw) : null
}

export function isBackupOverdue(): boolean {
  const last = getLastBackupAt()
  if (!last) return true
  const daysSince = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24)
  return daysSince >= REMINDER_INTERVAL_DAYS
}
