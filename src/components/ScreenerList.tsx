import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { DOMAIN_LABELS } from '../lib/screener'
import type { ScreenerDomain } from '../lib/types'

const DOMAINS: ScreenerDomain[] = ['attention', 'escape', 'tangible', 'automatic']

export function ScreenerList({ behaviourId }: { behaviourId: string }) {
  const screeners = useLiveQuery(
    () => db.screeners.where('behaviourId').equals(behaviourId).reverse().sortBy('dateCompleted'),
    [behaviourId],
  )

  if (!screeners?.length) {
    return <p className="text-sm text-slate-500">No screeners completed yet.</p>
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-[#111111] dark:text-white">
        Completed screeners ({screeners.length})
      </h2>
      <ul className="space-y-3">
        {screeners.map((s) => {
          const maxScore = Math.max(...DOMAINS.map((d) => s.domainScores[d]))
          return (
            <li
              key={s.id}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-[#111111] dark:text-white">
                  {new Date(s.dateCompleted).toLocaleString()}
                </span>
                <span className="text-xs text-slate-500">
                  Informant: {s.informantRole}
                </span>
              </div>
              <div className="space-y-1">
                {DOMAINS.map((d) => (
                  <div key={d} className="flex items-center gap-2 text-xs">
                    <span className="w-20 text-slate-500">{DOMAIN_LABELS[d]}</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full ${
                          s.domainScores[d] === maxScore && maxScore > 0 ? 'bg-[#111111] dark:bg-white' : 'bg-slate-400 dark:bg-slate-600'
                        }`}
                        style={{ width: `${(s.domainScores[d] / 6) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-slate-500">{s.domainScores[d]}/6</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                Screener result only — raw responses stored for audit, no cross-comparison to
                episode data has been computed for this record.
              </p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
