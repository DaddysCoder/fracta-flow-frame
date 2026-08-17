import './testSetup'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { db, newId } from './db'
import { createFormulation } from './actions'
import { emptyEscalationCycle } from './escalationContent'
import { emptyChecklistEntry } from './abcOptions'

describe('formulation as a collection', () => {
  it('adds multiple formulation records for the same behaviour without overwriting', async () => {
    const behaviourId = newId()

    await createFormulation({
      behaviourId,
      informantName: 'Support worker A',
      informantRole: 'support worker',
      conductedBy: 'Jo Practitioner',
      descriptionPrompts: { recentExample: '', intenseEpisode: '', antecedentAndResponse: '' },
      onset: 'Started ~6 months ago',
      frequencyImpression: 'A few times a week',
      riskScenarios: { highRisk: '', lowRisk: '' },
      escalationCycle: emptyEscalationCycle(),
      antecedentContext: emptyChecklistEntry(),
      consequenceContext: emptyChecklistEntry(),
      settingEvents: emptyChecklistEntry(),
    })
    await createFormulation({
      behaviourId,
      informantName: 'Parent',
      informantRole: 'parent',
      conductedBy: 'Jo Practitioner',
      descriptionPrompts: { recentExample: '', intenseEpisode: '', antecedentAndResponse: '' },
      onset: 'Since starting school',
      frequencyImpression: 'Daily',
      riskScenarios: { highRisk: '', lowRisk: '' },
      escalationCycle: emptyEscalationCycle(),
      antecedentContext: emptyChecklistEntry(),
      consequenceContext: emptyChecklistEntry(),
      settingEvents: emptyChecklistEntry(),
    })

    const formulations = await db.formulations.where('behaviourId').equals(behaviourId).toArray()
    expect(formulations).toHaveLength(2)
    expect(new Set(formulations.map((f) => f.informantName))).toEqual(new Set(['Support worker A', 'Parent']))
  })

  it('frequencyImpression is referenced nowhere in the Phase 2 confidence calculation', () => {
    // hypothesis.ts computes confidence purely from logged episodes/screeners
    // (episodeCount, distinctDayCount) — a formulation's interview-stage
    // impression must never leak into that calculation. Asserted at the
    // source level since there is no runtime call path to exercise: the
    // confidence calc simply must never import or reference the field.
    const source = readFileSync(join(process.cwd(), 'src/lib/hypothesis.ts'), 'utf-8')
    expect(source).not.toMatch(/frequencyImpression/)
  })
})
