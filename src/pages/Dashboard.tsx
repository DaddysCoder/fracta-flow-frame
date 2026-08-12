import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db } from '../lib/db'
import { DashboardFlagsBanner } from '../components/DashboardFlagsBanner'

export function Dashboard() {
  const behaviours = useLiveQuery(() => db.behaviours.where('status').equals('active').toArray(), [])
  const participants = useLiveQuery(() => db.participants.toArray(), [])
  const episodes = useLiveQuery(() => db.episodes.toArray(), [])

  const participantById = new Map((participants ?? []).map((p) => [p.id, p]))

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-[#333333] dark:text-white">Dashboard</h1>

      <DashboardFlagsBanner />

      {behaviours?.length === 0 && (
        <p className="text-sm text-slate-500">
          No active behaviours yet. Add a participant and a behaviour to start logging.
        </p>
      )}

      <div className="space-y-4">
        {behaviours?.map((b) => {
          const behaviourEpisodes = (episodes ?? [])
            .filter((e) => e.behaviourId === b.id)
            .sort((a, c) => a.dateTime.localeCompare(c.dateTime))
          const chartData = behaviourEpisodes.map((e) => ({
            date: new Date(e.dateTime).toLocaleDateString(),
            severity: e.severityRating,
            frequency: e.frequencyContext,
          }))
          const participant = participantById.get(b.participantId)

          return (
            <Link
              key={b.id}
              to={`/behaviours/${b.id}`}
              className="block rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-slate-400"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-[#333333] dark:text-white">{b.name}</div>
                  <div className="text-xs text-slate-500">{participant?.identifyingDetails}</div>
                </div>
                <span className="text-xs text-slate-500">{behaviourEpisodes.length} episode(s)</span>
              </div>
              {chartData.length > 1 ? (
                <div className="h-32 mt-3">
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
              ) : (
                <p className="text-xs text-slate-400 mt-3">
                  Log at least 2 episodes to see a trend chart.
                </p>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
