import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { generateDocumentationExport, generateFbaOutcomeBundleExport, setParticipantLinkId } from '../lib/actions'
import { usePractitioner } from '../lib/practitioner'
import type { DocumentationFormat } from '../lib/types'
import type { HtmlDocumentationFormat } from '../lib/documentExport'

const FORMAT_LABEL: Record<DocumentationFormat, string> = {
  clinical_report: 'Clinical report',
  plan_appendix: 'Plan appendix',
  staff_training_summary: 'Staff training summary',
  fba_outcome_bundle: 'FBA outcome bundle (for Vector)',
}

function downloadJson(json: string, filename: string) {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const FORMAT_OPTIONS: { value: HtmlDocumentationFormat; label: string; hint: string }[] = [
  {
    value: 'clinical_report',
    label: 'Clinical report',
    hint: 'Full detail — the practitioner’s own defensible record',
  },
  {
    value: 'plan_appendix',
    label: 'Plan appendix',
    hint: 'Condensed, for inclusion in the NDIS Behaviour Support Plan',
  },
  {
    value: 'staff_training_summary',
    label: 'Staff training summary',
    hint: 'Leanest format for support workers (basic — no matched strategies yet)',
  },
]

function openSnapshot(html: string) {
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener,noreferrer')
  // Revoke well after the new tab has had a chance to load it.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function ExportPanel({ participantId }: { participantId: string }) {
  const participant = useLiveQuery(() => db.participants.get(participantId), [participantId])
  const behaviours = useLiveQuery(
    () => db.behaviours.where('participantId').equals(participantId).toArray(),
    [participantId],
  )
  const exports = useLiveQuery(
    () => db.documentationExports.where('participantId').equals(participantId).reverse().sortBy('generatedAt'),
    [participantId],
  )
  const practitioner = usePractitioner()

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [format, setFormat] = useState<HtmlDocumentationFormat>('clinical_report')
  const [generating, setGenerating] = useState(false)
  const [linkIdDraft, setLinkIdDraft] = useState('')
  const [bundleGenerating, setBundleGenerating] = useState(false)
  const [bundleBlocked, setBundleBlocked] = useState<string | null>(null)

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleGenerate() {
    if (!practitioner || selected.size === 0) return
    setGenerating(true)
    try {
      const id = await generateDocumentationExport({
        participantId,
        behaviourIds: [...selected],
        format,
        generatedBy: practitioner.name,
      })
      const record = await db.documentationExports.get(id)
      if (record) openSnapshot(record.contentSnapshot)
    } finally {
      setGenerating(false)
    }
  }

  async function handleGenerateBundle() {
    if (!practitioner || selected.size === 0) return
    setBundleGenerating(true)
    setBundleBlocked(null)
    try {
      const outcome = await generateFbaOutcomeBundleExport({
        participantId,
        behaviourIds: [...selected],
        generatedBy: `${practitioner.name}, ${practitioner.role}`,
      })
      if (outcome.status === 'blocked') {
        setBundleBlocked(outcome.reason)
        return
      }
      const record = await db.documentationExports.get(outcome.exportId)
      if (record) downloadJson(record.contentSnapshot, `fba-outcome-bundle-${outcome.exportId}.json`)
    } finally {
      setBundleGenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-[#111111] dark:text-white">Generate documentation</h2>

        <div>
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Behaviours to include
          </span>
          <div className="space-y-1">
            {behaviours?.length === 0 && <p className="text-sm text-slate-500">No behaviours yet.</p>}
            {behaviours?.map((b) => (
              <label key={b.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={selected.has(b.id)} onChange={() => toggle(b.id)} />
                {b.name}
              </label>
            ))}
          </div>
        </div>

        <div>
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Format</span>
          <div className="space-y-1">
            {FORMAT_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="format"
                  checked={format === opt.value}
                  onChange={() => setFormat(opt.value)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">{opt.label}</span> — {opt.hint}
                </span>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!practitioner || selected.size === 0 || generating}
          className="rounded-md bg-[#111111] dark:bg-white text-white dark:text-slate-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {generating ? 'Generating…' : 'Generate & open'}
        </button>
        <p className="text-xs text-slate-400">
          Opens as print-friendly HTML in a new tab — use your browser's print-to-PDF to save it.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-[#111111] dark:text-white">FBA outcome bundle (for Vector)</h2>
        <p className="text-xs text-slate-500">
          A structured JSON file — summary statement, hypothesis, evidence base and escalation
          cycle — for Vector's Form 07. Uses the same behaviour selection above. Frame never
          mints a linkId; it has to come from Vector.
        </p>

        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Participant linkId
          <div className="mt-1 flex gap-2">
            <input
              value={linkIdDraft || participant?.linkId || ''}
              onChange={(e) => setLinkIdDraft(e.target.value)}
              placeholder="Not linked yet"
              className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setParticipantLinkId(participantId, linkIdDraft)}
              disabled={!linkIdDraft.trim()}
              className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </label>

        <button
          onClick={handleGenerateBundle}
          disabled={!practitioner || selected.size === 0 || bundleGenerating}
          className="rounded-md bg-[#111111] dark:bg-white text-white dark:text-slate-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {bundleGenerating ? 'Generating…' : 'Generate & download bundle'}
        </button>
        {bundleBlocked && <p className="text-sm text-red-600">{bundleBlocked}</p>}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-[#111111] dark:text-white mb-2">Past exports</h2>
        {!exports?.length && <p className="text-sm text-slate-500">No exports generated yet.</p>}
        <ul className="divide-y divide-slate-200 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {exports?.map((exp) => (
            <li key={exp.id} className="p-3 text-sm flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-[#111111] dark:text-white">{FORMAT_LABEL[exp.format]}</div>
                <div className="text-xs text-slate-500">
                  {new Date(exp.generatedAt).toLocaleString()} by {exp.generatedBy} ·{' '}
                  {exp.behaviourIds.length} behaviour(s)
                </div>
              </div>
              <button
                onClick={() =>
                  exp.format === 'fba_outcome_bundle'
                    ? downloadJson(exp.contentSnapshot, `fba-outcome-bundle-${exp.id}.json`)
                    : openSnapshot(exp.contentSnapshot)
                }
                className="shrink-0 rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200"
              >
                {exp.format === 'fba_outcome_bundle' ? 'Download' : 'View'}
              </button>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-400 mt-2">
          Past exports are frozen at generation time — editing episodes or screeners afterward
          does not change them. Generate a new export to reflect current data.
        </p>
      </div>
    </div>
  )
}
