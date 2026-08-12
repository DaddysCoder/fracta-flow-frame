import { db } from './db'

const LAST_BACKUP_KEY = 'fba-screener:last-backup-at'
const REMINDER_INTERVAL_DAYS = 7

// Durability caveat (brief §Architecture): browser local storage is not
// bulletproof long-term — iOS Safari in particular clears it aggressively.
// The product prompts regular export/backup rather than treating on-device
// storage as permanent.

export async function exportAllData(): Promise<void> {
  const [practitioners, participants, behaviours, episodes, screeners] = await Promise.all([
    db.practitioners.toArray(),
    db.participants.toArray(),
    db.behaviours.toArray(),
    db.episodes.toArray(),
    db.screeners.toArray(),
  ])

  const payload = {
    exportedAt: new Date().toISOString(),
    format: 'fba-screener-backup-v1',
    data: { practitioners, participants, behaviours, episodes, screeners },
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

export async function importData(file: File): Promise<void> {
  const text = await file.text()
  const parsed = JSON.parse(text)
  if (parsed?.format !== 'fba-screener-backup-v1') {
    throw new Error('This file is not a recognised FBA Screener backup.')
  }
  const { practitioners, participants, behaviours, episodes, screeners } = parsed.data
  await db.transaction(
    'rw',
    [db.practitioners, db.participants, db.behaviours, db.episodes, db.screeners],
    async () => {
      await db.practitioners.bulkPut(practitioners ?? [])
      await db.participants.bulkPut(participants ?? [])
      await db.behaviours.bulkPut(behaviours ?? [])
      await db.episodes.bulkPut(episodes ?? [])
      await db.screeners.bulkPut(screeners ?? [])
    },
  )
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
