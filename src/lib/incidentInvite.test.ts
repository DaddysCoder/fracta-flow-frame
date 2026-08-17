import './testSetup'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, newId } from './db'
import {
  cancelIncidentInvite,
  createBehaviour,
  createIncidentInvite,
  createParticipant,
  importIncidentReport,
} from './actions'

beforeEach(async () => {
  for (const table of db.tables) await table.clear()
})

async function setupBehaviour(): Promise<string> {
  const participantId = await createParticipant({
    identifyingDetails: 'Test participant',
    consentAttested: true,
    practitionerName: 'Tester',
  })
  return createBehaviour({
    participantId,
    name: 'Test behaviour',
    operationalDefinition: 'x',
    createdBy: 'Tester',
  })
}

const reportInput = {
  dateTime: '2026-08-17T10:00:00.000Z',
  durationMinutes: 5,
  severityRating: 2 as const,
  settingEvent: 'poor sleep',
  antecedentText: 'asked to stop a preferred activity',
  consequenceText: 'attention given',
  riskFlags: [] as const,
}

describe('incident invite handoff', () => {
  it('imports a report against the correct behaviour, unclassified, and flags the invite completed', async () => {
    const behaviourId = await setupBehaviour()
    const invite = await createIncidentInvite({ behaviourId, informantRole: 'support worker' })

    const outcome = await importIncidentReport({ token: invite.token, ...reportInput, riskFlags: [...reportInput.riskFlags] })
    expect(outcome.status).toBe('ok')
    if (outcome.status !== 'ok') return
    expect(outcome.behaviourId).toBe(behaviourId)

    const episode = await db.episodes.get(outcome.episodeId)
    expect(episode?.antecedentTag).toBe('unknown')
    expect(episode?.consequenceTag).toBe('none_observed')
    expect(episode?.loggedBy).toBe('support worker (via QR handoff)')

    const storedInvite = await db.incidentInvites.get(invite.id)
    expect(storedInvite?.status).toBe('completed')
  })

  it('rejects a second import against the same (now-completed) token', async () => {
    const behaviourId = await setupBehaviour()
    const invite = await createIncidentInvite({ behaviourId, informantRole: 'support worker' })
    await importIncidentReport({ token: invite.token, ...reportInput, riskFlags: [...reportInput.riskFlags] })

    const second = await importIncidentReport({ token: invite.token, ...reportInput, riskFlags: [...reportInput.riskFlags] })
    expect(second.status).toBe('already_used')
    expect(await db.episodes.count()).toBe(1)
  })

  it('rejects import against an unknown token', async () => {
    const outcome = await importIncidentReport({ token: newId(), ...reportInput, riskFlags: [...reportInput.riskFlags] })
    expect(outcome.status).toBe('not_found')
  })

  it('rejects import against a cancelled invite', async () => {
    const behaviourId = await setupBehaviour()
    const invite = await createIncidentInvite({ behaviourId, informantRole: 'support worker' })
    await cancelIncidentInvite(invite.id)

    const outcome = await importIncidentReport({ token: invite.token, ...reportInput, riskFlags: [...reportInput.riskFlags] })
    expect(outcome.status).toBe('cancelled')
  })

  it('does not confuse incident invites with screener invites sharing the same token space', async () => {
    const behaviourId = await setupBehaviour()
    const invite = await createIncidentInvite({ behaviourId, informantRole: 'support worker' })
    // A screener-invite lookup for the same token must not find anything —
    // they're separate tables by design.
    const asScreenerInvite = await db.screenerInvites.where('token').equals(invite.token).first()
    expect(asScreenerInvite).toBeUndefined()
  })
})
