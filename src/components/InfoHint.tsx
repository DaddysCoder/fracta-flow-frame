import { useState } from 'react'
import { TERMINOLOGY_DEFINITIONS, type TerminologyTerm } from '../lib/terminology'

// Small reusable terminology tooltip (brief §3). Click/tap to toggle rather
// than hover-only, so it works on touch devices practitioners and support
// workers use in the field.
export function InfoHint({ term }: { term: TerminologyTerm }) {
  const [open, setOpen] = useState(false)
  const { label, definition } = TERMINOLOGY_DEFINITIONS[term]

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        aria-label={`What does "${label}" mean?`}
        className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full border border-slate-400 dark:border-slate-500 text-[10px] leading-none text-slate-500 dark:text-slate-400 hover:border-slate-600 dark:hover:border-slate-300"
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-10 left-0 top-5 w-56 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs text-slate-600 dark:text-slate-300 shadow-lg"
        >
          {definition}
        </span>
      )}
    </span>
  )
}
