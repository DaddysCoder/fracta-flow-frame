import { useState } from 'react'
import { exportAllData, isBackupOverdue } from '../lib/backup'

export function BackupBanner() {
  const [dismissed, setDismissed] = useState(false)
  const overdue = isBackupOverdue()

  if (!overdue || dismissed) return null

  return (
    <div className="bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800">
      <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between gap-4 text-sm text-amber-900 dark:text-amber-100">
        <span>
          It's been a while since your last backup. Data stored on this device isn't
          guaranteed to persist — export a backup regularly.
        </span>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => exportAllData()}
            className="rounded-md bg-amber-900 dark:bg-amber-100 text-white dark:text-amber-950 px-3 py-1 font-medium"
          >
            Export now
          </button>
          <button onClick={() => setDismissed(true)} className="px-2 text-amber-800 dark:text-amber-200">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
