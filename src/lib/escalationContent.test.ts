import { describe, expect, it } from 'vitest'
import {
  ESCALATION_ITEMS,
  ESCALATION_PHASES,
  emptyEscalationCycle,
  resolveEscalationCycleDisplay,
} from './escalationContent'

describe('escalation cycle content', () => {
  it('has exactly six phases', () => {
    expect(ESCALATION_PHASES).toHaveLength(6)
    expect(ESCALATION_PHASES).toEqual([
      'baseline',
      'early_warning',
      'escalation',
      'peak',
      'de_escalation',
      'recovery',
    ])
  })

  it('gives every phase at least one starter item', () => {
    for (const phase of ESCALATION_PHASES) {
      expect(ESCALATION_ITEMS[phase].length).toBeGreaterThan(0)
    }
  })

  it('produces an empty cycle covering every phase', () => {
    const cycle = emptyEscalationCycle()
    expect(Object.keys(cycle).sort()).toEqual([...ESCALATION_PHASES].sort())
    for (const phase of ESCALATION_PHASES) {
      expect(cycle[phase]).toEqual({ checkedItems: [], customItems: [] })
    }
  })

  it('resolves checked item IDs to display text and appends custom items verbatim', () => {
    const cycle = emptyEscalationCycle()
    cycle.early_warning.checkedItems = ['early-warning-pacing', 'early-warning-fidgeting']
    cycle.early_warning.customItems = ['grinding teeth']

    const resolved = resolveEscalationCycleDisplay(cycle)
    expect(resolved.early_warning).toEqual(['Pacing', 'Fidgeting', 'grinding teeth'])
    expect(resolved.baseline).toEqual([])
  })

  it('falls back to the raw ID if a checked item ID is unknown (stale reference)', () => {
    const cycle = emptyEscalationCycle()
    cycle.peak.checkedItems = ['some-removed-id']
    expect(resolveEscalationCycleDisplay(cycle).peak).toEqual(['some-removed-id'])
  })
})
