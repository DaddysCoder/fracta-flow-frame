import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { createBehaviour, createParticipant, createScreener, importVectorInstrumentJson } from './actions'
import { exampleVectorInstrument, parseVectorInstrument } from './vectorInstrument'

describe('Vector instrument handshake', () => {
  it('accepts the example payload and interleaves domains', () => {
    const parsed = parseVectorInstrument(exampleVectorInstrument())
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.payload.instrument.items).toHaveLength(8)
  })

  it('rejects Frame backup files and grouped-only junk', () => {
    expect(parseVectorInstrument({ format: 'fba-screener-backup-v1' }).ok).toBe(false)
    expect(
      parseVectorInstrument({
        format: 'whatbit-vector-instrument-v1',
        product: 'vector',
        instrument: {
          id: 'x',
          name: 'Only attention',
          version: 1,
          kind: 'function_screener',
          items: [
            { id: 'a1', domain: 'attention', prompt: 'One' },
            { id: 'a2', domain: 'attention', prompt: 'Two' },
            { id: 'a3', domain: 'attention', prompt: 'Three' },
            { id: 'a4', domain: 'attention', prompt: 'Four' },
          ],
        },
      }).ok,
    ).toBe(false)
  })
})

describe('import Vector instrument into Frame', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('stores the instrument and can save a completion against a behaviour', async () => {
    const imported = await importVectorInstrumentJson(JSON.stringify(exampleVectorInstrument()))
    expect(imported.name).toBe('Example Vector function screener')
    const stored = await db.vectorInstruments.get(imported.id)
    expect(stored?.sourceId).toBe('vector-example-function-screener')

    const participantId = await createParticipant({
      identifyingDetails: 'P',
      consentAttested: true,
      practitionerName: 'T',
    })
    const behaviourId = await createBehaviour({
      participantId,
      name: 'B',
      operationalDefinition: 'Def',
      createdBy: 'T',
    })
    await createScreener({
      behaviourId,
      informantId: 'local-practitioner',
      informantRole: 'practitioner',
      responses: stored!.items.map((item) => ({ itemId: item.id, domain: item.domain, answer: 'yes' })),
      instrumentSource: 'vector',
      instrumentName: stored!.name,
      vectorInstrumentId: stored!.id,
    })
    const screeners = await db.screeners.where('behaviourId').equals(behaviourId).toArray()
    expect(screeners[0].instrumentSource).toBe('vector')
    expect(screeners[0].domainScores.attention).toBe(2)
  })
})
