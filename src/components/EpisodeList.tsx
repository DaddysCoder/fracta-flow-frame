import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { SEVERITY_SCALE } from '../lib/scales'

export function EpisodeList({ behaviourId }: { behaviourId: string }) {
  const episodes = useLiveQuery(
    () => db.episodes.where('behaviourId').equals(behaviourId).reverse().sortBy('dateTime'),
    [behaviourId],
  )

  if (!episodes?.length) {
    return <p className="text-sm text-slate-500">No episodes logged yet.</p>
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-[#111111] dark:text-white">
        Episodes ({episodes.length})
      </h2>
      <ul className="divide-y divide-slate-200 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {episodes.map((ep) => (
          <li key={ep.id} className="p-4 text-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[#111111] dark:text-white">
                {new Date(ep.dateTime).toLocaleString()}
              </span>
              <span className="text-xs rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5">
                Severity {ep.severityRating} — {SEVERITY_SCALE[ep.severityRating].label}
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              <span className="font-medium">Antecedent ({ep.antecedentTag}):</span> {ep.antecedentText}
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              <span className="font-medium">Consequence ({ep.consequenceTag}):</span> {ep.consequenceText}
            </p>
            {ep.riskFlags.length > 0 && (
              <p className="text-xs text-red-600 dark:text-red-400">Risk: {ep.riskFlags.join(', ')}</p>
            )}
            <p className="text-xs text-slate-400">Logged by {ep.loggedBy}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
