import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { acknowledgeFlag, escalateFlagToEfa, resolveFlag } from '../lib/actions'
import { usePractitioner } from '../lib/practitioner'
import type { RiskFlag, RiskFlagStatus } from '../lib/types'

const TRIGGER_LABEL: Record<string, string> = {
  severity_threshold: 'Severity threshold',
  risk_checklist_item: 'Risk checklist item',
  persistent_mismatch: 'Persistent mismatch',
  sustained_low_confidence: 'Sustained low confidence',
}

const STATUS_STYLE: Record<RiskFlagStatus, string> = {
  open: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200',
  acknowledged: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  escalated_to_efa: 'bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200',
  resolved: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

function FlagRow({ flag }: { flag: RiskFlag }) {
  const practitioner = usePractitioner()
  const [resolutionNote, setResolutionNote] = useState('')
  const [showResolveForm, setShowResolveForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleResolve() {
    try {
      await resolveFlag(flag.id, resolutionNote)
      setResolutionNote('')
      setShowResolveForm(false)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resolve flag')
    }
  }

  return (
    <li className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-sm space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-[#333333] dark:text-white">
            {TRIGGER_LABEL[flag.triggerType] ?? flag.triggerType}
          </div>
          <div className="text-slate-500">{flag.triggerDetail}</div>
          <div className="text-xs text-slate-400 mt-1">
            Triggered {new Date(flag.triggeredAt).toLocaleString()}
            {flag.acknowledgedBy && (
              <> · Acknowledged by {flag.acknowledgedBy} on {new Date(flag.acknowledgedAt!).toLocaleString()}</>
            )}
          </div>
          {flag.resolutionNote && (
            <div className="text-xs text-slate-500 mt-1">
              <strong>Resolution:</strong> {flag.resolutionNote}
            </div>
          )}
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[flag.status]}`}>
          {flag.status.replace(/_/g, ' ')}
        </span>
      </div>

      {flag.status === 'open' && (
        <button
          onClick={() => practitioner && acknowledgeFlag(flag.id, practitioner.name)}
          disabled={!practitioner}
          className="rounded-md bg-[#333333] dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        >
          Acknowledge
        </button>
      )}

      {flag.status === 'acknowledged' && (
        <div className="flex flex-wrap items-start gap-2">
          <button
            onClick={() => escalateFlagToEfa(flag.id)}
            className="rounded-md border border-purple-400 text-purple-700 dark:text-purple-300 px-3 py-1.5 text-xs font-medium"
          >
            Escalate to EFA
          </button>
          {!showResolveForm ? (
            <button
              onClick={() => setShowResolveForm(true)}
              className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200"
            >
              Resolve
            </button>
          ) : (
            <div className="w-full space-y-1">
              <textarea
                required
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Resolution note (required)"
                className="block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5 text-xs"
                rows={2}
              />
              <button
                onClick={handleResolve}
                className="rounded-md bg-[#333333] dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 text-xs font-medium"
              >
                Confirm resolve
              </button>
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
          )}
        </div>
      )}
    </li>
  )
}

export function FlagsPanel({ behaviourId }: { behaviourId: string }) {
  const flags = useLiveQuery(
    () => db.riskFlags.where('behaviourId').equals(behaviourId).reverse().sortBy('triggeredAt'),
    [behaviourId],
  )

  if (!flags?.length) {
    return <p className="text-sm text-slate-500">No flags have been raised for this behaviour.</p>
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Flags never disappear silently. Acknowledge records who and when; resolving requires a
        note. This full history — including resolved flags — is part of the audit trail.
      </p>
      <ul className="space-y-2">
        {flags.map((f) => (
          <FlagRow key={f.id} flag={f} />
        ))}
      </ul>
    </div>
  )
}
