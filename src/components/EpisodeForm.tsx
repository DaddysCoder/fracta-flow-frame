import { type FormEvent, useState } from 'react'
import { createEpisode } from '../lib/actions'
import { usePractitioner } from '../lib/practitioner'
import {
  ANTECEDENT_TAGS,
  CONSEQUENCE_TAGS,
  FREQUENCY_SCALE,
  RISK_FLAG_OPTIONS,
  SEVERITY_SCALE,
} from '../lib/scales'
import type { AntecedentTag, ConsequenceTag, RiskFlagItem } from '../lib/types'
import { WorkModeBar } from './WorkModeBar'

type Step = 'when' | 'setting' | 'abc' | 'ratings' | 'risk'

const STEPS: { id: Step; label: string }[] = [
  { id: 'when', label: 'When' },
  { id: 'setting', label: 'Setting' },
  { id: 'abc', label: 'ABC' },
  { id: 'ratings', label: 'Ratings' },
  { id: 'risk', label: 'Risk' },
]

function nowLocal(): string {
  const d = new Date()
  d.setSeconds(0, 0)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

const inputClass =
  'mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm'

export function EpisodeForm({ behaviourId }: { behaviourId: string }) {
  const practitioner = usePractitioner()
  const [step, setStep] = useState<Step>('when')
  const [dateTime, setDateTime] = useState(nowLocal())
  const [durationMinutes, setDurationMinutes] = useState('')
  const [severityRating, setSeverityRating] = useState<0 | 1 | 2 | 3>(0)
  const [frequencyContext, setFrequencyContext] = useState<0 | 1 | 2 | 3 | 4>(0)
  const [settingEvent, setSettingEvent] = useState('')
  const [antecedentText, setAntecedentText] = useState('')
  const [antecedentTag, setAntecedentTag] = useState<AntecedentTag>('unknown')
  const [consequenceText, setConsequenceText] = useState('')
  const [consequenceTag, setConsequenceTag] = useState<ConsequenceTag>('none_observed')
  const [riskFlags, setRiskFlags] = useState<RiskFlagItem[]>([])
  const [saved, setSaved] = useState(false)

  function toggleRiskFlag(flag: RiskFlagItem) {
    setRiskFlags((prev) => (prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]))
  }

  function resetForm() {
    setDateTime(nowLocal())
    setDurationMinutes('')
    setSeverityRating(0)
    setFrequencyContext(0)
    setSettingEvent('')
    setAntecedentText('')
    setAntecedentTag('unknown')
    setConsequenceText('')
    setConsequenceTag('none_observed')
    setRiskFlags([])
    setStep('when')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!practitioner) return
    await createEpisode({
      behaviourId,
      dateTime: new Date(dateTime).toISOString(),
      durationMinutes: durationMinutes ? Number(durationMinutes) : null,
      severityRating,
      frequencyContext,
      settingEvent,
      antecedentText,
      antecedentTag,
      consequenceText,
      consequenceTag,
      riskFlags,
      loggedBy: practitioner.name,
    })
    resetForm()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step)
  const canAdvance =
    step === 'when' ||
    step === 'setting' ||
    (step === 'abc' && antecedentText.trim() && consequenceText.trim()) ||
    step === 'ratings'

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[#E5E5E5] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#0B0B0C] dark:text-white">Log an episode</h2>
          <p className="text-xs text-[#6B6B6B] mt-1">Step through one screen at a time.</p>
        </div>
        {saved && <span className="text-sm text-green-600">Saved</span>}
      </div>

      <WorkModeBar items={STEPS} value={step} onChange={setStep} />

      {step === 'when' && (
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Date &amp; time
            <input
              type="datetime-local"
              required
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Duration (minutes, optional)
            <input
              type="number"
              min={0}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
      )}

      {step === 'setting' && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Setting event
          <input
            value={settingEvent}
            onChange={(e) => setSettingEvent(e.target.value)}
            placeholder="e.g. Poor sleep, change of routine, new support worker"
            className={inputClass}
          />
        </label>
      )}

      {step === 'abc' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Antecedent
              <textarea
                required
                value={antecedentText}
                onChange={(e) => setAntecedentText(e.target.value)}
                rows={3}
                className={inputClass}
                placeholder="What happened immediately before"
              />
            </label>
            <select
              value={antecedentTag}
              onChange={(e) => setAntecedentTag(e.target.value as AntecedentTag)}
              className={`${inputClass} mt-2`}
            >
              {ANTECEDENT_TAGS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Consequence
              <textarea
                required
                value={consequenceText}
                onChange={(e) => setConsequenceText(e.target.value)}
                rows={3}
                className={inputClass}
                placeholder="What happened immediately after"
              />
            </label>
            <select
              value={consequenceTag}
              onChange={(e) => setConsequenceTag(e.target.value as ConsequenceTag)}
              className={`${inputClass} mt-2`}
            >
              {CONSEQUENCE_TAGS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {step === 'ratings' && (
        <div className="space-y-4">
          <div>
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Severity (practical rating, not a validated measure)
            </span>
            <div className="flex flex-wrap gap-2">
              {SEVERITY_SCALE.map((s) => (
                <label
                  key={s.value}
                  className={`cursor-pointer rounded-md border px-2 py-1.5 text-xs ${
                    severityRating === s.value
                      ? 'border-[#0B0B0C] dark:border-white bg-[#0B0B0C] dark:bg-white text-white dark:text-slate-900'
                      : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="severity"
                    className="sr-only"
                    checked={severityRating === s.value}
                    onChange={() => setSeverityRating(s.value as 0 | 1 | 2 | 3)}
                  />
                  {s.value} — {s.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Frequency / context rating
            </span>
            <div className="flex flex-wrap gap-2">
              {FREQUENCY_SCALE.map((f) => (
                <label
                  key={f.value}
                  className={`cursor-pointer rounded-md border px-2 py-1.5 text-xs ${
                    frequencyContext === f.value
                      ? 'border-[#0B0B0C] dark:border-white bg-[#0B0B0C] dark:bg-white text-white dark:text-slate-900'
                      : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="frequency"
                    className="sr-only"
                    checked={frequencyContext === f.value}
                    onChange={() => setFrequencyContext(f.value as 0 | 1 | 2 | 3 | 4)}
                  />
                  {f.value} — {f.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 'risk' && (
        <div>
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Risk flags</span>
          <div className="flex flex-wrap gap-3">
            {RISK_FLAG_OPTIONS.map((r) => (
              <label key={r.value} className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={riskFlags.includes(r.value as RiskFlagItem)}
                  onChange={() => toggleRiskFlag(r.value as RiskFlagItem)}
                />
                {r.label}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          disabled={stepIndex === 0}
          onClick={() => setStep(STEPS[stepIndex - 1].id)}
          className="rounded-full px-3 py-1.5 text-sm font-medium text-[#6B6B6B] disabled:opacity-40"
        >
          Back
        </button>
        {step === 'risk' ? (
          <button
            type="submit"
            disabled={!practitioner || !antecedentText.trim() || !consequenceText.trim()}
            className="rounded-full bg-[#0B0B0C] dark:bg-white text-white dark:text-[#0B0B0C] px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Save episode
          </button>
        ) : (
          <button
            type="button"
            disabled={!canAdvance}
            onClick={() => setStep(STEPS[stepIndex + 1].id)}
            className="rounded-full bg-[#0B0B0C] dark:bg-white text-white dark:text-[#0B0B0C] px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Next
          </button>
        )}
      </div>
    </form>
  )
}
