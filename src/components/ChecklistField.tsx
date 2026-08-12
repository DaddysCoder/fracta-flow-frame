import { useState } from 'react'
import type { ConsequenceTag } from '../lib/types'

const DOMAIN_OPTIONS: { value: ConsequenceTag; label: string }[] = [
  { value: 'attention', label: 'Attention' },
  { value: 'escape', label: 'Escape' },
  { value: 'tangible', label: 'Tangible' },
  { value: 'automatic', label: 'Automatic' },
  { value: 'none_observed', label: 'None observed' },
]

// Shared "checklist + Other" pattern (brief §4/§2, extended by Phase 1.2
// §3): a multi-select checklist plus an "Other" option that reveals free
// text. Submitting that text both selects it for the current record and
// (via onAddCustom) persists it so it shows up as a normal checkbox item
// next time. When domainRequired is set (consequence checklists only), a
// domain dropdown must be answered before "Add" is enabled — a custom
// consequence item can never bypass the FAST-domain mapping hypothesis.ts
// depends on.
export function ChecklistField({
  label,
  items,
  selected,
  onToggle,
  onAddCustom,
  domainRequired = false,
}: {
  label: string
  items: string[]
  selected: string[]
  onToggle: (item: string) => void
  onAddCustom: (item: string, domain?: ConsequenceTag) => void
  domainRequired?: boolean
}) {
  const [showOther, setShowOther] = useState(false)
  const [otherText, setOtherText] = useState('')
  const [otherDomain, setOtherDomain] = useState<ConsequenceTag | ''>('')

  const canAdd = otherText.trim().length > 0 && (!domainRequired || otherDomain !== '')

  function handleAddOther() {
    if (!canAdd) return
    onAddCustom(otherText.trim(), domainRequired ? (otherDomain as ConsequenceTag) : undefined)
    setOtherText('')
    setOtherDomain('')
    setShowOther(false)
  }

  return (
    <div>
      <span className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{label}</span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
        {items.map((item) => (
          <label key={item} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={selected.includes(item)} onChange={() => onToggle(item)} />
            {item}
          </label>
        ))}
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" checked={showOther} onChange={(e) => setShowOther(e.target.checked)} />
          Other
        </label>
      </div>
      {showOther && (
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            placeholder="Describe, then Add"
            className="flex-1 min-w-[10rem] rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5 text-sm"
          />
          {domainRequired && (
            <select
              value={otherDomain}
              onChange={(e) => setOtherDomain(e.target.value as ConsequenceTag)}
              required
              className="rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5 text-sm"
            >
              <option value="" disabled>
                Function domain…
              </option>
              {DOMAIN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={handleAddOther}
            disabled={!canAdd}
            className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}
