import { describe, expect, it } from 'vitest'
import { BEHAVIOUR_CATEGORIES, CONSEQUENCE_OPTIONS, TERMINOLOGY } from './fbaContent'
import type { ConsequenceTag } from './types'

const FAST_DOMAIN_TAGS: ConsequenceTag[] = ['attention', 'escape', 'tangible', 'automatic']

describe('sourced FBA content', () => {
  it('groups behaviours of concern, not a flat list', () => {
    expect(BEHAVIOUR_CATEGORIES.length).toBeGreaterThanOrEqual(7)
    for (const category of BEHAVIOUR_CATEGORIES) {
      expect(category.items.length).toBeGreaterThan(0)
    }
  })

  it('the FAST domain set (via ConsequenceTag) has exactly four function domains', () => {
    expect(FAST_DOMAIN_TAGS).toHaveLength(4)
  })

  it('adult and peer attention consequence options both roll up to the single attention domain', () => {
    const attentionOptions = CONSEQUENCE_OPTIONS.filter((o) => o.attentionSubtype)
    expect(attentionOptions.length).toBeGreaterThanOrEqual(2)
    expect(attentionOptions.map((o) => o.attentionSubtype).sort()).toEqual(['adult', 'adult', 'peer', 'peer'].sort())
    for (const option of attentionOptions) {
      expect(option.suggestedTag).toBe('attention')
    }
  })

  it('every consequence option maps to a valid FAST-domain-compatible tag', () => {
    for (const option of CONSEQUENCE_OPTIONS) {
      expect(['attention', 'escape', 'tangible', 'automatic', 'none_observed']).toContain(option.suggestedTag)
    }
  })

  it('defines the required terminology tooltip terms', () => {
    for (const term of [
      'antecedent',
      'alternative behaviour',
      'behaviour',
      'consequence',
      'function',
      'hypothesis',
      'reinforcement',
      'setting event',
      'summary statement',
    ]) {
      expect(TERMINOLOGY[term]).toBeTruthy()
    }
  })

  it('contains no QABF, MAS, or BPI-01 wording (licensing risk)', () => {
    const serialised = JSON.stringify({ BEHAVIOUR_CATEGORIES, CONSEQUENCE_OPTIONS })
    expect(serialised).not.toMatch(/QABF/i)
    expect(serialised).not.toMatch(/Motivation Assessment Scale/i)
    expect(serialised).not.toMatch(/BPI-01/i)
  })
})
