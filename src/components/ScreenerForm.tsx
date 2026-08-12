import { type FormEvent, useState } from 'react'
import { createScreener } from '../lib/actions'
import { usePractitioner, LOCAL_PRACTITIONER_ID } from '../lib/practitioner'
import { SCREENER_ITEMS } from '../lib/screener'
import type { ScreenerAnswer } from '../lib/types'

export function ScreenerForm({ behaviourId }: { behaviourId: string }) {
  const practitioner = usePractitioner()
  const [answers, setAnswers] = useState<Record<string, ScreenerAnswer>>({})
  const [saved, setSaved] = useState(false)

  const allAnswered = SCREENER_ITEMS.every((item) => answers[item.id])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!practitioner || !allAnswered) return
    await createScreener({
      behaviourId,
      informantId: LOCAL_PRACTITIONER_ID,
      informantRole: practitioner.role,
      responses: SCREENER_ITEMS.map((item) => ({
        itemId: item.id,
        domain: item.domain,
        answer: answers[item.id],
      })),
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
          Self-administered, indirect assessment. This is a screening hypothesis only — it is
          not compared against episode data here (that triangulation is a later step you
          trigger explicitly), and it is never a determination of function on its own.
        </p>
      </div>

      <div className="space-y-3">
        {SCREENER_ITEMS.map((item) => (
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
