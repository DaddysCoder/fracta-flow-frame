import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../lib/db'

type ActivityKind = 'episode' | 'screener' | 'formulation' | 'flag'

interface ActivityItem {
  id: string
  kind: ActivityKind
  at: string
  behaviourId: string
  detail: string
}

const KIND_LABEL: Record<ActivityKind, string> = {
  episode: 'Episode logged',
  screener: 'Screener completed',
  formulation: 'Formulation interview',
  flag: 'Risk flag triggered',
}

const FEED_LIMIT = 15

// Cross-participant, not scoped to one participant — the point of a
// dashboard (brief Part B, step 10). Behaviour-level history stays on
// behaviour detail; this is only "what happened recently, anywhere."
export function RecentActivityFeed() {
  const activity = useLiveQuery(async () => {
    const [episodes, screeners, formulations, flags, behaviours, participants] = await Promise.all([
      db.episodes.toArray(),
      db.screeners.toArray(),
      db.formulations.toArray(),
      db.riskFlags.toArray(),
      db.behaviours.toArray(),
      db.participants.toArray(),
    ])

    const items: ActivityItem[] = [
      ...episodes.map((e) => ({ id: e.id, kind: 'episode' as const, at: e.createdAt, behaviourId: e.behaviourId, detail: `severity ${e.severityRating}` })),
      ...screeners.map((s) => ({ id: s.id, kind: 'screener' as const, at: s.createdAt, behaviourId: s.behaviourId, detail: s.informantRole })),
      ...formulations.map((f) => ({ id: f.id, kind: 'formulation' as const, at: f.conductedAt, behaviourId: f.behaviourId, detail: `with ${f.informantName}` })),
      ...flags.map((f) => ({ id: f.id, kind: 'flag' as const, at: f.triggeredAt, behaviourId: f.behaviourId, detail: f.triggerDetail })),
    ]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, FEED_LIMIT)

    const behaviourById = new Map(behaviours.map((b) => [b.id, b]))
    const participantById = new Map(participants.map((p) => [p.id, p]))

    return items.map((item) => {
      const behaviour = behaviourById.get(item.behaviourId)
      const participant = behaviour ? participantById.get(behaviour.participantId) : undefined
      return { ...item, behaviourName: behaviour?.name, participantLabel: participant?.identifyingDetails }
    })
  }, [])

  if (!activity?.length) {
    return <p className="text-sm text-slate-500">No activity yet.</p>
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-[#111111] dark:text-white">Recent activity</h2>
      <ul className="divide-y divide-slate-200 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {activity.map((item) => (
          <li key={`${item.kind}-${item.id}`} className="p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-[#111111] dark:text-white">{KIND_LABEL[item.kind]}</span>
              <span className="text-xs text-slate-400 shrink-0">{new Date(item.at).toLocaleString()}</span>
            </div>
            <div className="text-slate-500 text-xs mt-0.5">
              {item.behaviourName ? (
                <Link to={`/behaviours/${item.behaviourId}`} className="underline">
                  {item.behaviourName}
                </Link>
              ) : (
                'Deleted behaviour'
              )}
              {item.participantLabel ? ` · ${item.participantLabel}` : ''} · {item.detail}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
