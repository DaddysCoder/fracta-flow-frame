import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useParams } from 'react-router-dom'
import { db } from '../lib/db'
import { EpisodeForm } from '../components/EpisodeForm'
import { EpisodeList } from '../components/EpisodeList'
import { ScreenerForm } from '../components/ScreenerForm'
import { ScreenerList } from '../components/ScreenerList'
import { HypothesisPanel } from '../components/HypothesisPanel'

type Tab = 'episodes' | 'screener' | 'triangulation'

export function BehaviourDetail() {
  const { behaviourId = '' } = useParams()
  const behaviour = useLiveQuery(() => db.behaviours.get(behaviourId), [behaviourId])
  const participant = useLiveQuery(
    () => (behaviour ? db.participants.get(behaviour.participantId) : undefined),
    [behaviour],
  )
  const [tab, setTab] = useState<Tab>('episodes')

  if (!behaviour) return <p className="text-sm text-slate-500">Loading…</p>

  return (
    <div className="space-y-6">
      <div>
        {participant && (
          <Link to={`/participants/${participant.id}`} className="text-sm text-slate-500 hover:underline">
            ← {participant.identifyingDetails}
          </Link>
        )}
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white mt-1">{behaviour.name}</h1>
        <p className="text-sm text-slate-500 mt-1">{behaviour.operationalDefinition}</p>
      </div>

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {(['episodes', 'screener', 'triangulation'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500'
            }`}
          >
            {t === 'episodes' ? 'Episode log' : t === 'screener' ? 'Function screener' : 'Triangulation'}
          </button>
        ))}
      </div>

      {tab === 'episodes' && (
        <div className="space-y-6">
          <EpisodeForm behaviourId={behaviourId} />
          <EpisodeList behaviourId={behaviourId} />
        </div>
      )}

      {tab === 'screener' && (
        <div className="space-y-6">
          <ScreenerForm behaviourId={behaviourId} />
          <ScreenerList behaviourId={behaviourId} />
        </div>
      )}

      {tab === 'triangulation' && <HypothesisPanel behaviourId={behaviourId} />}
    </div>
  )
}
