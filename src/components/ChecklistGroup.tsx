import { useState } from 'react'
import type { ChecklistEntry } from '../lib/types'

export interface ChecklistGroupItem {
  id: string
  label: string
}

// Reusable "starter checklist + add your own" control — backs the
// escalation-phase checklists and the antecedent/consequence/setting-event
// checklists alike (brief Part B, steps 3 and 5).
export function ChecklistGroup({
  items,
  entry,
  onToggle,
  onAddCustom,
  onRemoveCustom,
}: {
  items: ChecklistGroupItem[]
  entry: ChecklistEntry
  onToggle: (itemId: string) => void
  onAddCustom: (text: string) => void
  onRemoveCustom: (text: string) => void
}) {
  const [draft, setDraft] = useState('')

  function submitDraft() {
    const text = draft.trim()
    if (!text) return
    onAddCustom(text)
    setDraft('')
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <label
            key={item.id}
            className={`cursor-pointer rounded-md border px-2 py-1 text-xs ${
              entry.checkedItems.includes(item.id)
                ? 'border-[#111111] dark:border-white bg-[#111111] dark:bg-white text-white dark:text-slate-900'
                : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={entry.checkedItems.includes(item.id)}
              onChange={() => onToggle(item.id)}
            />
            {item.label}
          </label>
        ))}
        {entry.customItems.map((text) => (
          <span
            key={text}
            className="flex items-center gap-1 rounded-md border border-dashed border-slate-400 px-2 py-1 text-xs text-slate-600 dark:text-slate-300"
          >
            {text}
            <button
              type="button"
              onClick={() => onRemoveCustom(text)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              aria-label={`Remove ${text}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add your own"
          className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1 text-xs"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submitDraft()
            }
          }}
        />
        <button
          type="button"
          onClick={submitDraft}
          className="rounded-md border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs text-slate-600 dark:text-slate-300"
        >
          Add
        </button>
      </div>
    </div>
  )
}
