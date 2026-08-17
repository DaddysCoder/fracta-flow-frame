import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { ESCALATION_PHASES, ESCALATION_PHASE_LABEL, resolveEscalationCycleDisplay } from '../lib/escalationContent'

export function FormulationList({ behaviourId }: { behaviourId: string }) {
  const formulations = useLiveQuery(
    () => db.formulations.where('behaviourId').equals(behaviourId).reverse().sortBy('conductedAt'),
    [behaviourId],
  )
  const [openId, setOpenId] = useState<string | null>(null)

  if (!formulations?.length) {
    return <p className="text-sm text-slate-500">No formulation interviews recorded yet.</p>
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-[#111111] dark:text-white">
        Formulation interviews ({formulations.length})
      </h2>
      <ul className="divide-y divide-slate-200 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {formulations.map((f) => {
          const open = openId === f.id
          const resolvedCycle = resolveEscalationCycleDisplay(f.escalationCycle)
          return (
            <li key={f.id} className="p-4 text-sm">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : f.id)}
                className="w-full flex items-center justify-between gap-4 text-left"
              >
                <span>
                  <span className="font-medium text-[#111111] dark:text-white">{f.informantName}</span>{' '}
                  <span className="text-slate-500">({f.informantRole})</span>
                </span>
                <span className="text-xs text-slate-400 shrink-0">
                  {new Date(f.conductedAt).toLocaleDateString()} {open ? '▾' : '▸'}
                </span>
              </button>

              {open && (
                <div className="mt-3 space-y-3 text-slate-600 dark:text-slate-400">
                  {f.onset && (
                    <p>
                      <span className="font-medium text-slate-700 dark:text-slate-300">Onset:</span> {f.onset}
                    </p>
                  )}
                  {f.frequencyImpression && (
                    <p>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        Frequency impression:
                      </span>{' '}
                      {f.frequencyImpression}
                    </p>
                  )}
                  {f.descriptionPrompts.recentExample && (
                    <p>
                      <span className="font-medium text-slate-700 dark:text-slate-300">Recent example:</span>{' '}
                      {f.descriptionPrompts.recentExample}
                    </p>
                  )}
                  {f.descriptionPrompts.intenseEpisode && (
                    <p>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        Most intense episode:
                      </span>{' '}
                      {f.descriptionPrompts.intenseEpisode}
                    </p>
                  )}
                  {f.descriptionPrompts.antecedentAndResponse && (
                    <p>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        Typical antecedent/response:
                      </span>{' '}
                      {f.descriptionPrompts.antecedentAndResponse}
                    </p>
                  )}
                  {(f.riskScenarios.highRisk || f.riskScenarios.lowRisk) && (
                    <div className="grid grid-cols-2 gap-3">
                      {f.riskScenarios.highRisk && (
                        <p>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            Highest-risk scenario:
                          </span>{' '}
                          {f.riskScenarios.highRisk}
                        </p>
                      )}
                      {f.riskScenarios.lowRisk && (
                        <p>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            Lowest-risk scenario:
                          </span>{' '}
                          {f.riskScenarios.lowRisk}
                        </p>
                      )}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">Escalation cycle</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {ESCALATION_PHASES.map((phase) => (
                        <p key={phase} className="text-xs">
                          <span className="font-medium text-slate-500">
                            {ESCALATION_PHASE_LABEL[phase]}:
                          </span>{' '}
                          {resolvedCycle[phase].length ? resolvedCycle[phase].join(', ') : '—'}
                        </p>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">Conducted by {f.conductedBy}</p>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
