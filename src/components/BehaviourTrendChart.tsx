import { useLiveQuery } from 'dexie-react-hooks'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db } from '../lib/db'

// Moved here from the Dashboard (brief Part B, step 10) — behaviour-level
// detail belongs at behaviour level, not duplicated on a cross-cutting
// dashboard.
export function BehaviourTrendChart({ behaviourId }: { behaviourId: string }) {
  const episodes = useLiveQuery(
    () => db.episodes.where('behaviourId').equals(behaviourId).sortBy('dateTime'),
    [behaviourId],
  )

  const chartData = (episodes ?? []).map((e) => ({
    date: new Date(e.dateTime).toLocaleDateString(),
    severity: e.severityRating,
    frequency: e.frequencyContext,
  }))

  if (chartData.length <= 1) {
    return <p className="text-xs text-slate-400">Log at least 2 episodes to see a trend chart.</p>
  }

  return (
    <div className="h-40 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
          <XAxis dataKey="date" fontSize={10} tickLine={false} />
          <YAxis domain={[0, 4]} fontSize={10} tickLine={false} allowDecimals={false} />
          <Tooltip />
          <Line type="monotone" dataKey="severity" stroke="#dc2626" dot={false} name="Severity" />
          <Line type="monotone" dataKey="frequency" stroke="#2563eb" dot={false} name="Frequency" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
