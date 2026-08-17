import { db, newId } from './db'
import {
  ANTECEDENT_CONTEXT_OPTIONS,
  CONSEQUENCE_OPTIONS,
  SETTING_EVENT_OPTIONS,
  type ContentOption,
} from './fbaContent'
import type { AbcOptionCategory, BehaviourCustomOption, ChecklistEntry, Formulation } from './types'

// Dynamic per-behaviour ABC checklists (brief Part B, step 5).
//
// Offered options = union of checked + custom items across all of a
// behaviour's formulations, plus anything written back directly at
// logging time (BehaviourCustomOption). No formulation yet -> fall back to
// the generic starter lists from fbaContent (step 4).

const GENERIC_OPTIONS: Record<AbcOptionCategory, ContentOption[]> = {
  antecedent: ANTECEDENT_CONTEXT_OPTIONS,
  consequence: CONSEQUENCE_OPTIONS,
  settingEvent: SETTING_EVENT_OPTIONS,
}

function formulationEntry(formulation: Formulation, category: AbcOptionCategory): ChecklistEntry {
  switch (category) {
    case 'antecedent':
      return formulation.antecedentContext
    case 'consequence':
      return formulation.consequenceContext
    case 'settingEvent':
      return formulation.settingEvents
  }
}

function resolveGenericLabel(category: AbcOptionCategory, itemId: string): string {
  return GENERIC_OPTIONS[category].find((o) => o.id === itemId)?.label ?? itemId
}

export function emptyChecklistEntry(): ChecklistEntry {
  return { checkedItems: [], customItems: [] }
}

function normalise(text: string): string {
  return text.trim().toLowerCase()
}

// Deduplicates on normalised (trim, case-fold) text, keeping the first
// occurrence's original casing/wording — exported for direct unit testing.
export function dedupeOptions(items: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of items) {
    const key = normalise(item)
    if (key === '' || seen.has(key)) continue
    seen.add(key)
    result.push(item)
  }
  return result
}

// Pure merge logic, unit-testable without touching the DB.
export function mergeAbcOptions(
  category: AbcOptionCategory,
  formulations: Formulation[],
  writeBackItems: string[],
): string[] {
  const fromFormulations =
    formulations.length === 0
      ? GENERIC_OPTIONS[category].map((o) => o.label)
      : formulations.flatMap((f) => {
          const entry = formulationEntry(f, category)
          return [...entry.checkedItems.map((id) => resolveGenericLabel(category, id)), ...entry.customItems]
        })

  return dedupeOptions([...fromFormulations, ...writeBackItems])
}

export async function getAbcOptions(behaviourId: string): Promise<Record<AbcOptionCategory, string[]>> {
  const [formulations, customOptions] = await Promise.all([
    db.formulations.where('behaviourId').equals(behaviourId).toArray(),
    db.behaviourCustomOptions.where('behaviourId').equals(behaviourId).toArray(),
  ])

  const byCategory = (category: AbcOptionCategory) =>
    mergeAbcOptions(
      category,
      formulations,
      customOptions.filter((o) => o.category === category).map((o) => o.text),
    )

  return {
    antecedent: byCategory('antecedent'),
    consequence: byCategory('consequence'),
    settingEvent: byCategory('settingEvent'),
  }
}

// Writes a custom item entered at logging time back into the behaviour's
// reusable option set, so it's offered next time instead of re-typed.
// Skips the write if an equivalent (normalised) item is already present,
// from either a prior write-back or a formulation.
export async function addCustomAbcOption(
  behaviourId: string,
  category: AbcOptionCategory,
  text: string,
): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) return

  const existing = await getAbcOptions(behaviourId)
  if (existing[category].some((o) => normalise(o) === normalise(trimmed))) return

  const entry: BehaviourCustomOption = {
    id: newId(),
    behaviourId,
    category,
    text: trimmed,
    createdAt: new Date().toISOString(),
  }
  await db.behaviourCustomOptions.add(entry)
}
