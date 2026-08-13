import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { createBehaviour, createFormulation, createParticipant } from './actions'
import { emptyEscalationCycle } from './scales'

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

describe('createFormulation (Phase 1.4 §2 — informantName/informantRole)', () => {
  it('persists informantName and informantRole when provided', async () => {
    const behaviourId = await setupBehaviour()
    const id = await createFormulation({
      behaviourId,
      informantName: 'Jordan Lee',
      informantRole: 'support worker',
      conductedBy: 'Tester',
      descriptionRecentExample: '',
      descriptionIntenseEpisode: '',
      descriptionAntecedentAndResponse: '',
      onset: '',
      frequencyImpression: '',
      riskScenarioHigh: '',
      riskScenarioLow: '',
      escalationCycle: emptyEscalationCycle(),
    })
    const record = await db.formulations.get(id)
    expect(record?.informantName).toBe('Jordan Lee')
    expect(record?.informantRole).toBe('support worker')
  })

  it('stores null (not empty string) when informant details are omitted', async () => {
    const behaviourId = await setupBehaviour()
    const id = await createFormulation({
      behaviourId,
      conductedBy: 'Tester',
      descriptionRecentExample: '',
      descriptionIntenseEpisode: '',
      descriptionAntecedentAndResponse: '',
      onset: '',
      frequencyImpression: '',
      riskScenarioHigh: '',
      riskScenarioLow: '',
      escalationCycle: emptyEscalationCycle(),
    })
    const record = await db.formulations.get(id)
    expect(record?.informantName).toBeNull()
    expect(record?.informantRole).toBeNull()
  })

  it('supports multiple formulation records for the same behaviour, each with its own escalation cycle', async () => {
    const behaviourId = await setupBehaviour()
    const first = await createFormulation({
      behaviourId,
      conductedBy: 'Tester',
      descriptionRecentExample: '',
      descriptionIntenseEpisode: '',
      descriptionAntecedentAndResponse: '',
      onset: '',
      frequencyImpression: '',
      riskScenarioHigh: '',
      riskScenarioLow: '',
      escalationCycle: { ...emptyEscalationCycle(), baseline: { checkedItems: ['Calm'], customItems: [] } },
    })
    const second = await createFormulation({
      behaviourId,
      conductedBy: 'Tester',
      descriptionRecentExample: '',
      descriptionIntenseEpisode: '',
      descriptionAntecedentAndResponse: '',
      onset: '',
      frequencyImpression: '',
      riskScenarioHigh: '',
      riskScenarioLow: '',
      escalationCycle: { ...emptyEscalationCycle(), peak_crisis: { checkedItems: ['Kicking'], customItems: [] } },
    })

    const records = await db.formulations.where('behaviourId').equals(behaviourId).toArray()
    expect(records).toHaveLength(2)
    const firstRecord = records.find((r) => r.id === first)
    const secondRecord = records.find((r) => r.id === second)
    expect(firstRecord?.escalationCycle.baseline.checkedItems).toEqual(['Calm'])
    expect(secondRecord?.escalationCycle.peak_crisis.checkedItems).toEqual(['Kicking'])
  })
})
