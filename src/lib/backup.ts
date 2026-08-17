import { db } from './db'

const LAST_BACKUP_KEY = 'fba-screener:last-backup-at'
const REMINDER_INTERVAL_DAYS = 7
const BACKUP_FORMAT = 'fba-screener-backup-v2'

// Durability caveat (brief §Architecture): browser local storage is not
// bulletproof long-term — iOS Safari in particular clears it aggressively.
// The product prompts regular export/backup rather than treating on-device
// storage as permanent.

// Table list is derived from db.tables, not hand-written, so a table added
// to the Dexie schema is backed up automatically without a matching edit
// here. v1 backups (fixed 5-table shape) silently dropped 4 tables added
// since — see backup.test.ts.
function backupTableNames(): string[] {
  return db.tables.map((t) => t.name)
}

export async function exportAllData(): Promise<void> {
  const tableNames = backupTableNames()
  const rows = await Promise.all(tableNames.map((name) => db.table(name).toArray()))
  const data: Record<string, unknown[]> = {}
  tableNames.forEach((name, i) => {
    data[name] = rows[i]
  })

  const payload = {
    exportedAt: new Date().toISOString(),
    format: BACKUP_FORMAT,
    tables: tableNames,
    data,
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fba-screener-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)

  localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString())
}

const RECOGNISED_FORMATS = new Set(['fba-screener-backup-v1', BACKUP_FORMAT])

export async function importData(file: File): Promise<void> {
  const text = await file.text()
  const parsed = JSON.parse(text)
  if (typeof parsed?.format !== 'string' || !RECOGNISED_FORMATS.has(parsed.format)) {
    throw new Error('This file is not a recognised FBA Screener backup.')
  }
  const data = parsed.data ?? {}
  const tableNames = backupTableNames()

  await db.transaction('rw', db.tables, async () => {
    for (const name of tableNames) {
      // Older backups (v1) simply don't have keys for tables that didn't
      // exist yet — those import as empty, not an error (brief: "restore
      // accepts old backups; missing tables → empty").
      const rows = data[name] ?? []
      await db.table(name).bulkPut(rows)
    }
  })
  localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString())
}

export function getLastBackupAt(): Date | null {
  const raw = localStorage.getItem(LAST_BACKUP_KEY)
  return raw ? new Date(raw) : null
}

export function isBackupOverdue(): boolean {
  const last = getLastBackupAt()
  if (!last) return true
  const daysSince = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24)
  return daysSince >= REMINDER_INTERVAL_DAYS
}
