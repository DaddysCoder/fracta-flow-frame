import { beforeEach, describe, expect, it } from 'vitest'
import {
  currentLegalAcceptance,
  hasAcceptedCurrentLegal,
  LEGAL_VERSION,
} from './legal'
import { db } from './db'
import { acknowledgeDisclaimer, saveProfile, practitionerGateComplete, LOCAL_PRACTITIONER_ID } from './practitioner'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('legal version acceptance', () => {
  it('requires all four fields at the current version', () => {
    expect(hasAcceptedCurrentLegal(currentLegalAcceptance())).toBe(true)
    expect(
      hasAcceptedCurrentLegal({
        ...currentLegalAcceptance(),
        termsVersion: '2020-01-01',
      }),
    ).toBe(false)
    expect(
      hasAcceptedCurrentLegal({
        termsAcceptedAt: new Date().toISOString(),
        termsVersion: LEGAL_VERSION,
        privacyAcknowledgedAt: null,
        privacyVersion: LEGAL_VERSION,
      }),
    ).toBe(false)
  })

  it('existing disclaimer-only users must pass the gate again', async () => {
    await db.practitioners.put({
      id: LOCAL_PRACTITIONER_ID,
      name: 'Jordan Lee',
      role: 'Behaviour Support Practitioner',
      disclaimerAcknowledgedAt: '2025-01-01T00:00:00.000Z',
      termsAcceptedAt: null,
      termsVersion: null,
      privacyAcknowledgedAt: null,
      privacyVersion: null,
    })

    const practitioner = await db.practitioners.get(LOCAL_PRACTITIONER_ID)
    expect(practitionerGateComplete(practitioner)).toBe(false)
  })

  it('acknowledgeDisclaimer records current terms and privacy versions', async () => {
    await saveProfile('Jordan Lee', 'Behaviour Support Practitioner')
    await acknowledgeDisclaimer()

    const practitioner = await db.practitioners.get(LOCAL_PRACTITIONER_ID)
    expect(practitioner?.termsVersion).toBe(LEGAL_VERSION)
    expect(practitioner?.privacyVersion).toBe(LEGAL_VERSION)
    expect(practitioner?.termsAcceptedAt).toBeTruthy()
    expect(practitioner?.privacyAcknowledgedAt).toBeTruthy()
    expect(practitionerGateComplete(practitioner)).toBe(true)
  })

  it('outdated legal version requires re-acceptance', async () => {
    await db.practitioners.put({
      id: LOCAL_PRACTITIONER_ID,
      name: 'Jordan Lee',
      role: 'Behaviour Support Practitioner',
      disclaimerAcknowledgedAt: '2025-01-01T00:00:00.000Z',
      termsAcceptedAt: '2025-01-01T00:00:00.000Z',
      termsVersion: '2025-01-01',
      privacyAcknowledgedAt: '2025-01-01T00:00:00.000Z',
      privacyVersion: '2025-01-01',
    })

    const practitioner = await db.practitioners.get(LOCAL_PRACTITIONER_ID)
    expect(practitionerGateComplete(practitioner)).toBe(false)
  })
})

describe('demo data guard', () => {
  it('does not seed outside development builds', async () => {
    const { seedDemoDataIfEmpty } = await import('./demoData')
    await seedDemoDataIfEmpty()
    expect(await db.participants.count()).toBe(0)
  })
})
