import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../lib/db'
import { acknowledgeFlag } from '../lib/actions'
import { usePractitioner } from '../lib/practitioner'

const TRIGGER_LABEL: Record<string, string> = {
  severity_threshold: 'Severity threshold',
  risk_checklist_item: 'Risk checklist item',
  persistent_mismatch: 'Persistent mismatch',
  sustained_low_confidence: 'Sustained low confidence',
}

// Surfaced prominently on the dashboard, not buried in a settings/notifications
// page (brief §4). No backend, so this is in-app state seen when the
// practitioner opens the app — not a push notification (brief §1).
export function DashboardFlagsBanner() {
  const openFlags = useLiveQuery(
    () => db.riskFlags.where('status').equals('open').reverse().sortBy('triggeredAt'),
    [],
  )
  const behaviours = useLiveQuery(() => db.behaviours.toArray(), [])
  const practitioner = usePractitioner()

  const behaviourById = new Map((behaviours ?? []).map((b) => [b.id, b]))

  if (!openFlags?.length) return null

  return (
    <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800 p-4 space-y-3">
      <h2 className="text-sm font-semibold text-red-900 dark:text-red-100">
        {openFlags.length} open flag{openFlags.length === 1 ? '' : 's'} need your attention
      </h2>
      <ul className="space-y-2">
        {openFlags.map((f) => {
          const behaviour = behaviourById.get(f.behaviourId)
          return (
            <li
              key={f.id}
              className="rounded-md bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 p-3 text-sm flex items-start justify-between gap-3"
            >
              <div>
                <div className="font-medium text-[#111111] dark:text-white">
                  {TRIGGER_LABEL[f.triggerType] ?? f.triggerType}
                  {behaviour && (
                    <>
                      {' — '}
                      <Link to={`/behaviours/${behaviour.id}`} className="underline">
                        {behaviour.name}
                      </Link>
                    </>
                  )}
                </div>
                <div className="text-slate-500">{f.triggerDetail}</div>
              </div>
              <button
                onClick={() => practitioner && acknowledgeFlag(f.id, practitioner.name)}
                disabled={!practitioner}
                className="shrink-0 rounded-md bg-[#111111] dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
              >
                Acknowledge
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
