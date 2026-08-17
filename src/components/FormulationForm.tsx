import { type FormEvent, useState } from 'react'
import { createFormulation } from '../lib/actions'
import { usePractitioner } from '../lib/practitioner'
import {
  ESCALATION_ITEMS,
  ESCALATION_PHASES,
  ESCALATION_PHASE_LABEL,
  emptyEscalationCycle,
} from '../lib/escalationContent'
import type { EscalationCycle, EscalationPhase } from '../lib/types'
import { Tooltip } from './Tooltip'

const emptyPrompts = { recentExample: '', intenseEpisode: '', antecedentAndResponse: '' }
const emptyRiskScenarios = { highRisk: '', lowRisk: '' }

export function FormulationForm({ behaviourId }: { behaviourId: string }) {
  const practitioner = usePractitioner()
  const [informantName, setInformantName] = useState('')
  const [informantRole, setInformantRole] = useState('')
  const [onset, setOnset] = useState('')
  const [frequencyImpression, setFrequencyImpression] = useState('')
  const [prompts, setPrompts] = useState(emptyPrompts)
  const [riskScenarios, setRiskScenarios] = useState(emptyRiskScenarios)
  const [cycle, setCycle] = useState<EscalationCycle>(emptyEscalationCycle())
  const [customDraft, setCustomDraft] = useState<Record<EscalationPhase, string>>(
    Object.fromEntries(ESCALATION_PHASES.map((p) => [p, ''])) as Record<EscalationPhase, string>,
  )
  const [saved, setSaved] = useState(false)

  function toggleItem(phase: EscalationPhase, itemId: string) {
    setCycle((prev) => {
      const entry = prev[phase]
      const checkedItems = entry.checkedItems.includes(itemId)
        ? entry.checkedItems.filter((id) => id !== itemId)
        : [...entry.checkedItems, itemId]
      return { ...prev, [phase]: { ...entry, checkedItems } }
    })
  }

  function addCustomItem(phase: EscalationPhase) {
    const text = customDraft[phase].trim()
    if (!text) return
    setCycle((prev) => ({
      ...prev,
      [phase]: { ...prev[phase], customItems: [...prev[phase].customItems, text] },
    }))
    setCustomDraft((prev) => ({ ...prev, [phase]: '' }))
  }

  function removeCustomItem(phase: EscalationPhase, text: string) {
    setCycle((prev) => ({
      ...prev,
      [phase]: { ...prev[phase], customItems: prev[phase].customItems.filter((t) => t !== text) },
    }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!practitioner || !informantName.trim() || !informantRole.trim()) return
    await createFormulation({
      behaviourId,
      informantName,
      informantRole,
      conductedBy: practitioner.name,
      descriptionPrompts: prompts,
      onset,
      frequencyImpression,
      riskScenarios,
      escalationCycle: cycle,
    })
    setInformantName('')
    setInformantRole('')
    setOnset('')
    setFrequencyImpression('')
    setPrompts(emptyPrompts)
    setRiskScenarios(emptyRiskScenarios)
    setCycle(emptyEscalationCycle())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4"
    >
      <div>
        <h2 className="text-sm font-semibold text-[#111111] dark:text-white">New formulation interview</h2>
        <p className="text-xs text-slate-500 mt-1">
          A behaviour can have more than one formulation over time — different informants,
          revisited understanding. Saving here adds a new dated record; it never overwrites a
          past interview.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Informant name
          <input
            required
            value={informantName}
            onChange={(e) => setInformantName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Informant role
          <input
            required
            value={informantRole}
            onChange={(e) => setInformantRole(e.target.value)}
            placeholder="e.g. support worker, parent, sibling"
            className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        Onset
        <input
          value={onset}
          onChange={(e) => setOnset(e.target.value)}
          placeholder="When did this behaviour start / change?"
          className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        Frequency impression{' '}
        <span className="font-normal text-xs text-slate-400">
          (interview-stage impression only — not used in the computed confidence tier)
        </span>
        <input
          value={frequencyImpression}
          onChange={(e) => setFrequencyImpression(e.target.value)}
          className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
        />
      </label>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Describe a recent example
          <textarea
            rows={2}
            value={prompts.recentExample}
            onChange={(e) => setPrompts((p) => ({ ...p, recentExample: e.target.value }))}
            className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Describe the most intense episode
          <textarea
            rows={2}
            value={prompts.intenseEpisode}
            onChange={(e) => setPrompts((p) => ({ ...p, intenseEpisode: e.target.value }))}
            className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          What typically comes before and after
          <textarea
            rows={2}
            value={prompts.antecedentAndResponse}
            onChange={(e) => setPrompts((p) => ({ ...p, antecedentAndResponse: e.target.value }))}
            className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Highest-risk scenario
          <textarea
            rows={2}
            value={riskScenarios.highRisk}
            onChange={(e) => setRiskScenarios((r) => ({ ...r, highRisk: e.target.value }))}
            className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Lowest-risk / most manageable scenario
          <textarea
            rows={2}
            value={riskScenarios.lowRisk}
            onChange={(e) => setRiskScenarios((r) => ({ ...r, lowRisk: e.target.value }))}
            className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div>
        <span className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
          <Tooltip term="behaviour">Escalation cycle</Tooltip>
        </span>
        <div className="space-y-3">
          {ESCALATION_PHASES.map((phase) => (
            <div key={phase} className="rounded-md border border-slate-200 dark:border-slate-800 p-3">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                {ESCALATION_PHASE_LABEL[phase]}
              </p>
              <div className="flex flex-wrap gap-2">
                {ESCALATION_ITEMS[phase].map((item) => (
                  <label
                    key={item.id}
                    className={`cursor-pointer rounded-md border px-2 py-1 text-xs ${
                      cycle[phase].checkedItems.includes(item.id)
                        ? 'border-[#111111] dark:border-white bg-[#111111] dark:bg-white text-white dark:text-slate-900'
                        : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={cycle[phase].checkedItems.includes(item.id)}
                      onChange={() => toggleItem(phase, item.id)}
                    />
                    {item.label}
                  </label>
                ))}
                {cycle[phase].customItems.map((text) => (
                  <span
                    key={text}
                    className="flex items-center gap-1 rounded-md border border-dashed border-slate-400 px-2 py-1 text-xs text-slate-600 dark:text-slate-300"
                  >
                    {text}
                    <button
                      type="button"
                      onClick={() => removeCustomItem(phase, text)}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                      aria-label={`Remove ${text}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={customDraft[phase]}
                  onChange={(e) => setCustomDraft((prev) => ({ ...prev, [phase]: e.target.value }))}
                  placeholder="Add your own"
                  className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addCustomItem(phase)
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => addCustomItem(phase)}
                  className="rounded-md border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs text-slate-600 dark:text-slate-300"
                >
                  Add
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!practitioner || !informantName.trim() || !informantRole.trim()}
          className="rounded-md bg-[#111111] dark:bg-white text-white dark:text-slate-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Save formulation
        </button>
        {saved && <span className="text-sm text-green-600">Saved</span>}
      </div>
    </form>
  )
}
