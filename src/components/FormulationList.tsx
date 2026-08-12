import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { ESCALATION_PHASE_LABELS, ESCALATION_PHASE_ORDER } from '../lib/scales'

type FreeTextField =
  | 'descriptionRecentExample'
  | 'descriptionIntenseEpisode'
  | 'descriptionAntecedentAndResponse'
  | 'onset'
  | 'frequencyImpression'
  | 'riskScenarioHigh'
  | 'riskScenarioLow'

const FIELD_LABELS: { key: FreeTextField; label: string }[] = [
  { key: 'descriptionRecentExample', label: 'Recent example' },
  { key: 'descriptionIntenseEpisode', label: 'Especially intense episode' },
  { key: 'descriptionAntecedentAndResponse', label: 'What happened before, and the response' },
  { key: 'onset', label: 'Onset' },
  { key: 'frequencyImpression', label: 'Frequency (interview impression)' },
  { key: 'riskScenarioHigh', label: 'High-risk scenario' },
  { key: 'riskScenarioLow', label: 'Lower-risk/manageable scenario' },
]

export function FormulationList({ behaviourId }: { behaviourId: string }) {
  const records = useLiveQuery(
    () => db.formulations.where('behaviourId').equals(behaviourId).reverse().sortBy('conductedAt'),
    [behaviourId],
  )

  if (!records?.length) {
    return <p className="text-sm text-slate-500">No formulation records yet.</p>
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-[#111111] dark:text-white">
        Formulation records ({records.length})
      </h2>
      <ul className="space-y-3">
        {records.map((r) => (
          <li
            key={r.id}
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2 text-sm"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-[#111111] dark:text-white">
                {new Date(r.conductedAt).toLocaleString()}
              </span>
              <span className="text-xs text-slate-500">Conducted by {r.conductedBy}</span>
            </div>
            {FIELD_LABELS.map(({ key, label }) => {
              const value = r[key]
              return value ? (
                <p key={key} className="text-slate-600 dark:text-slate-400">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{label}:</span> {value}
                </p>
              ) : null
            })}
            {ESCALATION_PHASE_ORDER.some(
              (phase) => r.escalationCycle[phase].checkedItems.length > 0,
            ) && (
              <div className="pt-1">
                <span className="font-medium text-slate-700 dark:text-slate-300">Escalation cycle:</span>
                <ul className="mt-1 space-y-0.5">
                  {ESCALATION_PHASE_ORDER.filter(
                    (phase) => r.escalationCycle[phase].checkedItems.length > 0,
                  ).map((phase) => (
                    <li key={phase} className="text-slate-600 dark:text-slate-400">
                      <span className="text-slate-500">{ESCALATION_PHASE_LABELS[phase]}:</span>{' '}
                      {r.escalationCycle[phase].checkedItems.join(', ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
