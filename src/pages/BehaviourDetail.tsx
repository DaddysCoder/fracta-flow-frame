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
import { SummaryStatementPanel } from '../components/SummaryStatementPanel'
import { BehaviourTrendChart } from '../components/BehaviourTrendChart'

type Tab = 'formulation' | 'episodes' | 'screener' | 'triangulation' | 'flags' | 'handoff'

const TAB_LABEL: Record<Tab, string> = {
  formulation: 'Formulation',
  episodes: 'Episode log',
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
  const [tab, setTab] = useState<Tab>('formulation')

  if (!behaviour) return <p className="text-sm text-slate-500">Loading…</p>

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
      </div>

      <SummaryStatementPanel behaviourId={behaviourId} />

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {(['formulation', 'episodes', 'screener', 'triangulation', 'flags', 'handoff'] as Tab[]).map((t) => (
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

      {tab === 'formulation' && (
        <div className="space-y-6">
          <FormulationForm behaviourId={behaviourId} />
          <FormulationList behaviourId={behaviourId} />
        </div>
      )}

      {tab === 'episodes' && (
        <div className="space-y-6">
          <BehaviourTrendChart behaviourId={behaviourId} />
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

      {tab === 'flags' && <FlagsPanel behaviourId={behaviourId} />}

      {tab === 'handoff' && <HandoffPanel behaviourId={behaviourId} />}
    </div>
  )
}
