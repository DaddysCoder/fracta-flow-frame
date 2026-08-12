import { type FormEvent, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../lib/db'
import { createParticipant } from '../lib/actions'
import { usePractitioner } from '../lib/practitioner'

export function Participants() {
  const participants = useLiveQuery(() => db.participants.orderBy('createdAt').reverse().toArray(), [])
  const practitioner = usePractitioner()
  const navigate = useNavigate()
  const [identifyingDetails, setIdentifyingDetails] = useState('')
  const [consent, setConsent] = useState(false)
  const [showForm, setShowForm] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!practitioner) return
    const id = await createParticipant({
      identifyingDetails,
      consentAttested: consent,
      practitionerName: practitioner.name,
    })
    // Land straight in "Add behaviour" for the new participant (brief §1) —
    // don't leave the practitioner to figure out where to go next.
    navigate(`/participants/${id}`, { state: { openBehaviourForm: true } })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-display font-bold text-[#111111] dark:text-white">Participants</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-[#111111] dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 text-sm font-medium"
        >
          {showForm ? 'Cancel' : 'Add participant'}
        </button>
      </div>

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

      <ul className="divide-y divide-slate-200 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {participants?.length === 0 && (
          <li className="p-4 text-sm text-slate-500">No participants yet.</li>
        )}
        {participants?.map((p) => (
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
    </div>
  )
}
