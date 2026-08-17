import './testSetup'
import { validateFbaOutcomeBundle } from '@fracta/contract'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, newId } from './db'
import {
  createBehaviour,
  createEpisode,
  createParticipant,
  createScreener,
  generateFbaOutcomeBundleExport,
  recomputeHypothesis,
  setParticipantLinkId,
} from './actions'

beforeEach(async () => {
  for (const table of db.tables) await table.clear()
})

async function setupBehaviourWithHypothesis(): Promise<{ participantId: string; behaviourId: string }> {
  const participantId = await createParticipant({
    identifyingDetails: 'J.D.',
    consentAttested: true,
    practitionerName: 'Jo Practitioner',
  })
  const behaviourId = await createBehaviour({
    participantId,
    name: 'Hitting',
    operationalDefinition: 'Open palm contact with another person',
    createdBy: 'Jo Practitioner',
  })
  for (let i = 0; i < 3; i++) {
    await createEpisode({
      behaviourId,
      dateTime: new Date(2026, 0, i + 1).toISOString(),
      durationMinutes: null,
      severityRating: 1,
      frequencyContext: 1,
      settingEvent: 'poor sleep',
      antecedentText: 'asked to stop preferred activity',
      antecedentTag: 'demand',
      consequenceText: 'attention given',
      consequenceTag: 'attention',
      riskFlags: [],
      loggedBy: 'Jo Practitioner',
    })
  }
  await createScreener({
    behaviourId,
    informantId: 'local-practitioner',
    informantRole: 'OT',
    responses: [{ itemId: 'attn-1', domain: 'attention', answer: 'yes' }],
  })
  await recomputeHypothesis(behaviourId)
  return { participantId, behaviourId }
}

describe('generateFbaOutcomeBundleExport', () => {
  it('is blocked with a clear reason when the participant has no linkId', async () => {
    const { participantId, behaviourId } = await setupBehaviourWithHypothesis()
    const outcome = await generateFbaOutcomeBundleExport({
      participantId,
      behaviourIds: [behaviourId],
      generatedBy: 'Jo Practitioner, OT',
    })
    expect(outcome.status).toBe('blocked')
    if (outcome.status === 'blocked') expect(outcome.reason).toMatch(/linkId/)
    expect(await db.documentationExports.count()).toBe(0)
  })

  it('generates a valid, immutable bundle export once linked', async () => {
    const { participantId, behaviourId } = await setupBehaviourWithHypothesis()
    await setParticipantLinkId(participantId, 'link-xyz-789')

    const outcome = await generateFbaOutcomeBundleExport({
      participantId,
      behaviourIds: [behaviourId],
      generatedBy: 'Jo Practitioner, OT',
    })
    expect(outcome.status).toBe('ok')
    if (outcome.status !== 'ok') return

    const record = await db.documentationExports.get(outcome.exportId)
    expect(record?.format).toBe('fba_outcome_bundle')
    const bundle = JSON.parse(record!.contentSnapshot)
    expect(validateFbaOutcomeBundle(bundle).ok).toBe(true)
    expect(bundle.linkId).toBe('link-xyz-789')
    expect(bundle.outcomes).toHaveLength(1)

    // Immutable snapshot: later changes to the underlying episode data must
    // not retroactively change an already-generated export.
    await createEpisode({
      behaviourId,
      dateTime: new Date(2026, 1, 1).toISOString(),
      durationMinutes: null,
      severityRating: 3,
      frequencyContext: 1,
      settingEvent: 'a brand new setting event',
      antecedentText: 'a brand new antecedent',
      antecedentTag: 'demand',
      consequenceText: 'a brand new consequence',
      consequenceTag: 'escape',
      riskFlags: [],
      loggedBy: 'Jo Practitioner',
    })
    const stillFrozen = await db.documentationExports.get(outcome.exportId)
    expect(stillFrozen?.contentSnapshot).toBe(record!.contentSnapshot)
  })

  it('is blocked when the participant is unknown', async () => {
    await expect(
      generateFbaOutcomeBundleExport({
        participantId: newId(),
        behaviourIds: [],
        generatedBy: 'Jo Practitioner, OT',
      }),
    ).rejects.toThrow('Participant not found')
  })
})
