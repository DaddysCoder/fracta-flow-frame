import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { createScreener } from '../lib/actions'
import { db } from '../lib/db'
import { usePractitioner, LOCAL_PRACTITIONER_ID } from '../lib/practitioner'
import { SCREENER_DISPLAY_ITEMS, SCREENER_ITEMS, type ScreenerItem } from '../lib/screener'
import { displayItemsForInstrument } from '../lib/vectorInstrument'
import type { ScreenerAnswer } from '../lib/types'
import { ProfessionalToolDisclaimer } from './ProfessionalToolDisclaimer'

const FRAME_NATIVE = 'frame-native'

export function ScreenerForm({ behaviourId }: { behaviourId: string }) {
  const practitioner = usePractitioner()
  const instruments = useLiveQuery(() => db.vectorInstruments.orderBy('importedAt').reverse().toArray(), [])
  const [instrumentKey, setInstrumentKey] = useState(FRAME_NATIVE)
  const [answers, setAnswers] = useState<Record<string, ScreenerAnswer>>({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (instrumentKey === FRAME_NATIVE || !instruments) return
    if (!instruments.some((row) => row.id === instrumentKey)) {
      setInstrumentKey(FRAME_NATIVE)
      setAnswers({})
    }
  }, [instrumentKey, instruments])

  const selected = instruments?.find((row) => row.id === instrumentKey)
  const items: ScreenerItem[] = useMemo(() => {
    if (instrumentKey === FRAME_NATIVE || !selected) return SCREENER_ITEMS
    return selected.items
  }, [instrumentKey, selected])
  const displayItems = instrumentKey === FRAME_NATIVE || !selected ? SCREENER_DISPLAY_ITEMS : displayItemsForInstrument(selected.items)

  const allAnswered = items.every((item) => answers[item.id])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!practitioner || !allAnswered) return
    await createScreener({
      behaviourId,
      informantId: LOCAL_PRACTITIONER_ID,
      informantRole: practitioner.role,
      responses: items.map((item) => ({
        itemId: item.id,
        domain: item.domain,
        answer: answers[item.id],
      })),
      instrumentSource: selected ? 'vector' : 'frame',
      instrumentName: selected ? selected.name : 'Frame function screener',
      vectorInstrumentId: selected?.id ?? null,
    })
    setAnswers({})
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4"
    >
      <div>
        <h2 className="text-sm font-semibold text-[#111111] dark:text-white">Function screener</h2>
        <p className="text-xs text-slate-500 mt-1">
          Items are mixed across functions. Vector-authored screeners import in Settings and run
          here. QR handoff still uses Frame&apos;s built-in screener. Screening is never a
          determination of function on its own.
        </p>
        <ProfessionalToolDisclaimer className="mt-2" />
      </div>

      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        Instrument
        <select
          value={instrumentKey}
          onChange={(e) => {
            setInstrumentKey(e.target.value)
            setAnswers({})
          }}
          className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5 text-sm"
        >
          <option value={FRAME_NATIVE}>Frame function screener (built-in)</option>
          {(instruments ?? []).map((row) => (
            <option key={row.id} value={row.id}>
              Vector · {row.name} v{row.version}
            </option>
          ))}
        </select>
      </label>
      {!instruments?.length && (
        <p className="text-xs text-slate-400">
          No Vector files imported yet.{' '}
          <Link to="/settings" className="underline">
            Import one in Settings
          </Link>
          .
        </p>
      )}
      {selected && (
        <p className="text-xs text-slate-400">
          Running Vector instrument {selected.sourceId} (v{selected.version}). Results still store
          on this behaviour in Frame.
        </p>
      )}

      <div className="space-y-3">
        {displayItems.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-4 text-sm">
            <span className="text-slate-700 dark:text-slate-300">{item.prompt}</span>
            <div className="flex gap-1 shrink-0">
              {(['yes', 'unsure', 'no'] as ScreenerAnswer[]).map((opt) => (
                <label
                  key={opt}
                  className={`cursor-pointer rounded-md border px-2 py-1 text-xs capitalize ${
                    answers[item.id] === opt
                      ? 'border-[#111111] dark:border-white bg-[#111111] dark:bg-white text-white dark:text-slate-900'
                      : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <input
                    type="radio"
                    name={item.id}
                    className="sr-only"
                    checked={answers[item.id] === opt}
                    onChange={() => setAnswers((prev) => ({ ...prev, [item.id]: opt }))}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!practitioner || !allAnswered}
          className="rounded-md bg-[#111111] dark:bg-white text-white dark:text-slate-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Save screener
        </button>
        {!allAnswered && <span className="text-xs text-slate-400">Answer all items to save</span>}
        {saved && <span className="text-sm text-green-600">Saved</span>}
      </div>
    </form>
  )
}
