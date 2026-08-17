import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import {
  importParticipantProfile,
  parseParticipantImportPayload,
  PARTICIPANT_IMPORT_SCHEMA,
  type ParticipantImportPayload,
} from './backup'

function validPayload(overrides: Partial<ParticipantImportPayload> = {}): ParticipantImportPayload {
  return {
    schema: PARTICIPANT_IMPORT_SCHEMA,
    exportedAt: '2026-08-17T00:00:00.000Z',
    sourceSystem: 'pbs-registry',
    participant: {
      preferredName: 'Sam',
      legalName: 'Samuel Test',
      dob: '2005-01-01',
      ndisNumber: '4300000000',
      location: 'Toowoomba, QLD',
      contacts: [
        { label: 'Primary contact', detail: '0400 000 000' },
        { label: 'Guardian/nominee', detail: 'Jane Test, mother — 0400 111 111' },
      ],
    },
    referrer: { identity: 'Dr. Referrer, GP, Sunshine Medical Centre' },
    practitioner: { identity: 'Alex Practitioner, Behaviour Support Practitioner, reg #12345' },
    provider: { details: 'Sunshine Behaviour Support Services, ABN 12 345 678 901' },
    ...overrides,
  }
}

describe('parseParticipantImportPayload', () => {
  it('parses a fully-populated valid payload', () => {
    const { profile, identifyingDetails } = parseParticipantImportPayload(validPayload())
    expect(identifyingDetails).toBe('Sam (Samuel Test)')
    expect(profile).toEqual({
      preferredName: 'Sam',
      legalName: 'Samuel Test',
      dob: '2005-01-01',
      ndisNumber: '4300000000',
      location: 'Toowoomba, QLD',
      contacts: [
        { label: 'Primary contact', detail: '0400 000 000' },
        { label: 'Guardian/nominee', detail: 'Jane Test, mother — 0400 111 111' },
      ],
      referrerIdentity: 'Dr. Referrer, GP, Sunshine Medical Centre',
      practitionerIdentity: 'Alex Practitioner, Behaviour Support Practitioner, reg #12345',
      providerDetails: 'Sunshine Behaviour Support Services, ABN 12 345 678 901',
      sourceSystem: 'pbs-registry',
      exportedAt: '2026-08-17T00:00:00.000Z',
      importedAt: null,
    })
  })

  it('accepts a payload exported before triage — no practitioner, no provider, no contacts', () => {
    const payload = validPayload({ practitioner: null, provider: null })
    delete payload.participant.contacts
    delete payload.participant.location
    const { profile } = parseParticipantImportPayload(payload)
    expect(profile.practitionerIdentity).toBeNull()
    expect(profile.providerDetails).toBeNull()
    expect(profile.location).toBeNull()
    expect(profile.contacts).toEqual([])
  })

  it('rejects a payload with the wrong schema tag', () => {
    expect(() => parseParticipantImportPayload(validPayload({ schema: 'something-else' }))).toThrow(
      /not a recognised participant profile import/,
    )
  })

  it('rejects a non-object payload', () => {
    expect(() => parseParticipantImportPayload('just a string')).toThrow(/missing the "root" section/)
    expect(() => parseParticipantImportPayload(null)).toThrow(/missing the "root" section/)
  })

  it('rejects a payload missing the participant section', () => {
    const payload = validPayload()
    // @ts-expect-error - exercising a malformed payload at runtime
    delete payload.participant
    expect(() => parseParticipantImportPayload(payload)).toThrow(/missing the "participant" section/)
  })

  it.each(['preferredName', 'legalName', 'dob', 'ndisNumber'] as const)(
    'rejects a payload missing the required participant.%s field',
    (field) => {
      const payload = validPayload()
      delete payload.participant[field]
      expect(() => parseParticipantImportPayload(payload)).toThrow(
        new RegExp(`required field "participant\\.${field}"`),
      )
    },
  )

  it('rejects a malformed dob', () => {
    const payload = validPayload()
    payload.participant.dob = '01/01/2005'
    expect(() => parseParticipantImportPayload(payload)).toThrow(/ISO date/)
  })

  it('rejects a payload missing the referrer section', () => {
    const payload = validPayload()
    // @ts-expect-error - exercising a malformed payload at runtime
    delete payload.referrer
    expect(() => parseParticipantImportPayload(payload)).toThrow(/missing the "referrer" section/)
  })

  it('rejects a contact row missing a required field', () => {
    const payload = validPayload()
    payload.participant.contacts = [{ label: 'Primary contact' } as never]
    expect(() => parseParticipantImportPayload(payload)).toThrow(
      /required field "participant\.contacts\[0\]\.detail"/,
    )
  })
})

describe('importParticipantProfile', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  function fileOf(payload: unknown): File {
    return new File([JSON.stringify(payload)], 'import.json', { type: 'application/json' })
  }

  it('creates a new participant populated from the import, stamped with an import timestamp', async () => {
    const id = await importParticipantProfile(fileOf(validPayload()), {
      consentAttested: true,
      practitionerName: 'Tester',
    })
    const participant = await db.participants.get(id)
    expect(participant?.identifyingDetails).toBe('Sam (Samuel Test)')
    expect(participant?.consentAttested).toBe(true)
    expect(participant?.consentAttestedBy).toBe('Tester')
    expect(participant?.profile?.ndisNumber).toBe('4300000000')
    expect(participant?.profile?.importedAt).not.toBeNull()
  })

  it('records no consent attestation when the practitioner does not attest it', async () => {
    const id = await importParticipantProfile(fileOf(validPayload()), {
      consentAttested: false,
      practitionerName: 'Tester',
    })
    const participant = await db.participants.get(id)
    expect(participant?.consentAttested).toBe(false)
    expect(participant?.consentAttestedAt).toBeNull()
    expect(participant?.consentAttestedBy).toBeNull()
  })

  it('rejects a file that is not valid JSON', async () => {
    const file = new File(['not json'], 'import.json', { type: 'application/json' })
    await expect(
      importParticipantProfile(file, { consentAttested: true, practitionerName: 'Tester' }),
    ).rejects.toThrow(/not valid JSON/)
  })

  it('rejects a well-formed JSON file with the wrong schema, without creating a participant', async () => {
    const file = fileOf({ schema: 'not-this-one' })
    await expect(
      importParticipantProfile(file, { consentAttested: true, practitionerName: 'Tester' }),
    ).rejects.toThrow(/not a recognised participant profile import/)
    expect(await db.participants.count()).toBe(0)
  })
})
