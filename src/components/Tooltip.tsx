import { type ReactNode, useState } from 'react'
import { TERMINOLOGY } from '../lib/fbaContent'

// Plain-language terminology tooltip (brief Part B, step 4). Click/focus to
// reveal — no hover-only affordance, so it also works on touch devices.
export function Tooltip({ term, children }: { term: keyof typeof TERMINOLOGY; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const definition = TERMINOLOGY[term]

  return (
    <span className="relative inline-flex items-center gap-1">
      {children}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        aria-label={`What does "${term}" mean?`}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-slate-400 text-[10px] leading-none text-slate-500 dark:text-slate-400"
      >
        ?
      </button>
      {open && (
        <span className="absolute left-0 top-full z-10 mt-1 w-64 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs font-normal text-slate-600 dark:text-slate-300 shadow-lg">
          {definition}
        </span>
      )}
    </span>
  )
}
