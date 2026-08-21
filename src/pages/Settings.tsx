import { type FormEvent, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { usePractitioner, saveProfile } from '../lib/practitioner'
import { exportAllData, getLastBackupAt, importData } from '../lib/backup'
import { db } from '../lib/db'
import { deleteVectorInstrument, importVectorInstrumentJson } from '../lib/actions'
import { exampleVectorInstrument } from '../lib/vectorInstrument'
import { WHATBIT_FAMILY } from '../lib/whatbitFamily'

export function Settings() {
  const practitioner = usePractitioner()
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [importOk, setImportOk] = useState(false);

  useEffect(() => {
    if (practitioner) {
      setName(practitioner.name)
      setRole(practitioner.role)
    }
  }, [practitioner])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await saveProfile(name.trim(), role.trim())
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)
    setImportOk(false)
    try {
      await importData(file)
      setImportOk(true)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      e.target.value = ''
    }
  }

  const lastBackup = getLastBackupAt()
  const vectorInstruments = useLiveQuery(() => db.vectorInstruments.orderBy('importedAt').reverse().toArray(), [])
  const [vectorError, setVectorError] = useState<string | null>(null)
  const [vectorOk, setVectorOk] = useState<string | null>(null)

  async function handleVectorImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setVectorError(null)
    setVectorOk(null)
    try {
      const text = await file.text()
      const result = await importVectorInstrumentJson(text)
      setVectorOk(
        result.replaced
          ? `Updated ${result.name} (same Vector id).`
          : `Imported ${result.name}. Run it from Function screener.`,
      )
    } catch (err) {
      setVectorError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      e.target.value = ''
    }
  }

  function downloadExample() {
    const blob = new Blob([JSON.stringify(exampleVectorInstrument(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'vector-instrument-example.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-display font-bold text-[#111111] dark:text-white">Settings</h1>

      <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-[#111111] dark:text-white">Practitioner profile</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Role
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-[#111111] dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 text-sm font-medium"
          >
            Save
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-[#111111] dark:text-white">Data &amp; backup</h2>
        <p className="text-sm text-slate-500">
          All data is stored only in this browser (IndexedDB). Nothing is sent to a server.
          Browser storage can be cleared by the OS (especially iOS Safari) — export a backup
          regularly and before switching devices or browsers.
        </p>
        <p className="text-xs text-slate-400">
          Last backup: {lastBackup ? lastBackup.toLocaleString() : 'never'}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => exportAllData()}
            className="rounded-md bg-[#111111] dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 text-sm font-medium"
          >
            Export backup (JSON)
          </button>
          <label className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm font-medium cursor-pointer text-slate-700 dark:text-slate-200">
            Import backup
            <input type="file" accept="application/json" onChange={handleImport} className="hidden" />
          </label>
        </div>
        {importOk && <p className="text-sm text-green-600">Backup imported.</p>}
        {importError && <p className="text-sm text-red-600">{importError}</p>}
      </section>

      <section className="rounded-2xl border border-[#E5E5E5] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-[#0B0B0C] dark:text-white">WhatBit tools</h2>
        <p className="text-sm text-slate-500">
          Frame, Vector, and Field stay separate products. Step three is live: Field capture
          on the episode log posts into this caseload. Vector instruments import above.
        </p>
        <ul className="space-y-3">
          {WHATBIT_FAMILY.map((tool) => (
            <li key={tool.id} className="text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-[#0B0B0C] dark:text-white">{tool.name}</span>
                <span className="text-xs uppercase tracking-wide text-[#6B6B6B]">{tool.status}</span>
              </div>
              <p className="text-[#6B6B6B] mt-0.5">{tool.role}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-[#E5E5E5] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-[#0B0B0C] dark:text-white">Vector instruments</h2>
        <p className="text-sm text-slate-500">
          Import a <code className="text-xs">whatbit-vector-instrument-v1</code> file. Frame runs
          it on a behaviour. Same Vector id replaces the previous version. QR handoff is still
          the built-in Frame screener.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm font-medium cursor-pointer text-slate-700 dark:text-slate-200">
            Import Vector JSON
            <input type="file" accept="application/json" onChange={handleVectorImport} className="hidden" />
          </label>
          <button
            type="button"
            onClick={downloadExample}
            className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Download example
          </button>
        </div>
        {vectorOk && <p className="text-sm text-green-600">{vectorOk}</p>}
        {vectorError && <p className="text-sm text-red-600">{vectorError}</p>}
        {!!vectorInstruments?.length && (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800">
            {vectorInstruments.map((row) => (
              <li key={row.id} className="p-3 text-sm flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-[#0B0B0C] dark:text-white">{row.name}</div>
                  <div className="text-xs text-slate-500">
                    {row.sourceId} · v{row.version} · {row.items.length} items
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteVectorInstrument(row.id)}
                  className="text-xs text-slate-500 hover:text-red-600"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
