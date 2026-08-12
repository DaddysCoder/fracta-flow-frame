import { type FormEvent, useState } from 'react'
import { usePractitioner, acknowledgeDisclaimer, saveProfile } from '../lib/practitioner'
import { Wordmark } from './Wordmark'

// Unmissable first-use disclaimer (brief §7.1). Because practitioner scope
// gating is open signup with no registration verification, this disclaimer
// layer is the primary liability defence and must be shown before any use.
export function DisclaimerGate({ children }: { children: React.ReactNode }) {
  const practitioner = usePractitioner()
  const [name, setName] = useState('')
  const [role, setRole] = useState('Behaviour Support Practitioner')

  if (practitioner === undefined) {
    return null // still loading from IndexedDB
  }

  if (practitioner?.disclaimerAcknowledgedAt) {
    return <>{children}</>
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await saveProfile(name.trim(), role.trim())
    await acknowledgeDisclaimer()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/70 p-4">
      <form
        onSubmit={handleSubmit}
        className="max-w-lg w-full rounded-lg bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4"
      >
        <Wordmark className="text-sm text-slate-400" />
        <h1 className="text-lg font-display font-bold text-[#111111] dark:text-white">
          Before you start
        </h1>
        <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-700 p-3 text-sm text-amber-900 dark:text-amber-100 space-y-2">
          <p className="font-semibold">This tool is decision support, not diagnostic.</p>
          <p>
            It produces hypotheses and flags disagreement between data sources — it never
            produces a determination of behavioural function. Every output requires your
            clinical judgement to interpret, and your sign-off before it informs a
            behaviour support plan.
          </p>
          <p>
            It is not a replacement for experimental/analogue functional analysis. When
            confidence stays low or results disagree, treat that as a prompt to pursue EFA
            or senior review — not as something this tool can resolve for you.
          </p>
          <p>
            All data stays on this device by default. You remain fully responsible for
            participant consent and for any clinical content you produce using this tool.
          </p>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Your name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
              placeholder="Jordan Lee"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Role
            <input
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-[#111111] dark:bg-white text-white dark:text-slate-900 py-2 text-sm font-semibold"
        >
          I understand — continue
        </button>
      </form>
    </div>
  )
}
