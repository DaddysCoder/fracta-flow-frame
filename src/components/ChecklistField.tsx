import { useState } from 'react'

// Shared "checklist + Other" pattern (brief §4/§2): a multi-select checklist
// plus an "Other" option that reveals free text. Submitting that text both
// selects it for the current record and (via onAddCustom) persists it so it
// shows up as a normal checkbox item next time.
export function ChecklistField({
  label,
  items,
  selected,
  onToggle,
  onAddCustom,
}: {
  label: string
  items: string[]
  selected: string[]
  onToggle: (item: string) => void
  onAddCustom: (item: string) => void
}) {
  const [showOther, setShowOther] = useState(false)
  const [otherText, setOtherText] = useState('')

  function handleAddOther() {
    const trimmed = otherText.trim()
    if (!trimmed) return
    onAddCustom(trimmed)
    setOtherText('')
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
        <div className="mt-2 flex gap-2">
          <input
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            placeholder="Describe, then Add"
            className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={handleAddOther}
            className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200"
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}
