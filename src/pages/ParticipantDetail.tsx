import { type FormEvent, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useParams } from 'react-router-dom'
import { db } from '../lib/db'
import { createBehaviour } from '../lib/actions'
import { usePractitioner } from '../lib/practitioner'
import { EmptyCard } from '../components/EmptyCard'
import { ExportPanel } from '../components/ExportPanel'
import { WorkModeBar } from '../components/WorkModeBar'
import { WorkModeLinks } from '../components/WorkModeLinks'

type Section = 'behaviours' | 'documentation'

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'behaviours', label: 'Behaviours' },
  { id: 'documentation', label: 'Documentation' },
]

export function ParticipantDetail() {
  const { participantId = '' } = useParams()
  const participant = useLiveQuery(() => db.participants.get(participantId), [participantId])
  const behaviours = useLiveQuery(
    () => db.behaviours.where('participantId').equals(participantId).reverse().sortBy('createdAt'),
    [participantId],
  )
  const practitioner = usePractitioner()

  const [name, setName] = useState('')
  const [operationalDefinition, setOperationalDefinition] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [section, setSection] = useState<Section>('behaviours')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!practitioner) return
    await createBehaviour({
      participantId,
      name,
      operationalDefinition,
      createdBy: practitioner.name,
    })
    setName('')
    setOperationalDefinition('')
    setShowForm(false)
  }

  if (!participant) return <p className="text-sm text-slate-500">Loading…</p>

  return (
    <div className="space-y-6">
      <div>
        <Link to="/participants" className="text-sm text-slate-500 hover:underline">
          ← Participants
        </Link>
        <h1 className="text-xl font-display font-bold text-[#111111] dark:text-white mt-1">
          {participant.identifyingDetails}
        </h1>
      </div>

      <WorkModeBar items={SECTIONS} value={section} onChange={setSection} />

      {section === 'documentation' && <ExportPanel participantId={participantId} />}

      {section === 'behaviours' && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Behaviours</h2>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="rounded-md bg-[#111111] dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 text-sm font-medium"
            >
              {showForm ? 'Cancel' : 'Add behaviour'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Behaviour name
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
                  placeholder="e.g. Property damage during transitions"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Operational definition
                <textarea
                  required
                  value={operationalDefinition}
                  onChange={(e) => setOperationalDefinition(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Observable, measurable description — no interpretation of intent or cause"
                />
              </label>
              <button
                type="submit"
                className="rounded-md bg-[#111111] dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 text-sm font-medium"
              >
                Save behaviour
              </button>
            </form>
          )}

          {behaviours?.length === 0 && (
            <EmptyCard
              title="No behaviours yet"
              body="Name the behaviour and write an operational definition. Then you can log episodes and run the function screener."
            />
          )}

          {!!behaviours?.length && (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800 rounded-2xl border border-[#E5E5E5] dark:border-slate-800 bg-white dark:bg-slate-900">
              {behaviours.map((b) => (
                <li key={b.id} className="p-4">
                  <Link to={`/behaviours/${b.id}`} className="block">
                    <div className="font-medium text-[#0B0B0C] dark:text-white">{b.name}</div>
                    <div className="text-xs text-slate-500 line-clamp-1">{b.operationalDefinition}</div>
                  </Link>
                  <WorkModeLinks behaviourId={b.id} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
