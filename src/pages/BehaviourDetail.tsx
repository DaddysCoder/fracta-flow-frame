import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useParams } from 'react-router-dom'
import { db } from '../lib/db'
import { EpisodeForm } from '../components/EpisodeForm'
import { EpisodeList } from '../components/EpisodeList'
import { ScreenerForm } from '../components/ScreenerForm'
import { ScreenerList } from '../components/ScreenerList'
import { HypothesisPanel } from '../components/HypothesisPanel'
import { FlagsPanel } from '../components/FlagsPanel'
import { HandoffPanel } from '../components/HandoffPanel'
import { FormulationForm } from '../components/FormulationForm'
import { FormulationList } from '../components/FormulationList'
import { InfoHint } from '../components/InfoHint'
import { buildSummaryStatement } from '../lib/summaryStatement'

type Tab = 'episodes' | 'formulation' | 'screener' | 'triangulation' | 'flags' | 'handoff'

const TAB_LABEL: Record<Tab, string> = {
  episodes: 'Episode log',
  formulation: 'Formulation',
  screener: 'Function screener',
  triangulation: 'Triangulation',
  flags: 'Flags',
  handoff: 'Multi-informant',
}

export function BehaviourDetail() {
  const { behaviourId = '' } = useParams()
  const behaviour = useLiveQuery(() => db.behaviours.get(behaviourId), [behaviourId])
  const participant = useLiveQuery(
    () => (behaviour ? db.participants.get(behaviour.participantId) : undefined),
    [behaviour],
  )
  const episodes = useLiveQuery(
    () => db.episodes.where('behaviourId').equals(behaviourId).toArray(),
    [behaviourId],
  )
  const latestHypothesis = useLiveQuery(async () => {
    const all = await db.hypotheses.where('behaviourId').equals(behaviourId).sortBy('computedAt')
    return all.length ? all[all.length - 1] : null
  }, [behaviourId])
  const [tab, setTab] = useState<Tab>('episodes')

  if (!behaviour) return <p className="text-sm text-slate-500">Loading…</p>

  const summaryStatement =
    episodes !== undefined && latestHypothesis !== undefined
      ? buildSummaryStatement(behaviour, episodes, latestHypothesis)
      : null

  return (
    <div className="space-y-6">
      <div>
        {participant && (
          <Link to={`/participants/${participant.id}`} className="text-sm text-slate-500 hover:underline">
            ← {participant.identifyingDetails}
          </Link>
        )}
        <h1 className="text-xl font-display font-bold text-[#111111] dark:text-white mt-1">{behaviour.name}</h1>
        <p className="text-sm text-slate-500 mt-1">{behaviour.operationalDefinition}</p>
        {behaviour.concernCategories.length > 0 && (
          <p className="text-xs text-slate-400 mt-1">{behaviour.concernCategories.join(', ')}</p>
        )}
      </div>

      {summaryStatement && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Summary statement
            <InfoHint term="summaryStatement" />
          </h2>
          <p className="text-sm text-[#111111] dark:text-white">{summaryStatement}</p>
        </div>
      )}

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 flex-wrap">
        {(['episodes', 'formulation', 'screener', 'triangulation', 'flags', 'handoff'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t
                ? 'border-[#111111] dark:border-white text-[#111111] dark:text-white'
                : 'border-transparent text-slate-500'
            }`}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {tab === 'episodes' && (
        <div className="space-y-6">
          <EpisodeForm behaviourId={behaviourId} />
          <EpisodeList behaviourId={behaviourId} />
        </div>
      )}

      {tab === 'formulation' && (
        <div className="space-y-6">
          <FormulationForm behaviourId={behaviourId} />
          <FormulationList behaviourId={behaviourId} />
        </div>
      )}

      {tab === 'screener' && (
        <div className="space-y-6">
          <ScreenerForm behaviourId={behaviourId} />
          <ScreenerList behaviourId={behaviourId} />
        </div>
      )}

      {tab === 'triangulation' && <HypothesisPanel behaviourId={behaviourId} />}

      {tab === 'flags' && <FlagsPanel behaviourId={behaviourId} />}

      {tab === 'handoff' && <HandoffPanel behaviourId={behaviourId} />}
    </div>
  )
}
