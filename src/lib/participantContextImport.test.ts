import './testSetup'
import { CONTRACT_VERSION, type ParticipantContext } from '@fracta/contract'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { importParticipantContext } from './actions'

beforeEach(async () => {
  for (const table of db.tables) await table.clear()
})

function context(overrides: Partial<ParticipantContext> = {}): ParticipantContext {
  return {
    contractVersion: CONTRACT_VERSION,
    linkId: 'link-abc-123',
    displayLabel: 'J.D.',
    planCycle: { planType: 'full', planStartDate: '2026-03-01', validityMonths: 12, expiresAt: '2027-03-01' },
    knownBehaviourLabels: ['Hitting', 'Elopement'],
    consentAttested: true,
    consentAttestedAt: '2026-03-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('importParticipantContext', () => {
  it('rejects invalid JSON', async () => {
    const outcome = await importParticipantContext('not json', 'Jo')
    expect(outcome.status).toBe('error')
  })

  it('rejects a payload that fails contract validation', async () => {
    const outcome = await importParticipantContext(JSON.stringify({ contractVersion: '2.0' }), 'Jo')
    expect(outcome.status).toBe('error')
    if (outcome.status === 'error') expect(outcome.reason).toMatch(/contractVersion/)
  })

  it('creates a new participant using displayLabel, never identifying details', async () => {
    const outcome = await importParticipantContext(JSON.stringify(context()), 'Jo Practitioner')
    expect(outcome.status).toBe('ok')
    if (outcome.status !== 'ok') return
    expect(outcome.wasUpdate).toBe(false)

    const participant = await db.participants.get(outcome.participantId)
    expect(participant?.identifyingDetails).toBe('J.D.')
    expect(participant?.linkId).toBe('link-abc-123')
    expect(participant?.planCycle?.expiresAt).toBe('2027-03-01')
    expect(participant?.knownBehaviourLabels).toEqual(['Hitting', 'Elopement'])
    expect(participant?.consentAttestedBy).toBe('Jo Practitioner')
  })

  it('does not auto-create behaviours from knownBehaviourLabels', async () => {
    const outcome = await importParticipantContext(JSON.stringify(context()), 'Jo')
    expect(outcome.status).toBe('ok')
    expect(await db.behaviours.count()).toBe(0)
  })

  it('updates the existing participant in place on a re-import with the same linkId', async () => {
    const first = await importParticipantContext(JSON.stringify(context()), 'Jo')
    expect(first.status).toBe('ok')
    if (first.status !== 'ok') return

    const second = await importParticipantContext(
      JSON.stringify(
        context({ planCycle: { planType: 'interim', planStartDate: '2026-06-01', validityMonths: 5, expiresAt: '2026-11-01' } }),
      ),
      'Jo',
    )
    expect(second.status).toBe('ok')
    if (second.status !== 'ok') return
    expect(second.wasUpdate).toBe(true)
    expect(second.participantId).toBe(first.participantId)

    expect(await db.participants.count()).toBe(1)
    const participant = await db.participants.get(first.participantId)
    expect(participant?.planCycle?.planType).toBe('interim')
  })
})
