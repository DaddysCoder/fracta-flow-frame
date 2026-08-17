import { describe, expect, it } from 'vitest'
import { ESCALATION_ITEMS, ESCALATION_PHASES } from './escalationContent'
import { ANTECEDENT_CONTEXT_OPTIONS, CONSEQUENCE_OPTIONS, SETTING_EVENT_OPTIONS } from './fbaContent'
import { renderBlankAbcForm, renderBlankFormulationForm } from './printableForms'

// Paper parity (brief Part B, step 12): the printed form must carry the
// same content as the on-screen one, and nothing that only makes sense on
// screen — no interactive elements a piece of paper can't render.
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

  it('carries every antecedent/consequence/setting-event option the on-screen form offers', () => {
    for (const o of [...ANTECEDENT_CONTEXT_OPTIONS, ...CONSEQUENCE_OPTIONS, ...SETTING_EVENT_OPTIONS]) {
      expect(html).toContain(o.label)
    }
  })

  it('carries every escalation-cycle phase and item', () => {
    for (const phase of ESCALATION_PHASES) {
      for (const item of ESCALATION_ITEMS[phase]) {
        expect(html).toContain(item.label)
      }
    }
  })
})

describe('paper parity — blank ABC form', () => {
  const html = renderBlankAbcForm()

  it('has no interactive-only affordances', () => {
    assertNoInteractiveElements(html)
  })

  it('carries the same setting-event/antecedent/consequence option pools', () => {
    for (const o of [...SETTING_EVENT_OPTIONS, ...ANTECEDENT_CONTEXT_OPTIONS, ...CONSEQUENCE_OPTIONS]) {
      expect(html).toContain(o.label)
    }
  })

  it('carries severity and frequency scale labels', () => {
    expect(html).toContain('Mild')
    expect(html).toContain('Severe')
    expect(html).toContain('Frequently (daily)')
  })
})
