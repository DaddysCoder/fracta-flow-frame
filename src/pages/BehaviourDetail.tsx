import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { db } from '../lib/db'
import { rememberLastWork } from '../lib/lastWork'
import { BEHAVIOUR_TABS, parseBehaviourTab } from '../lib/workModes'
import { EpisodeForm } from '../components/EpisodeForm'
import { EpisodeList } from '../components/EpisodeList'
import { ScreenerForm } from '../components/ScreenerForm'
import { ScreenerList } from '../components/ScreenerList'
import { HypothesisPanel } from '../components/HypothesisPanel'
import { FlagsPanel } from '../components/FlagsPanel'
import { HandoffPanel } from '../components/HandoffPanel'
import { FieldCapturePanel } from '../components/FieldCapturePanel'
import { WorkModeBar } from '../components/WorkModeBar'

export function BehaviourDetail() {
  const { behaviourId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = parseBehaviourTab(searchParams.get('tab'))
  const openEpisodeId = searchParams.get('episode')

  const behaviour = useLiveQuery(() => db.behaviours.get(behaviourId), [behaviourId])
  const participant = useLiveQuery(
    () => (behaviour ? db.participants.get(behaviour.participantId) : undefined),
    [behaviour],
  )

  useEffect(() => {
    if (behaviourId) rememberLastWork(behaviourId, tab)
  }, [behaviourId, tab])

  function setTab(next: (typeof BEHAVIOUR_TABS)[number]['id']) {
    const nextParams: Record<string, string> = { tab: next }
    setSearchParams(nextParams, { replace: true })
  }

  function setOpenEpisode(episodeId: string | null) {
    const next: Record<string, string> = { tab: 'episodes' }
    if (episodeId) next.episode = episodeId
    setSearchParams(next, { replace: true })
  }

  if (!behaviour) return <p className="text-sm text-slate-500">Loading…</p>

  return (
    <div className="space-y-6">
      <div>
        {participant && (
          <Link to={`/participants/${participant.id}`} className="text-sm text-slate-500 hover:underline">
            ← {participant.identifyingDetails}
          </Link>
        )}
        <h1 className="text-xl font-display font-bold text-[#0B0B0C] dark:text-white mt-1">{behaviour.name}</h1>
        <p className="text-sm text-slate-500 mt-1">{behaviour.operationalDefinition}</p>
      </div>

      <WorkModeBar
        items={BEHAVIOUR_TABS.map((t) => ({ id: t.id, label: t.label }))}
        value={tab}
        onChange={setTab}
      />

      {tab === 'episodes' && (
        <div className="space-y-6">
          <EpisodeForm behaviourId={behaviourId} />
          <FieldCapturePanel behaviourId={behaviourId} />
          <EpisodeList
            behaviourId={behaviourId}
            openEpisodeId={openEpisodeId}
            onOpen={setOpenEpisode}
          />
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
