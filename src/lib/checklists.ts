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

// Dynamic per-behaviour ABC checklist (Phase 1.2 §3): the generic starter
// list from scales.ts, plus anything previously added for this specific
// behaviour. Falls back to the starter list alone while the live query is
// still loading or when nothing has been added yet — never an empty
// checklist (brief §3).
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
