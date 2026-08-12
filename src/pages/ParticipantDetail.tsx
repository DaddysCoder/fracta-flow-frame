import { type FormEvent, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { db } from '../lib/db'
import { createBehaviour } from '../lib/actions'
import { usePractitioner } from '../lib/practitioner'
import { ExportPanel } from '../components/ExportPanel'
import { BEHAVIOUR_CONCERN_CATEGORIES } from '../lib/scales'

type Section = 'behaviours' | 'documentation'

export function ParticipantDetail() {
  const { participantId = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const participant = useLiveQuery(() => db.participants.get(participantId), [participantId])
  const behaviours = useLiveQuery(
    () => db.behaviours.where('participantId').equals(participantId).reverse().sortBy('createdAt'),
    [participantId],
  )
  const practitioner = usePractitioner()

  const [name, setName] = useState('')
  const [operationalDefinition, setOperationalDefinition] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [otherCategory, setOtherCategory] = useState('')
  const [showOtherCategory, setShowOtherCategory] = useState(false)
  // Landed here straight from "Save participant" (brief §1) — open the form
  // immediately instead of leaving the practitioner to click it themselves.
  const [showForm, setShowForm] = useState(
    () => (location.state as { openBehaviourForm?: boolean } | null)?.openBehaviourForm ?? false,
  )
  const [section, setSection] = useState<Section>('behaviours')

  function toggleCategory(category: string) {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!practitioner) return
    const categories = [...selectedCategories]
    if (showOtherCategory && otherCategory.trim()) categories.push(otherCategory.trim())

    const id = await createBehaviour({
      participantId,
      name,
      operationalDefinition,
      concernCategories: categories,
      createdBy: practitioner.name,
    })
    // Land directly in episode logging (brief §1) — don't send the
    // practitioner back to a list requiring another click to re-enter it.
    navigate(`/behaviours/${id}`)
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

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {(['behaviours', 'documentation'] as Section[]).map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              section === s
                ? 'border-[#111111] dark:border-white text-[#111111] dark:text-white'
                : 'border-transparent text-slate-500'
            }`}
          >
            {s === 'behaviours' ? 'Behaviours' : 'Documentation'}
          </button>
        ))}
      </div>

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
              <div>
                <span className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  Behaviours of concern (optional, in addition to the name above)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {BEHAVIOUR_CONCERN_CATEGORIES.map((category) => (
                    <label key={category} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={selectedCategories.has(category)}
                        onChange={() => toggleCategory(category)}
                      />
                      {category}
                    </label>
                  ))}
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={showOtherCategory}
                      onChange={(e) => setShowOtherCategory(e.target.checked)}
                    />
                    Other
                  </label>
                </div>
                {showOtherCategory && (
                  <input
                    value={otherCategory}
                    onChange={(e) => setOtherCategory(e.target.value)}
                    placeholder="Describe the category"
                    className="mt-2 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
                  />
                )}
              </div>
              <button
                type="submit"
                className="rounded-md bg-[#111111] dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 text-sm font-medium"
              >
                Save behaviour
              </button>
            </form>
          )}

          <ul className="divide-y divide-slate-200 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            {behaviours?.length === 0 && (
              <li className="p-4 text-sm text-slate-500">No behaviours logged yet.</li>
            )}
            {behaviours?.map((b) => (
              <li key={b.id}>
                <Link to={`/behaviours/${b.id}`} className="block p-4 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <div className="font-medium text-[#111111] dark:text-white">{b.name}</div>
                  <div className="text-xs text-slate-500 line-clamp-1">{b.operationalDefinition}</div>
                  {b.concernCategories.length > 0 && (
                    <div className="text-xs text-slate-400 mt-0.5">{b.concernCategories.join(', ')}</div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
