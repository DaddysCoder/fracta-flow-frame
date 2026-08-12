import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import {
  cancelScreenerInvite,
  createBehaviour,
  createParticipant,
  createScreenerInvite,
  importScreenerResponse,
} from './actions'
import { SCREENER_ITEMS } from './screener'
import type { ScreenerResponse } from './types'

function fullYesResponses(): ScreenerResponse[] {
  return SCREENER_ITEMS.map((item) => ({ itemId: item.id, domain: item.domain, answer: 'yes' as const }))
}

async function setupBehaviour(): Promise<string> {
  const participantId = await createParticipant({
    identifyingDetails: 'Test participant',
    consentAttested: true,
    practitionerName: 'Tester',
  })
  return createBehaviour({
    participantId,
    name: 'Test behaviour',
    operationalDefinition: 'Observable definition',
    concernCategories: [],
    createdBy: 'Tester',
  })
}

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('screener invite + import round trip (brief §6)', () => {
  it('full round trip: generate invite, import response, lands against the correct behaviour with role attribution', async () => {
    const behaviourId = await setupBehaviour()
    const invite = await createScreenerInvite({ behaviourId, informantRole: 'support worker' })

    const outcome = await importScreenerResponse({
      token: invite.token,
      responses: fullYesResponses(),
      completedAt: new Date().toISOString(),
    })

    expect(outcome.status).toBe('ok')
    if (outcome.status !== 'ok') throw new Error('unreachable')
    expect(outcome.behaviourId).toBe(behaviourId)

    const screener = await db.screeners.get(outcome.screenerId)
    expect(screener?.behaviourId).toBe(behaviourId)
    expect(screener?.informantRole).toBe('support worker')

    const updatedInvite = await db.screenerInvites.get(invite.id)
    expect(updatedInvite?.status).toBe('completed')
  })

  it('scanning a token that matches no pending invite returns a clear not_found error', async () => {
    const outcome = await importScreenerResponse({
      token: 'does-not-exist',
      responses: fullYesResponses(),
      completedAt: new Date().toISOString(),
    })
    expect(outcome.status).toBe('not_found')
  })

  it('scanning the same response QR twice rejects the second scan as already_used', async () => {
    const behaviourId = await setupBehaviour()
    const invite = await createScreenerInvite({ behaviourId, informantRole: 'parent' })

    const first = await importScreenerResponse({
      token: invite.token,
      responses: fullYesResponses(),
      completedAt: new Date().toISOString(),
    })
    expect(first.status).toBe('ok')

    const second = await importScreenerResponse({
      token: invite.token,
      responses: fullYesResponses(),
      completedAt: new Date().toISOString(),
    })
    expect(second.status).toBe('already_used')

    // Only one FunctionScreener record was created, not two.
    const screeners = await db.screeners.where('behaviourId').equals(behaviourId).toArray()
    expect(screeners).toHaveLength(1)
  })

  it('a cancelled invite is rejected with a distinct, clear status', async () => {
    const behaviourId = await setupBehaviour()
    const invite = await createScreenerInvite({ behaviourId, informantRole: 'sibling' })
    await cancelScreenerInvite(invite.id)

    const outcome = await importScreenerResponse({
      token: invite.token,
      responses: fullYesResponses(),
      completedAt: new Date().toISOString(),
    })
    expect(outcome.status).toBe('cancelled')
  })

  it('two pending invites for the same behaviour track and import independently, no collision', async () => {
    const behaviourId = await setupBehaviour()
    const inviteA = await createScreenerInvite({ behaviourId, informantRole: 'support worker' })
    const inviteB = await createScreenerInvite({ behaviourId, informantRole: 'parent' })

    const outcomeA = await importScreenerResponse({
      token: inviteA.token,
      responses: fullYesResponses(),
      completedAt: new Date().toISOString(),
    })
    const outcomeB = await importScreenerResponse({
      token: inviteB.token,
      responses: fullYesResponses(),
      completedAt: new Date().toISOString(),
    })

    expect(outcomeA.status).toBe('ok')
    expect(outcomeB.status).toBe('ok')
    if (outcomeA.status !== 'ok' || outcomeB.status !== 'ok') throw new Error('unreachable')
    expect(outcomeA.screenerId).not.toBe(outcomeB.screenerId)

    const screeners = await db.screeners.where('behaviourId').equals(behaviourId).toArray()
    expect(screeners.map((s) => s.informantRole).sort()).toEqual(['parent', 'support worker'])

    const invites = await db.screenerInvites.where('behaviourId').equals(behaviourId).toArray()
    expect(invites.every((i) => i.status === 'completed')).toBe(true)
  })

  it('only pending invites can be cancelled', async () => {
    const behaviourId = await setupBehaviour()
    const invite = await createScreenerInvite({ behaviourId, informantRole: 'support worker' })
    await importScreenerResponse({
      token: invite.token,
      responses: fullYesResponses(),
      completedAt: new Date().toISOString(),
    })
    await expect(cancelScreenerInvite(invite.id)).rejects.toThrow()
  })
})
