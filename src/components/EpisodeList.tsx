import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { FREQUENCY_SCALE, SEVERITY_SCALE } from '../lib/scales'
import type { Episode } from '../lib/types'
import { EmptyCard } from './EmptyCard'

export function EpisodeList({
  behaviourId,
  openEpisodeId,
  onOpen,
}: {
  behaviourId: string
  openEpisodeId: string | null
  onOpen: (episodeId: string | null) => void
}) {
  const episodes = useLiveQuery(
    () => db.episodes.where('behaviourId').equals(behaviourId).reverse().sortBy('dateTime'),
    [behaviourId],
  )

  if (!episodes?.length) {
    return (
      <EmptyCard
        title="No episodes yet"
        body="Use the steps above to log the first incident. Open a saved episode from this list when you need the full ABC."
      />
    )
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-[#0B0B0C] dark:text-white">
        Episodes ({episodes.length})
      </h2>
      <ul className="rounded-2xl border border-[#E5E5E5] dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
        {episodes.map((ep) => (
          <li key={ep.id}>
            <button
              type="button"
              onClick={() => onOpen(openEpisodeId === ep.id ? null : ep.id)}
              className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-[#0B0B0C] dark:text-white">
                  {new Date(ep.dateTime).toLocaleString()}
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  {ep.captureSource === 'field' && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide rounded-full bg-[#E8542E]/15 text-[#E8542E] px-2 py-0.5">
                      Field
                    </span>
                  )}
                  <span className="text-xs rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5">
                    Severity {ep.severityRating} — {SEVERITY_SCALE[ep.severityRating].label}
                  </span>
                </span>
              </div>
              {ep.riskFlags.length > 0 && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">Risk flagged</p>
              )}
            </button>
            {openEpisodeId === ep.id && <EpisodeDetail episode={ep} />}
          </li>
        ))}
      </ul>
    </div>
  )
}

function EpisodeDetail({ episode }: { episode: Episode }) {
  return (
    <div className="px-4 pb-4 space-y-2 text-sm text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
      {episode.durationMinutes != null && <p>Duration: {episode.durationMinutes} min</p>}
      {episode.settingEvent && (
        <p>
          <span className="font-medium text-[#0B0B0C] dark:text-white">Setting:</span> {episode.settingEvent}
        </p>
      )}
      <p>
        <span className="font-medium text-[#0B0B0C] dark:text-white">Antecedent ({episode.antecedentTag}):</span>{' '}
        {episode.antecedentText}
      </p>
      <p>
        <span className="font-medium text-[#0B0B0C] dark:text-white">Consequence ({episode.consequenceTag}):</span>{' '}
        {episode.consequenceText}
      </p>
      <p>
        Frequency: {episode.frequencyContext} — {FREQUENCY_SCALE[episode.frequencyContext].label}
      </p>
      {episode.riskFlags.length > 0 && (
        <p className="text-red-600 dark:text-red-400">Risk: {episode.riskFlags.join(', ')}</p>
      )}
      <p className="text-xs text-slate-400">Logged by {episode.loggedBy}{episode.captureSource === 'field' ? ' · Field capture' : ''}</p>
    </div>
  )
}
