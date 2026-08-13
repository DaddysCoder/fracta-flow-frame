import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import {
  cancelReportInvite,
  createBehaviour,
  createParticipant,
  createReportInvite,
  importIncidentReport,
} from './actions'

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

function sampleReport(overrides: Partial<Parameters<typeof importIncidentReport>[0]> = {}) {
  return {
    token: '',
    dateTime: '2026-01-01T10:00:00.000Z',
    durationMinutes: 5,
    severityRating: 2 as const,
    frequencyContext: 1 as const,
    settingEvent: '',
    settingEventTags: [],
    antecedentText: 'Asked to line up',
    antecedentTags: [],
    consequenceText: 'Given attention',
    consequenceTags: ['Attention (staff/support worker) given or avoided'],
    riskFlags: [],
    ...overrides,
  }
}

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('report invite + import round trip (brief §4/§6, mirrors screenerInvite.test.ts)', () => {
  it('full round trip: generate invite, import report, lands against the correct behaviour with correct consequenceTag', async () => {
    const behaviourId = await setupBehaviour()
    const invite = await createReportInvite({ behaviourId, informantRole: 'support worker' })

    const outcome = await importIncidentReport(sampleReport({ token: invite.token }))

    expect(outcome.status).toBe('ok')
    if (outcome.status !== 'ok') throw new Error('unreachable')
    expect(outcome.behaviourId).toBe(behaviourId)

    const episode = await db.episodes.get(outcome.episodeId)
    expect(episode?.behaviourId).toBe(behaviourId)
    expect(episode?.loggedBy).toBe('support worker')
    expect(episode?.consequenceTag).toBe('attention')

    const updatedInvite = await db.reportInvites.get(invite.id)
    expect(updatedInvite?.status).toBe('completed')
  })

  it('scanning a token that matches no pending invite returns a clear not_found error', async () => {
    const outcome = await importIncidentReport(sampleReport({ token: 'does-not-exist' }))
    expect(outcome.status).toBe('not_found')
  })

  it('scanning the same response QR twice rejects the second scan as already_used, not a duplicate episode', async () => {
    const behaviourId = await setupBehaviour()
    const invite = await createReportInvite({ behaviourId, informantRole: 'parent' })

    const first = await importIncidentReport(sampleReport({ token: invite.token }))
    expect(first.status).toBe('ok')

    const second = await importIncidentReport(sampleReport({ token: invite.token }))
    expect(second.status).toBe('already_used')

    const episodes = await db.episodes.where('behaviourId').equals(behaviourId).toArray()
    expect(episodes).toHaveLength(1)
  })

  it('a cancelled invite is rejected with a distinct, clear status', async () => {
    const behaviourId = await setupBehaviour()
    const invite = await createReportInvite({ behaviourId, informantRole: 'sibling' })
    await cancelReportInvite(invite.id)

    const outcome = await importIncidentReport(sampleReport({ token: invite.token }))
    expect(outcome.status).toBe('cancelled')
  })

  it('two pending invites for the same behaviour track and import independently, no collision', async () => {
    const behaviourId = await setupBehaviour()
    const inviteA = await createReportInvite({ behaviourId, informantRole: 'support worker' })
    const inviteB = await createReportInvite({ behaviourId, informantRole: 'parent' })

    const outcomeA = await importIncidentReport(sampleReport({ token: inviteA.token }))
    const outcomeB = await importIncidentReport(sampleReport({ token: inviteB.token }))

    expect(outcomeA.status).toBe('ok')
    expect(outcomeB.status).toBe('ok')
    if (outcomeA.status !== 'ok' || outcomeB.status !== 'ok') throw new Error('unreachable')
    expect(outcomeA.episodeId).not.toBe(outcomeB.episodeId)

    const episodes = await db.episodes.where('behaviourId').equals(behaviourId).toArray()
    expect(episodes.map((e) => e.loggedBy).sort()).toEqual(['parent', 'support worker'])

    const invites = await db.reportInvites.where('behaviourId').equals(behaviourId).toArray()
    expect(invites.every((i) => i.status === 'completed')).toBe(true)
  })

  it('only pending invites can be cancelled', async () => {
    const behaviourId = await setupBehaviour()
    const invite = await createReportInvite({ behaviourId, informantRole: 'support worker' })
    await importIncidentReport(sampleReport({ token: invite.token }))
    await expect(cancelReportInvite(invite.id)).rejects.toThrow()
  })

  it('imported episode participates in the same risk-flag triggers as a manually-logged one (severity=3)', async () => {
    const behaviourId = await setupBehaviour()
    const invite = await createReportInvite({ behaviourId, informantRole: 'support worker' })

    await importIncidentReport(sampleReport({ token: invite.token, severityRating: 3 }))

    const flags = await db.riskFlags.where('behaviourId').equals(behaviourId).toArray()
    expect(flags.some((f) => f.triggerType === 'severity_threshold')).toBe(true)
  })
})
