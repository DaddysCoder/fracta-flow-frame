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

function nowLocal(): string {
  const d = new Date()
  d.setSeconds(0, 0)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export function EpisodeForm({ behaviourId }: { behaviourId: string }) {
  const practitioner = usePractitioner()
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
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4"
    >
      <h2 className="text-sm font-semibold text-[#111111] dark:text-white">Log an episode</h2>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Date &amp; time
          <input
            type="datetime-local"
            required
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Duration (minutes, optional)
          <input
            type="number"
            min={0}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        Setting event
        <input
          value={settingEvent}
          onChange={(e) => setSettingEvent(e.target.value)}
          placeholder="e.g. Poor sleep, change of routine, new support worker"
          className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Antecedent
            <textarea
              required
              value={antecedentText}
              onChange={(e) => setAntecedentText(e.target.value)}
              rows={2}
              className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
              placeholder="What happened immediately before"
            />
          </label>
          <select
            value={antecedentTag}
            onChange={(e) => setAntecedentTag(e.target.value as AntecedentTag)}
            className="mt-2 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5 text-sm"
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
              rows={2}
              className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
              placeholder="What happened immediately after"
            />
          </label>
          <select
            value={consequenceTag}
            onChange={(e) => setConsequenceTag(e.target.value as ConsequenceTag)}
            className="mt-2 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5 text-sm"
          >
            {CONSEQUENCE_TAGS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

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
                  ? 'border-[#111111] dark:border-white bg-[#111111] dark:bg-white text-white dark:text-slate-900'
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
                  ? 'border-[#111111] dark:border-white bg-[#111111] dark:bg-white text-white dark:text-slate-900'
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

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!practitioner}
          className="rounded-md bg-[#111111] dark:bg-white text-white dark:text-slate-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Save episode
        </button>
        {saved && <span className="text-sm text-green-600">Saved</span>}
      </div>
    </form>
  )
}
