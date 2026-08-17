import './testSetup'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, newId } from './db'
import { setPractitionerConfidence } from './actions'

beforeEach(async () => {
  for (const table of db.tables) await table.clear()
})

async function seedHypothesis() {
  const id = newId()
  await db.hypotheses.add({
    id,
    behaviourId: 'b1',
    computedAt: new Date().toISOString(),
    screenerFunctionResult: ['escape'],
    episodePatternResult: 'escape',
    episodeCount: 5,
    distinctDayCount: 5,
    agreementStatus: 'match',
    confidenceLevel: 'high',
    screenerDisagreement: false,
    contributingEpisodeIds: [],
    contributingScreenerIds: [],
    practitionerConfidence: null,
  })
  return id
}

describe('practitioner subjective confidence', () => {
  it('is null by default on a newly computed hypothesis', async () => {
    const id = await seedHypothesis()
    const hypothesis = await db.hypotheses.get(id)
    expect(hypothesis?.practitionerConfidence).toBeNull()
  })

  it('can be set to 1-6 without changing the computed confidenceLevel', async () => {
    const id = await seedHypothesis()
    await setPractitionerConfidence(id, 2)
    const hypothesis = await db.hypotheses.get(id)
    expect(hypothesis?.practitionerConfidence).toBe(2)
    // Computed tier is untouched by the practitioner's own rating.
    expect(hypothesis?.confidenceLevel).toBe('high')
  })

  it('can be cleared back to null', async () => {
    const id = await seedHypothesis()
    await setPractitionerConfidence(id, 5)
    await setPractitionerConfidence(id, null)
    const hypothesis = await db.hypotheses.get(id)
    expect(hypothesis?.practitionerConfidence).toBeNull()
  })

  it('throws for an unknown hypothesis id', async () => {
    await expect(setPractitionerConfidence('does-not-exist', 3)).rejects.toThrow('Hypothesis not found')
  })

  it('hypothesis.ts (the Phase 2 confidence calculation) never references practitionerConfidence', () => {
    // computeHypothesis's HypothesisComputation type doesn't even carry this
    // field — practitionerConfidence is only ever set afterwards via
    // setPractitionerConfidence — but this asserts it at the source level
    // too, so the constraint holds even if the type shape changes later.
    const source = readFileSync(join(process.cwd(), 'src/lib/hypothesis.ts'), 'utf-8')
    expect(source).not.toMatch(/practitionerConfidence/)
  })
})
