import { type FormEvent, useState } from 'react'
import { createEpisode } from '../lib/actions'
import { usePractitioner } from '../lib/practitioner'
import { useCustomChecklistItems } from '../lib/customChecklistItems'
import { ChecklistField } from './ChecklistField'
import {
  ANTECEDENT_ITEMS,
  CONSEQUENCE_ITEMS,
  deriveConsequenceTag,
  FREQUENCY_SCALE,
  RISK_FLAG_OPTIONS,
  SETTING_EVENT_ITEMS,
  SEVERITY_SCALE,
} from '../lib/scales'
import type { RiskFlagItem } from '../lib/types'

function nowLocal(): string {
  const d = new Date()
  d.setSeconds(0, 0)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function toggleInList(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((i) => i !== item) : [...list, item]
}

export function EpisodeForm({ behaviourId }: { behaviourId: string }) {
  const practitioner = usePractitioner()
  const [dateTime, setDateTime] = useState(nowLocal())
  const [durationMinutes, setDurationMinutes] = useState('')
  const [severityRating, setSeverityRating] = useState<0 | 1 | 2 | 3>(0)
  const [frequencyContext, setFrequencyContext] = useState<0 | 1 | 2 | 3 | 4>(0)

  const [settingEvent, setSettingEvent] = useState('')
  const [settingEventTags, setSettingEventTags] = useState<string[]>([])
  const [customSettingEvents, addCustomSettingEvent] = useCustomChecklistItems(
    'fba-screener:custom-setting-events',
  )

  const [antecedentText, setAntecedentText] = useState('')
  const [antecedentTags, setAntecedentTags] = useState<string[]>([])
  const [customAntecedents, addCustomAntecedent] = useCustomChecklistItems('fba-screener:custom-antecedents')

  const [consequenceText, setConsequenceText] = useState('')
  const [consequenceTags, setConsequenceTags] = useState<string[]>([])
  const [customConsequences, addCustomConsequence] = useCustomChecklistItems(
    'fba-screener:custom-consequences',
  )

  const [riskFlags, setRiskFlags] = useState<RiskFlagItem[]>([])
  const [saved, setSaved] = useState(false)

  function toggleRiskFlag(flag: RiskFlagItem) {
    setRiskFlags((prev) => (prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]))
  }

  const settingEventItems = [...SETTING_EVENT_ITEMS, ...customSettingEvents]
  const antecedentItems = [...ANTECEDENT_ITEMS, ...customAntecedents]
  const consequenceItems = [...CONSEQUENCE_ITEMS.map((c) => c.label), ...customConsequences]
  const derivedConsequenceTag = deriveConsequenceTag(consequenceTags)

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
      settingEventTags,
      antecedentText,
      antecedentTags,
      consequenceText,
      consequenceTags,
      riskFlags,
      loggedBy: practitioner.name,
    })
    setDateTime(nowLocal())
    setDurationMinutes('')
    setSeverityRating(0)
    setFrequencyContext(0)
    setSettingEvent('')
    setSettingEventTags([])
    setAntecedentText('')
    setAntecedentTags([])
    setConsequenceText('')
    setConsequenceTags([])
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
        Setting event (free text)
        <input
          value={settingEvent}
          onChange={(e) => setSettingEvent(e.target.value)}
          placeholder="e.g. Poor sleep, change of routine, new support worker"
          className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
        />
      </label>
      <ChecklistField
        label="Setting events (select any that apply)"
        items={settingEventItems}
        selected={settingEventTags}
        onToggle={(item) => setSettingEventTags((prev) => toggleInList(prev, item))}
        onAddCustom={(item) => {
          addCustomSettingEvent(item)
          setSettingEventTags((prev) => [...prev, item])
        }}
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Antecedent (free text)
            <textarea
              required
              value={antecedentText}
              onChange={(e) => setAntecedentText(e.target.value)}
              rows={2}
              className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
              placeholder="What happened immediately before"
            />
          </label>
          <ChecklistField
            label="Antecedents/triggers"
            items={antecedentItems}
            selected={antecedentTags}
            onToggle={(item) => setAntecedentTags((prev) => toggleInList(prev, item))}
            onAddCustom={(item) => {
              addCustomAntecedent(item)
              setAntecedentTags((prev) => [...prev, item])
            }}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Consequence (free text)
            <textarea
              required
              value={consequenceText}
              onChange={(e) => setConsequenceText(e.target.value)}
              rows={2}
              className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
              placeholder="What happened immediately after"
            />
          </label>
          <ChecklistField
            label="Consequences"
            items={consequenceItems}
            selected={consequenceTags}
            onToggle={(item) => setConsequenceTags((prev) => toggleInList(prev, item))}
            onAddCustom={(item) => {
              addCustomConsequence(item)
              setConsequenceTags((prev) => [...prev, item])
            }}
          />
          <p className="text-xs text-slate-400">
            Rolls up to function domain: <span className="font-medium">{derivedConsequenceTag}</span>
            {consequenceTags.length === 0 && ' (no consequence selected yet)'}
          </p>
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
