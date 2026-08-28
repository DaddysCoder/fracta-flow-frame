import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePractitioner, acknowledgeDisclaimer, saveProfile, practitionerGateComplete } from '../lib/practitioner'
import { Wordmark } from './Wordmark'

// Unmissable first-use disclaimer (brief §7.1). Because practitioner scope
// gating is open signup with no registration verification, this disclaimer
// layer is the primary liability defence and must be shown before any use.
export function DisclaimerGate({ children }: { children: React.ReactNode }) {
  const practitioner = usePractitioner()
  const [name, setName] = useState('')
  const [role, setRole] = useState('Behaviour Support Practitioner')
  const [legalAccepted, setLegalAccepted] = useState(false)

  if (practitioner === undefined) {
    return null // still loading from IndexedDB
  }

  if (practitionerGateComplete(practitioner)) {
    return <>{children}</>
  }

  const canContinue = name.trim().length > 0 && role.trim().length > 0 && legalAccepted

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canContinue) return
    await saveProfile(name.trim(), role.trim())
    await acknowledgeDisclaimer()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0B0C]/70 p-4">
      <form
        onSubmit={handleSubmit}
        className="max-w-lg w-full rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4 border border-[#E5E5E5] dark:border-slate-800 max-h-[90svh] overflow-y-auto"
      >
        <Wordmark />
        <h1 className="text-lg font-display font-bold text-[#0B0B0C] dark:text-white">
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
        <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            required
            checked={legalAccepted}
            onChange={(e) => setLegalAccepted(e.target.checked)}
            className="mt-1 rounded border-slate-300 dark:border-slate-600"
          />
          <span>
            I agree to the{' '}
            <Link
              to="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#E8542E] hover:text-[#F07655] underline-offset-2 hover:underline"
            >
              Frame Terms of Use
            </Link>{' '}
            and acknowledge the{' '}
            <Link
              to="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#E8542E] hover:text-[#F07655] underline-offset-2 hover:underline"
            >
              Frame Privacy Policy
            </Link>
            .
          </span>
        </label>
        <button
          type="submit"
          disabled={!canContinue}
          className="w-full rounded-full bg-[#E8542E] hover:bg-[#F07655] disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 text-sm font-semibold"
        >
          I understand — continue
        </button>
      </form>
    </div>
  )
}
