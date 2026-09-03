import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { recomputeHypothesis } from '../lib/actions'
import { DOMAIN_LABELS } from '../lib/screener'
import type { AgreementStatus, ConfidenceLevel } from '../lib/types'
import { useEntitlement } from '../context/AuthContext'
import { canUseProFeature } from '../../shared/entitlement'
import { ProBadge, ProGate } from './ProGate'
import { ProfessionalToolDisclaimer } from './ProfessionalToolDisclaimer'

const AGREEMENT_LABEL: Record<AgreementStatus, string> = {
  match: 'Match',
  partial_match: 'Partial match',
  mismatch: 'Mismatch',
  insufficient_data: 'Insufficient data',
}

const AGREEMENT_STYLE: Record<AgreementStatus, string> = {
  match: 'bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200',
  partial_match: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  mismatch: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200',
  insufficient_data: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  low: 'Low confidence',
  moderate: 'Moderate confidence',
  high: 'High confidence',
}

const CAVEAT =
  'Even a full match between screener and observed pattern is not equivalent to confirmation via experimental functional analysis. This is a hypothesis for your clinical judgement, not a determination of function.'

export function HypothesisPanel({ behaviourId }: { behaviourId: string }) {
  const entitlement = useEntitlement()
  const screenerCount = useLiveQuery(
    () => db.screeners.where('behaviourId').equals(behaviourId).count(),
    [behaviourId],
  )
  const latest = useLiveQuery(async () => {
    const all = await db.hypotheses.where('behaviourId').equals(behaviourId).sortBy('computedAt')
    return all.length ? all[all.length - 1] : null
  }, [behaviourId])
  const episodes = useLiveQuery(
    () => db.episodes.where('behaviourId').equals(behaviourId).toArray(),
    [behaviourId],
  )
  const screeners = useLiveQuery(
    () => db.screeners.where('behaviourId').equals(behaviourId).toArray(),
    [behaviourId],
  )

  const [pending, setPending] = useState(false)
  const [blockedReason, setBlockedReason] = useState<string | null>(null)
  const [showReceipts, setShowReceipts] = useState(false)

  const multiInformant = (screenerCount ?? 0) > 1
  const multiComparisonAllowed = canUseProFeature('multi_informant_comparison', entitlement)

  async function handleRecompute() {
    if (multiInformant && !multiComparisonAllowed) return
    setPending(true)
    const outcome = await recomputeHypothesis(behaviourId)
    setBlockedReason(outcome.status === 'blocked' ? outcome.reason : null)
    setPending(false)
  }

  const episodeById = new Map((episodes ?? []).map((e) => [e.id, e]))
  const screenerById = new Map((screeners ?? []).map((s) => [s.id, s]))

  const showNudge =
    latest &&
    (latest.agreementStatus === 'mismatch' ||
      (latest.confidenceLevel === 'low' && latest.episodeCount >= 3))

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-700 p-3 text-sm text-amber-900 dark:text-amber-100">
        {CAVEAT}
      </div>
      <ProfessionalToolDisclaimer />

      {screenerCount === 0 && (
        <p className="text-sm text-slate-500">
          Complete a function screener for this behaviour before computing a hypothesis.
        </p>
      )}

      {multiInformant && (
        <ProGate
          allowed={multiComparisonAllowed}
          feature="Multiple-informant evidence comparison"
        >
          <div className="rounded-md border border-purple-200 bg-purple-50 dark:bg-purple-950 dark:border-purple-800 p-3 text-sm text-purple-900 dark:text-purple-100 flex items-center gap-2">
            <span>
              {screenerCount} completed screeners — comparison uses all informant responses together.
            </span>
            {!multiComparisonAllowed && <ProBadge />}
          </div>
        </ProGate>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleRecompute}
          disabled={pending || screenerCount === 0 || (multiInformant && !multiComparisonAllowed)}
          className="rounded-md bg-[#111111] dark:bg-white text-white dark:text-slate-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {pending ? 'Computing…' : 'Recompute hypothesis'}
        </button>
        <span className="text-xs text-slate-500">
          {latest
            ? `Last computed ${new Date(latest.computedAt).toLocaleString()}`
            : 'Never computed — this only runs when you click the button above.'}
        </span>
      </div>

      {blockedReason && <p className="text-sm text-red-600">{blockedReason}</p>}

      {latest && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${AGREEMENT_STYLE[latest.agreementStatus]}`}>
              {AGREEMENT_LABEL[latest.agreementStatus]}
            </span>
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-sm font-medium text-slate-700 dark:text-slate-300">
              {CONFIDENCE_LABEL[latest.confidenceLevel]}
            </span>
            {latest.screenerDisagreement && multiComparisonAllowed && (
              <span className="rounded-full bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-200 px-3 py-1 text-sm font-medium">
                Screeners disagree
              </span>
            )}
            {latest.screenerDisagreement && !multiComparisonAllowed && <ProBadge />}
          </div>

          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-slate-500">Screener top domain(s)</dt>
              <dd className="text-[#111111] dark:text-white">
                {latest.screenerFunctionResult.length
                  ? latest.screenerFunctionResult.map((d) => DOMAIN_LABELS[d]).join(', ')
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Dominant episode pattern</dt>
              <dd className="text-[#111111] dark:text-white">
                {latest.episodePatternResult ? DOMAIN_LABELS[latest.episodePatternResult] : 'No clear pattern'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Episodes considered</dt>
              <dd className="text-[#111111] dark:text-white">{latest.episodeCount}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Distinct days</dt>
              <dd className="text-[#111111] dark:text-white">{latest.distinctDayCount}</dd>
            </div>
          </dl>

          {showNudge && (
            <div className="rounded-md border border-blue-300 bg-blue-50 dark:bg-blue-950 dark:border-blue-700 p-3 text-sm text-blue-900 dark:text-blue-200">
              {latest.agreementStatus === 'mismatch'
                ? 'Screener and episode data disagree. Consider continuing descriptive data collection, or discussing experimental functional analysis with a senior practitioner.'
                : 'Confidence remains low after a reasonable number of episodes. Consider continuing descriptive data collection across more days, or experimental functional analysis.'}
            </div>
          )}

          <button
            onClick={() => setShowReceipts((v) => !v)}
            className="text-sm text-slate-600 dark:text-slate-300 underline"
          >
            {showReceipts ? 'Hide' : 'Show'} what fed this computation
          </button>

          {showReceipts && (
            <div className="space-y-3 text-sm border-t border-slate-200 dark:border-slate-800 pt-3">
              <div>
                <h3 className="font-medium text-[#111111] dark:text-white mb-1">
                  Screener(s) ({latest.contributingScreenerIds.length})
                </h3>
                <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                  {latest.contributingScreenerIds.map((id) => {
                    const s = screenerById.get(id)
                    return (
                      <li key={id}>
                        {s ? `${new Date(s.dateCompleted).toLocaleDateString()} — ${s.informantRole}` : id}
                      </li>
                    )
                  })}
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-[#111111] dark:text-white mb-1">
                  Episodes ({latest.contributingEpisodeIds.length})
                </h3>
                <ul className="space-y-1 text-slate-600 dark:text-slate-400 max-h-48 overflow-y-auto">
                  {latest.contributingEpisodeIds.map((id) => {
                    const e = episodeById.get(id)
                    return (
                      <li key={id}>
                        {e
                          ? `${new Date(e.dateTime).toLocaleString()} — consequence: ${e.consequenceTag}`
                          : id}
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
