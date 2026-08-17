import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../lib/db'

const EPISODE_THRESHOLD = 8

// Cross-participant surfacing of behaviours stuck at low confidence despite
// a reasonable amount of data (brief Part B, step 10) — a nudge toward
// either more descriptive data collection or considering EFA, not an alert.
export function LowConfidenceList() {
  const stuck = useLiveQuery(async () => {
    const [hypotheses, behaviours] = await Promise.all([db.hypotheses.toArray(), db.behaviours.toArray()])
    const behaviourById = new Map(behaviours.map((b) => [b.id, b]))

    const latestByBehaviour = new Map<string, (typeof hypotheses)[number]>()
    for (const h of hypotheses) {
      const current = latestByBehaviour.get(h.behaviourId)
      if (!current || h.computedAt > current.computedAt) latestByBehaviour.set(h.behaviourId, h)
    }

    return [...latestByBehaviour.values()]
      .filter((h) => h.confidenceLevel === 'low' && h.episodeCount >= EPISODE_THRESHOLD)
      .map((h) => ({ hypothesis: h, behaviour: behaviourById.get(h.behaviourId) }))
      .filter((x): x is { hypothesis: typeof x.hypothesis; behaviour: NonNullable<typeof x.behaviour> } =>
        x.behaviour !== undefined,
      )
      .sort((a, b) => b.hypothesis.episodeCount - a.hypothesis.episodeCount)
  }, [])

  if (!stuck?.length) return null

  return (
    <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950 p-4 space-y-2">
      <h2 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
        Needs more data or consider EFA
      </h2>
      <ul className="space-y-1">
        {stuck.map(({ hypothesis, behaviour }) => (
          <li key={hypothesis.id} className="text-sm text-blue-900 dark:text-blue-100">
            <Link to={`/behaviours/${behaviour.id}`} className="underline">
              {behaviour.name}
            </Link>{' '}
            — low confidence after {hypothesis.episodeCount} episodes
          </li>
        ))}
      </ul>
    </div>
  )
}
