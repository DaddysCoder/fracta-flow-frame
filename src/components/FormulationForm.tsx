import { type FormEvent, useState } from 'react'
import { createFormulation } from '../lib/actions'
import { usePractitioner } from '../lib/practitioner'
import { ChecklistField } from './ChecklistField'
import { emptyEscalationCycle, ESCALATION_PHASE_ITEMS, ESCALATION_PHASE_LABELS, ESCALATION_PHASE_ORDER } from '../lib/scales'
import type { EscalationPhase, EscalationPhaseData } from '../lib/types'

// Structured interview / initial-assessment mode (brief §3). Guided prompts,
// not mandatory structured fields — every prompt resolves to one free-text
// field, nothing is required, and this supports multiple records per
// behaviour rather than a single fixed section.
export function FormulationForm({ behaviourId }: { behaviourId: string }) {
  const practitioner = usePractitioner()
  const [descriptionRecentExample, setDescriptionRecentExample] = useState('')
  const [descriptionIntenseEpisode, setDescriptionIntenseEpisode] = useState('')
  const [descriptionAntecedentAndResponse, setDescriptionAntecedentAndResponse] = useState('')
  const [onset, setOnset] = useState('')
  const [frequencyImpression, setFrequencyImpression] = useState('')
  const [riskScenarioHigh, setRiskScenarioHigh] = useState('')
  const [riskScenarioLow, setRiskScenarioLow] = useState('')
  const [escalationCycle, setEscalationCycle] = useState<Record<EscalationPhase, EscalationPhaseData>>(
    emptyEscalationCycle(),
  )
  const [saved, setSaved] = useState(false)

  function togglePhaseItem(phase: EscalationPhase, item: string) {
    setEscalationCycle((prev) => {
      const phaseData = prev[phase]
      const checkedItems = phaseData.checkedItems.includes(item)
        ? phaseData.checkedItems.filter((i) => i !== item)
        : [...phaseData.checkedItems, item]
      return { ...prev, [phase]: { ...phaseData, checkedItems } }
    })
  }

  function addPhaseCustomItem(phase: EscalationPhase, item: string) {
    setEscalationCycle((prev) => {
      const phaseData = prev[phase]
      return {
        ...prev,
        [phase]: {
          checkedItems: [...phaseData.checkedItems, item],
          customItems: phaseData.customItems.includes(item)
            ? phaseData.customItems
            : [...phaseData.customItems, item],
        },
      }
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!practitioner) return
    await createFormulation({
      behaviourId,
      conductedBy: practitioner.name,
      descriptionRecentExample,
      descriptionIntenseEpisode,
      descriptionAntecedentAndResponse,
      onset,
      frequencyImpression,
      riskScenarioHigh,
      riskScenarioLow,
      escalationCycle,
    })
    setDescriptionRecentExample('')
    setDescriptionIntenseEpisode('')
    setDescriptionAntecedentAndResponse('')
    setOnset('')
    setFrequencyImpression('')
    setRiskScenarioHigh('')
    setRiskScenarioLow('')
    setEscalationCycle(emptyEscalationCycle())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4"
    >
      <div>
        <h2 className="text-sm font-semibold text-[#111111] dark:text-white">New formulation record</h2>
        <p className="text-xs text-slate-500 mt-1">
          Used once, early, at initial assessment — separate from ongoing episode logging. Every
          prompt is scaffolding for the conversation; nothing here is required.
        </p>
      </div>

      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        Can you describe a recent time this happened? What did it look like?
        <textarea
          value={descriptionRecentExample}
          onChange={(e) => setDescriptionRecentExample(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        Can you describe a time it was especially intense?
        <textarea
          value={descriptionIntenseEpisode}
          onChange={(e) => setDescriptionIntenseEpisode(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        What happened right before it, and how did you respond?
        <textarea
          value={descriptionAntecedentAndResponse}
          onChange={(e) => setDescriptionAntecedentAndResponse(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        When did this start?
        <input
          value={onset}
          onChange={(e) => setOnset(e.target.value)}
          placeholder="Approximate/recalled is fine — not a precise date"
          className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
        />
      </label>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          How often does this happen?
          <input
            value={frequencyImpression}
            onChange={(e) => setFrequencyImpression(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
          />
        </label>
        <p className="text-xs text-slate-400 mt-1">
          This is the interview-stage impression only — it never feeds the triangulation
          confidence calculation, which uses real logged episodes exclusively.
        </p>
      </div>

      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        What does a high-risk situation look like?
        <textarea
          value={riskScenarioHigh}
          onChange={(e) => setRiskScenarioHigh(e.target.value)}
          rows={2}
          className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        What does a lower-risk/manageable situation look like?
        <textarea
          value={riskScenarioLow}
          onChange={(e) => setRiskScenarioLow(e.target.value)}
          rows={2}
          className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
        />
      </label>

      <div>
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">Behaviour escalation cycle</h3>
        <p className="text-xs text-slate-500 mt-0.5 mb-2">
          What this behaviour typically looks like at each phase — captured once here, not
          re-entered per incident.
        </p>
        <div className="space-y-3">
          {ESCALATION_PHASE_ORDER.map((phase) => (
            <ChecklistField
              key={phase}
              label={ESCALATION_PHASE_LABELS[phase]}
              items={[...ESCALATION_PHASE_ITEMS[phase], ...escalationCycle[phase].customItems]}
              selected={escalationCycle[phase].checkedItems}
              onToggle={(item) => togglePhaseItem(phase, item)}
              onAddCustom={(item) => addPhaseCustomItem(phase, item)}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!practitioner}
          className="rounded-md bg-[#111111] dark:bg-white text-white dark:text-slate-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Save formulation record
        </button>
        {saved && <span className="text-sm text-green-600">Saved</span>}
      </div>
    </form>
  )
}
