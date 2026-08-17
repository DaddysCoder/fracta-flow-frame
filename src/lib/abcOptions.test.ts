import './testSetup'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, newId } from './db'
import { createFormulation } from './actions'
import { emptyEscalationCycle } from './escalationContent'
import { ANTECEDENT_CONTEXT_OPTIONS, CONSEQUENCE_OPTIONS, SETTING_EVENT_OPTIONS } from './fbaContent'
import { addCustomAbcOption, dedupeOptions, emptyChecklistEntry, getAbcOptions, mergeAbcOptions } from './abcOptions'

beforeEach(async () => {
  for (const table of db.tables) await table.clear()
})

describe('dedupeOptions', () => {
  it('dedupes on trimmed, case-folded text, keeping first occurrence wording', () => {
    expect(dedupeOptions(['Pacing', ' pacing ', 'PACING', 'Withdrawing'])).toEqual(['Pacing', 'Withdrawing'])
  })

  it('drops empty/whitespace-only entries', () => {
    expect(dedupeOptions(['Pacing', '', '   '])).toEqual(['Pacing'])
  })
})

describe('mergeAbcOptions (pure)', () => {
  it('falls back to the generic list when there are zero formulations', () => {
    const result = mergeAbcOptions('antecedent', [], [])
    expect(result).toEqual(ANTECEDENT_CONTEXT_OPTIONS.map((o) => o.label))
  })

  it('unions checked + custom items across two formulations, not the generic list', () => {
    const behaviourId = newId()
    const base = () => ({
      id: newId(),
      behaviourId,
      informantName: '',
      informantRole: '',
      conductedBy: '',
      conductedAt: new Date().toISOString(),
      descriptionPrompts: { recentExample: '', intenseEpisode: '', antecedentAndResponse: '' },
      onset: '',
      frequencyImpression: '',
      riskScenarios: { highRisk: '', lowRisk: '' },
      escalationCycle: emptyEscalationCycle(),
      antecedentContext: emptyChecklistEntry(),
      consequenceContext: emptyChecklistEntry(),
      settingEvents: emptyChecklistEntry(),
    })

    const f1 = base()
    f1.antecedentContext = { checkedItems: ['antecedent-given-instruction'], customItems: ['loud noises'] }
    const f2 = base()
    f2.antecedentContext = { checkedItems: ['antecedent-transition'], customItems: ['loud noises'] } // duplicate custom item

    const result = mergeAbcOptions('antecedent', [f1, f2], [])
    expect(result).toEqual(['Given an instruction or demand', 'loud noises', 'Transition between activities or settings'])
    // Generic-only options should not appear unprompted once formulations exist.
    expect(result).not.toContain('Alone (no attention or activity available)')
  })

  it('includes write-back items alongside the formulation-derived (or fallback) list', () => {
    const result = mergeAbcOptions('consequence', [], ['practitioner redirected to preferred activity'])
    expect(result).toEqual([
      ...CONSEQUENCE_OPTIONS.map((o) => o.label),
      'practitioner redirected to preferred activity',
    ])
  })
})

describe('getAbcOptions / addCustomAbcOption (DB-backed)', () => {
  it('falls back to generic setting-event options with zero formulations', async () => {
    const behaviourId = newId()
    const options = await getAbcOptions(behaviourId)
    expect(options.settingEvent).toEqual(SETTING_EVENT_OPTIONS.map((o) => o.label))
  })

  it('write-back persists and appears on the next call, without duplicating on repeat writes', async () => {
    const behaviourId = newId()
    await addCustomAbcOption(behaviourId, 'antecedent', 'told to stop a preferred activity')

    const first = await getAbcOptions(behaviourId)
    expect(first.antecedent).toContain('told to stop a preferred activity')

    // Re-adding the same (normalised) text should not create a duplicate.
    await addCustomAbcOption(behaviourId, 'antecedent', '  Told to stop a preferred activity  ')
    const second = await getAbcOptions(behaviourId)
    expect(second.antecedent.filter((o) => o.toLowerCase() === 'told to stop a preferred activity')).toHaveLength(1)
  })

  it('reflects a real formulation through the full getAbcOptions path', async () => {
    const behaviourId = newId()
    await createFormulation({
      behaviourId,
      informantName: 'Support worker',
      informantRole: 'support worker',
      conductedBy: 'Jo',
      descriptionPrompts: { recentExample: '', intenseEpisode: '', antecedentAndResponse: '' },
      onset: '',
      frequencyImpression: '',
      riskScenarios: { highRisk: '', lowRisk: '' },
      escalationCycle: emptyEscalationCycle(),
      antecedentContext: emptyChecklistEntry(),
      consequenceContext: { checkedItems: ['consequence-adult-attention-given'], customItems: [] },
      settingEvents: emptyChecklistEntry(),
    })

    const options = await getAbcOptions(behaviourId)
    expect(options.consequence).toEqual(['Adult attention given'])
  })
})
