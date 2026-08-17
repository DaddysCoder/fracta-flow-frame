import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { computeSummaryStatement } from '../lib/summaryStatement'
import { Tooltip } from './Tooltip'

export function SummaryStatementPanel({ behaviourId }: { behaviourId: string }) {
  const behaviour = useLiveQuery(() => db.behaviours.get(behaviourId), [behaviourId])
  const episodes = useLiveQuery(() => db.episodes.where('behaviourId').equals(behaviourId).toArray(), [behaviourId])
  const hypotheses = useLiveQuery(
    () => db.hypotheses.where('behaviourId').equals(behaviourId).sortBy('computedAt'),
    [behaviourId],
  )

  if (!behaviour || !episodes || !hypotheses) return null

  const latestHypothesis = hypotheses.length ? hypotheses[hypotheses.length - 1] : null
  const summary = computeSummaryStatement(behaviour.name, episodes, latestHypothesis)

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="text-sm font-semibold text-[#111111] dark:text-white">
          <Tooltip term="summary statement">Summary statement</Tooltip>
        </h2>
        <span
          className={`text-xs rounded-full px-2 py-0.5 ${
            summary.completeness === 'full'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
          }`}
        >
          {summary.completeness === 'full' ? 'Complete' : 'Partial — gaps visible below'}
        </span>
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-300">{summary.rendered}</p>
    </div>
  )
}
