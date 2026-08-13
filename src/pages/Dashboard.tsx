import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../lib/db'
import { DashboardFlagsBanner } from '../components/DashboardFlagsBanner'
import type { FunctionHypothesis } from '../lib/types'

const ACTIVITY_FEED_LIMIT = 20

type ActivityItem = {
  id: string
  at: string
  behaviourId: string
  participantId: string
  kind: 'episode' | 'formulation'
  summary: string
}

// Phase 1.3 (brief §6) — reworked from a per-participant behaviour list
// (which just duplicated what Participants → behaviour drill-down already
// shows) into a genuinely cross-cutting view: open flags across every
// participant, a merged recent-activity feed, and behaviours where
// confidence has stayed low despite a reasonable number of episodes.
// Participants.tsx is untouched — it remains the plain list/management
// view; this page is not a substitute for it.
export function Dashboard() {
  const participants = useLiveQuery(() => db.participants.toArray(), [])
  const behaviours = useLiveQuery(() => db.behaviours.toArray(), [])
  const episodes = useLiveQuery(() => db.episodes.toArray(), [])
  const formulations = useLiveQuery(() => db.formulations.toArray(), [])
  const hypotheses = useLiveQuery(() => db.hypotheses.toArray(), [])

  const participantById = new Map((participants ?? []).map((p) => [p.id, p]))
  const behaviourById = new Map((behaviours ?? []).map((b) => [b.id, b]))

  const activity: ActivityItem[] = [
    ...(episodes ?? []).map((e) => ({
      id: e.id,
      at: e.createdAt,
      behaviourId: e.behaviourId,
      participantId: behaviourById.get(e.behaviourId)?.participantId ?? '',
      kind: 'episode' as const,
      summary: `Episode logged — severity ${e.severityRating}`,
    })),
    ...(formulations ?? []).map((f) => ({
      id: f.id,
      at: f.conductedAt,
      behaviourId: f.behaviourId,
      participantId: behaviourById.get(f.behaviourId)?.participantId ?? '',
      kind: 'formulation' as const,
      summary: 'Formulation record added',
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, ACTIVITY_FEED_LIMIT)

  // Latest hypothesis per behaviour, then filtered to the same "low
  // confidence despite a reasonable episode count" threshold already
  // established in HypothesisPanel.tsx's nudge (confidenceLevel === 'low'
  // && episodeCount >= 3) — reused here rather than picking a new number.
  const latestHypothesisByBehaviour = new Map<string, FunctionHypothesis>()
  for (const h of hypotheses ?? []) {
    const existing = latestHypothesisByBehaviour.get(h.behaviourId)
    if (!existing || h.computedAt > existing.computedAt) {
      latestHypothesisByBehaviour.set(h.behaviourId, h)
    }
  }
  const lowConfidenceBehaviours = [...latestHypothesisByBehaviour.values()].filter(
    (h) => h.confidenceLevel === 'low' && h.episodeCount >= 3,
  )

  const loading =
    participants === undefined || behaviours === undefined || episodes === undefined || formulations === undefined

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-display font-bold text-[#111111] dark:text-white">Dashboard</h1>

      <DashboardFlagsBanner />

      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && behaviours?.length === 0 && (
        <p className="text-sm text-slate-500">
          No behaviours yet. Add a participant and a behaviour to start logging.
        </p>
      )}

      {lowConfidenceBehaviours.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-700 p-4 space-y-2">
          <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            Confidence still low despite {lowConfidenceBehaviours.length === 1 ? 'a reasonable number of episodes' : 'reasonable episode counts'}
          </h2>
          <ul className="space-y-1 text-sm">
            {lowConfidenceBehaviours.map((h) => {
              const behaviour = behaviourById.get(h.behaviourId)
              const participant = behaviour ? participantById.get(behaviour.participantId) : undefined
              if (!behaviour) return null
              return (
                <li key={h.behaviourId}>
                  <Link to={`/behaviours/${behaviour.id}`} className="underline text-amber-900 dark:text-amber-100">
                    {behaviour.name}
                  </Link>
                  {participant && <span className="text-amber-800 dark:text-amber-200"> — {participant.identifyingDetails}</span>}
                  <span className="text-amber-700 dark:text-amber-300">
                    {' '}
                    ({h.episodeCount} episodes logged). Consider more descriptive data collection across more days, or
                    experimental functional analysis.
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-[#111111] dark:text-white">Recent activity</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-slate-500">No episodes or formulation records logged yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            {activity.map((item) => {
              const behaviour = behaviourById.get(item.behaviourId)
              const participant = participantById.get(item.participantId)
              return (
                <li key={`${item.kind}-${item.id}`} className="p-3 text-sm">
                  <Link to={`/behaviours/${item.behaviourId}`} className="hover:underline">
                    <span className="font-medium text-[#111111] dark:text-white">
                      {behaviour?.name ?? 'Unknown behaviour'}
                    </span>
                    {participant && <span className="text-slate-500"> — {participant.identifyingDetails}</span>}
                  </Link>
                  <div className="text-xs text-slate-500">
                    {item.summary} · {new Date(item.at).toLocaleString()}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
