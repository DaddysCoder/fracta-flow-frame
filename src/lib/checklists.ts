import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { ANTECEDENT_ITEMS, CONSEQUENCE_ITEMS, SETTING_EVENT_ITEMS } from './scales'
import type { EpisodeChecklistField } from './types'

export function baseChecklistItems(field: EpisodeChecklistField): string[] {
  switch (field) {
    case 'settingEvent':
      return [...SETTING_EVENT_ITEMS]
    case 'antecedent':
      return [...ANTECEDENT_ITEMS]
    case 'consequence':
      return CONSEQUENCE_ITEMS.map((c) => c.label)
  }
}

// Dynamic per-behaviour ABC checklist (Phase 1.2 §3, re-asked in Phase 1.4
// §3): the generic starter list from scales.ts, plus anything previously
// added for this specific behaviour. Falls back to the starter list alone
// while the live query is still loading or when nothing has been added yet
// — never an empty checklist (brief §3).
//
// Phase 1.4 §3 re-describes this as a union of "checked + custom items
// across all of that behaviour's Formulation records" — but FormulationRecord
// still has no antecedent/setting-event/consequence checklist fields (see
// types.ts's BehaviourChecklistItem doc comment for the full Phase 1.2
// writeup), only escalationCycle, which describes behaviour *presentation*
// per phase, not ABC data. That deviation still holds. This
// BehaviourChecklistItem-backed store is the same "per-behaviour reusable
// items store" alternative the brief allows, and it already satisfies the
// functional requirement: base list ∪ everything previously added for this
// behaviour, with "Other" entries added while logging a real episode
// persisted here automatically (see addBehaviourChecklistItem in actions.ts).
export function useBehaviourChecklistItems(behaviourId: string, field: EpisodeChecklistField): string[] {
  const custom = useLiveQuery(
    () =>
      db.behaviourChecklistItems
        .where('behaviourId')
        .equals(behaviourId)
        .and((c) => c.field === field)
        .toArray(),
    [behaviourId, field],
  )
  const base = baseChecklistItems(field)
  if (!custom || custom.length === 0) return base
  const extra = custom.map((c) => c.label).filter((label) => !base.includes(label))
  return [...base, ...extra]
}
