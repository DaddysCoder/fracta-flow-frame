import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { addBehaviourChecklistItem, createBehaviour, createParticipant } from './actions'
import { baseChecklistItems } from './checklists'
import { ANTECEDENT_ITEMS, CONSEQUENCE_ITEMS, SETTING_EVENT_ITEMS } from './scales'

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

describe('checklist union (Phase 1.2 §3, re-confirmed Phase 1.4 §3/§5)', () => {
  it('a behaviour with no custom items offers exactly the base FACTS-sourced list', () => {
    expect(baseChecklistItems('settingEvent')).toEqual([...SETTING_EVENT_ITEMS])
    expect(baseChecklistItems('antecedent')).toEqual([...ANTECEDENT_ITEMS])
    expect(baseChecklistItems('consequence')).toEqual(CONSEQUENCE_ITEMS.map((c) => c.label))
  })

  it('a custom item added while logging a real episode persists for that behaviour and is offered next time', async () => {
    const behaviourId = await setupBehaviour()
    await addBehaviourChecklistItem({ behaviourId, field: 'antecedent', label: 'Loud noise nearby' })

    const custom = await db.behaviourChecklistItems
      .where('behaviourId')
      .equals(behaviourId)
      .and((c) => c.field === 'antecedent')
      .toArray()
    expect(custom.map((c) => c.label)).toEqual(['Loud noise nearby'])

    // The union a consumer of useBehaviourChecklistItems would see: base +
    // anything custom not already in the base list.
    const base = baseChecklistItems('antecedent')
    const union = [...base, ...custom.map((c) => c.label).filter((l) => !base.includes(l))]
    expect(union).toContain('Loud noise nearby')
    expect(union.length).toBe(base.length + 1)
  })

  it('adding the same custom item twice does not duplicate it', async () => {
    const behaviourId = await setupBehaviour()
    await addBehaviourChecklistItem({ behaviourId, field: 'settingEvent', label: 'New support worker' })
    await addBehaviourChecklistItem({ behaviourId, field: 'settingEvent', label: 'New support worker' })

    const custom = await db.behaviourChecklistItems
      .where('behaviourId')
      .equals(behaviourId)
      .and((c) => c.field === 'settingEvent')
      .toArray()
    expect(custom).toHaveLength(1)
  })

  it('custom items are scoped per behaviour, not global', async () => {
    const behaviourA = await setupBehaviour()
    const behaviourB = await setupBehaviour()
    await addBehaviourChecklistItem({ behaviourId: behaviourA, field: 'antecedent', label: 'Only for A' })

    const forA = await db.behaviourChecklistItems.where('behaviourId').equals(behaviourA).toArray()
    const forB = await db.behaviourChecklistItems.where('behaviourId').equals(behaviourB).toArray()
    expect(forA.map((c) => c.label)).toEqual(['Only for A'])
    expect(forB).toHaveLength(0)
  })
})
