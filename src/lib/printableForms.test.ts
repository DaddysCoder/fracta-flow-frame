import { describe, expect, it } from 'vitest'
import {
  ANTECEDENT_ITEMS,
  CONSEQUENCE_ITEMS,
  ESCALATION_PHASE_ITEMS,
  ESCALATION_PHASE_ORDER,
  SETTING_EVENT_ITEMS,
} from './scales'
import { renderBlankAbcForm, renderBlankFormulationForm } from './printableForms'

// Paper parity: the printed form must carry the same content as the
// on-screen one, and nothing that only makes sense on screen — no
// interactive elements a piece of paper can't render.
function assertNoInteractiveElements(html: string) {
  expect(html).not.toMatch(/<input/i)
  expect(html).not.toMatch(/<select/i)
  expect(html).not.toMatch(/<button/i)
  expect(html).not.toMatch(/<script/i)
  expect(html).not.toMatch(/onclick=/i)
}

describe('paper parity — blank formulation form', () => {
  const html = renderBlankFormulationForm()

  it('has no interactive-only affordances', () => {
    assertNoInteractiveElements(html)
  })

  it('carries every antecedent/consequence/setting-event starter option the on-screen form offers', () => {
    for (const label of [...ANTECEDENT_ITEMS, ...CONSEQUENCE_ITEMS.map((c) => c.label), ...SETTING_EVENT_ITEMS]) {
      expect(html).toContain(label)
    }
  })

  it('carries every escalation-cycle phase and starter item', () => {
    for (const phase of ESCALATION_PHASE_ORDER) {
      for (const item of ESCALATION_PHASE_ITEMS[phase]) {
        expect(html).toContain(item)
      }
    }
  })
})

describe('paper parity — blank ABC form', () => {
  const html = renderBlankAbcForm()

  it('has no interactive-only affordances', () => {
    assertNoInteractiveElements(html)
  })

  it('carries the same setting-event/antecedent/consequence starter option pools', () => {
    for (const label of [...SETTING_EVENT_ITEMS, ...ANTECEDENT_ITEMS, ...CONSEQUENCE_ITEMS.map((c) => c.label)]) {
      expect(html).toContain(label)
    }
  })

  it('carries severity and frequency scale labels', () => {
    expect(html).toContain('Mild')
    expect(html).toContain('Severe')
    expect(html).toContain('Frequently (daily)')
  })
})
