import { type FormEvent, useEffect, useState } from 'react'
import { usePractitioner, saveProfile } from '../lib/practitioner'
import { exportAllData, getLastBackupAt, importData } from '../lib/backup'

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

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-[#333333] dark:text-white">Settings</h1>

      <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-[#333333] dark:text-white">Practitioner profile</h2>
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
            className="rounded-md bg-[#333333] dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 text-sm font-medium"
          >
            Save
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-[#333333] dark:text-white">Data &amp; backup</h2>
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
            className="rounded-md bg-[#333333] dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 text-sm font-medium"
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
    </div>
  )
}
