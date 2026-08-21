import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import {
  cancelFieldInvite,
  createBehaviour,
  createParticipant,
  createFieldInvite,
  importFieldCapture,
} from './actions'
import { encodeFieldCapture, parseFieldCapture } from './fieldPayload'
import type { FieldEpisodeFields } from './fieldPayload'

function sampleEpisode(): FieldEpisodeFields {
  return {
    dateTime: '2026-08-22T03:00:00.000Z',
    durationMinutes: 4,
    severityRating: 2,
    frequencyContext: 3,
    settingEvent: 'Transition from playground',
    antecedentText: 'Asked to line up',
    antecedentTag: 'demand',
    consequenceText: 'Demand dropped',
    consequenceTag: 'escape',
    riskFlags: [],
  }
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
    createdBy: 'Tester',
  })
}

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('Field capture handshake', () => {
  it('round-trips encode/decode', () => {
    const raw = encodeFieldCapture({ token: 'abc123', captureId: 'cap1', episode: sampleEpisode() })
    const decoded = parseFieldCapture(JSON.parse(raw))
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.token).toBe('abc123')
    expect(decoded.episode.consequenceTag).toBe('escape')
  })

  it('rejects a Vector instrument as the wrong product', () => {
    const result = parseFieldCapture({ format: 'whatbit-vector-instrument-v1', product: 'vector' })
    expect(result.ok).toBe(false)
  })

  it('imports onto the invite behaviour and keeps the invite open for a second capture', async () => {
    const behaviourId = await setupBehaviour()
    const invite = await createFieldInvite({ behaviourId, informantRole: 'support worker' })

    const first = await importFieldCapture({ token: invite.token, captureId: 'cap-a', episode: sampleEpisode() })
    expect(first.status).toBe('ok')
    if (first.status !== 'ok') return
    expect(first.behaviourId).toBe(behaviourId)

    const second = await importFieldCapture({
      token: invite.token,
      captureId: 'cap-b',
      episode: { ...sampleEpisode(), antecedentText: 'Second episode' },
    })
    expect(second.status).toBe('ok')

    const episodes = await db.episodes.where('behaviourId').equals(behaviourId).toArray()
    expect(episodes).toHaveLength(2)
    expect(episodes.every((e) => e.captureSource === 'field')).toBe(true)

    const stored = await db.fieldInvites.get(invite.id)
    expect(stored?.status).toBe('pending')
    expect(stored?.importedCaptureIds).toEqual(['cap-a', 'cap-b'])
  })

  it('rejects a duplicate capture id', async () => {
    const behaviourId = await setupBehaviour()
    const invite = await createFieldInvite({ behaviourId, informantRole: 'parent' })
    await importFieldCapture({ token: invite.token, captureId: 'same', episode: sampleEpisode() })
    const again = await importFieldCapture({ token: invite.token, captureId: 'same', episode: sampleEpisode() })
    expect(again.status).toBe('already_used')
    const episodes = await db.episodes.where('behaviourId').equals(behaviourId).toArray()
    expect(episodes).toHaveLength(1)
  })

  it('rejects a cancelled invite', async () => {
    const behaviourId = await setupBehaviour()
    const invite = await createFieldInvite({ behaviourId, informantRole: 'parent' })
    await cancelFieldInvite(invite.id)
    const outcome = await importFieldCapture({ token: invite.token, captureId: 'x', episode: sampleEpisode() })
    expect(outcome.status).toBe('cancelled')
  })
})
