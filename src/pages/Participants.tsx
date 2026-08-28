import { type FormEvent, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../lib/db'
import { createParticipant } from '../lib/actions'
import { usePractitioner } from '../lib/practitioner'
import { EmptyCard } from '../components/EmptyCard'
import { useEntitlement } from '../context/AuthContext'
import { canCreateParticipant, PARTICIPANT_LIMIT_MESSAGE } from '../../shared/entitlement'

export function Participants() {
  const participants = useLiveQuery(() => db.participants.orderBy('createdAt').reverse().toArray(), [])
  const practitioner = usePractitioner()
  const entitlement = useEntitlement()
  const [identifyingDetails, setIdentifyingDetails] = useState('')
  const [consent, setConsent] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [limitMessage, setLimitMessage] = useState<string | null>(null)

  const participantCount = participants?.length ?? 0
  const allowNewParticipant = canCreateParticipant(participantCount, entitlement)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!practitioner) return
    if (!allowNewParticipant) {
      setLimitMessage(PARTICIPANT_LIMIT_MESSAGE)
      return
    }
    await createParticipant({
      identifyingDetails,
      consentAttested: consent,
      practitionerName: practitioner.name,
    })
    setIdentifyingDetails('')
    setConsent(false)
    setShowForm(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-display font-bold text-[#111111] dark:text-white">Participants</h1>
        <button
          onClick={() => {
            if (!allowNewParticipant) {
              setLimitMessage(PARTICIPANT_LIMIT_MESSAGE)
              setShowForm(false)
              return
            }
            setLimitMessage(null)
            setShowForm((v) => !v)
          }}
          className="rounded-md bg-[#111111] dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 text-sm font-medium"
        >
          {showForm ? 'Cancel' : 'Add participant'}
        </button>
      </div>

      {limitMessage && (
        <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          {limitMessage}{' '}
          <Link to="/pricing" className="text-[#E8542E] font-medium underline">
            View Frame Pro
          </Link>
        </p>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Identifying details
            <textarea
              required
              value={identifyingDetails}
              onChange={(e) => setIdentifyingDetails(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
              rows={2}
              placeholder="Name / reference kept locally on this device only"
            />
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5"
              required
            />
            <span>
              I confirm appropriate consent has been obtained for this data. Obtaining and
              being responsible for consent is entirely my/my organisation's responsibility —
              this tool only records that I attested to it.
            </span>
          </label>
          <button
            type="submit"
            disabled={!practitioner}
            className="rounded-md bg-[#111111] dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            Save participant
          </button>
        </form>
      )}

      {participants?.length === 0 && !showForm && (
        <EmptyCard
          title="No participants yet"
          body="This is a local caseload on this device. Add someone, then a behaviour, then you can jump straight to episode log or screener."
        />
      )}

      {!!participants?.length && (
      <ul className="divide-y divide-slate-200 dark:divide-slate-800 rounded-2xl border border-[#E5E5E5] dark:border-slate-800 bg-white dark:bg-slate-900">
        {participants.map((p) => (
          <li key={p.id}>
            <Link to={`/participants/${p.id}`} className="block p-4 hover:bg-slate-50 dark:hover:bg-slate-800">
              <div className="font-medium text-[#111111] dark:text-white">{p.identifyingDetails}</div>
              <div className="text-xs text-slate-500">
                {p.consentAttested ? 'Consent attested' : 'Consent not attested'} · added{' '}
                {new Date(p.createdAt).toLocaleDateString()}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      )}
    </div>
  )
}
