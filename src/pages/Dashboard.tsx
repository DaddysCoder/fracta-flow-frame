import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db } from '../lib/db'
import { readLastWork } from '../lib/lastWork'
import { DashboardFlagsBanner } from '../components/DashboardFlagsBanner'
import { EmptyCard } from '../components/EmptyCard'
import { WorkModeLinks } from '../components/WorkModeLinks'

export function Dashboard() {
  const behaviours = useLiveQuery(() => db.behaviours.where('status').equals('active').toArray(), [])
  const participants = useLiveQuery(() => db.participants.toArray(), [])
  const episodes = useLiveQuery(() => db.episodes.toArray(), [])
  const last = readLastWork()

  const participantById = new Map((participants ?? []).map((p) => [p.id, p]))
  const lastBehaviour = last ? (behaviours ?? []).find((b) => b.id === last.behaviourId) : undefined
  const lastParticipant = lastBehaviour ? participantById.get(lastBehaviour.participantId) : undefined

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-display font-bold text-[#0B0B0C] dark:text-white">Dashboard</h1>

      <DashboardFlagsBanner />

      {lastBehaviour && (
        <div className="rounded-2xl border border-[#E5E5E5] dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6B6B6B]">Continue</p>
          <Link to={`/behaviours/${lastBehaviour.id}?tab=${last?.tab ?? 'episodes'}`} className="block mt-1">
            <div className="font-medium text-[#0B0B0C] dark:text-white">{lastBehaviour.name}</div>
            <div className="text-xs text-slate-500">{lastParticipant?.identifyingDetails}</div>
          </Link>
          <WorkModeLinks behaviourId={lastBehaviour.id} />
        </div>
      )}

      {behaviours?.length === 0 && (
        <EmptyCard
          title="Nothing on the caseload yet"
          body="Add a participant, then a behaviour. Episode log, function screener, and triangulation live on that behaviour."
          actionTo="/participants"
          actionLabel="Add a participant"
        />
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
            <div
              key={b.id}
              className="rounded-2xl border border-[#E5E5E5] dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
            >
              <Link to={`/behaviours/${b.id}`} className="block">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-[#0B0B0C] dark:text-white">{b.name}</div>
                    <div className="text-xs text-slate-500">{participant?.identifyingDetails}</div>
                  </div>
                  <span className="text-xs text-slate-500">{behaviourEpisodes.length} episode(s)</span>
                </div>
              </Link>
              {chartData.length > 1 ? (
                <Link to={`/behaviours/${b.id}?tab=episodes`} className="block h-32 mt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                      <XAxis dataKey="date" fontSize={10} tickLine={false} />
                      <YAxis domain={[0, 4]} fontSize={10} tickLine={false} allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="severity" stroke="#dc2626" dot={false} name="Severity" />
                      <Line type="monotone" dataKey="frequency" stroke="#2563eb" dot={false} name="Frequency" />
                    </LineChart>
                  </ResponsiveContainer>
                </Link>
              ) : (
                <p className="text-xs text-slate-400 mt-3">Log at least 2 episodes to see a trend chart.</p>
              )}
              <WorkModeLinks behaviourId={b.id} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
