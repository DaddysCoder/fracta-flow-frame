import { type FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { usePractitioner, saveProfile } from '../lib/practitioner'
import { exportAllData, getLastBackupAt, importData } from '../lib/backup'
import { db } from '../lib/db'
import { deleteVectorInstrument, importVectorInstrumentJson } from '../lib/actions'
import { exampleVectorInstrument } from '../lib/vectorInstrument'
import { WHATBIT_FAMILY } from '../lib/whatbitFamily'
import { LEGAL_EFFECTIVE_LABEL } from '../lib/legal'
import { useAuth } from '../context/AuthContext'
import { canUseProFeature, NO_CLOUD_SYNC_MESSAGE } from '../../shared/entitlement'
import { ProBadge, ProGate } from '../components/ProGate'

export function Settings() {
  const practitioner = usePractitioner()
  const { user, entitlement } = useAuth()
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
    if (!canUseProFeature('vector_import', entitlement)) {
      setVectorError('Vector import requires Frame Pro.')
      e.target.value = ''
      return
    }
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
          All participant and clinical workflow data is stored only in this browser (IndexedDB).
          Nothing is sent to a Frame server. You are the custodian of that data and of any JSON
          backups you create.
        </p>
        <p className="text-sm text-slate-500">
          Browser storage is not permanent — iOS Safari and other browsers can clear it without
          warning when storage is low, after long idle periods, or when you switch devices.
          Export a backup before closing a session on a shared device, before OS or browser updates,
          and at least weekly during active casework.
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
        <h2 className="text-sm font-semibold text-[#0B0B0C] dark:text-white">Frame Pro &amp; billing</h2>
        <p className="text-sm text-slate-500">
          {user
            ? `Signed in as ${user.email} · ${entitlement === 'pro' ? 'Frame Pro' : entitlement === 'trial' ? 'Pro trial' : 'Frame Free (account)'}`
            : 'Frame Free needs no account. Sign in for a Pro trial or subscription.'}
        </p>
        <p className="text-sm text-slate-500">{NO_CLOUD_SYNC_MESSAGE}</p>
        <div className="flex flex-wrap gap-3">
          <Link to="/pricing" className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
            Pricing
          </Link>
          <Link to="/billing" className="rounded-md bg-[#E8542E] text-white px-3 py-1.5 text-sm font-medium">
            {user ? 'Billing' : 'Sign in'}
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-[#E5E5E5] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-[#0B0B0C] dark:text-white">Legal &amp; privacy</h2>
        <p className="text-sm text-slate-500">
          Frame is decision support only. Terms version: {LEGAL_EFFECTIVE_LABEL}.
        </p>
        <ul className="space-y-2 text-sm">
          <li>
            <Link to="/terms" className="text-[#E8542E] hover:text-[#F07655] font-medium">
              Terms of Use
            </Link>
          </li>
          <li>
            <Link to="/privacy" className="text-[#E8542E] hover:text-[#F07655] font-medium">
              Privacy Policy
            </Link>
          </li>
          <li>
            <Link to="/about" className="text-[#E8542E] hover:text-[#F07655] font-medium">
              About Frame
            </Link>
          </li>
        </ul>
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
        <ProGate allowed={canUseProFeature('vector_import', entitlement)} feature="Vector instrument import">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-[#0B0B0C] dark:text-white">Vector instruments</h2>
          {!canUseProFeature('vector_import', entitlement) && <ProBadge />}
        </div>
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
        </ProGate>
      </section>
    </div>
  )
}
