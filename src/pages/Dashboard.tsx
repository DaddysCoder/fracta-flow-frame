import { DashboardFlagsBanner } from '../components/DashboardFlagsBanner'
import { LowConfidenceList } from '../components/LowConfidenceList'
import { RecentActivityFeed } from '../components/RecentActivityFeed'
import { getLastBackupAt, isBackupOverdue } from '../lib/backup'

// Cross-cutting only (brief Part B, step 10) — Participants stays the
// plain list/management screen, and behaviour-level history (episode
// trend charts, formulations, etc.) stays on behaviour detail. This page
// answers "what across everyone needs my attention right now."
export function Dashboard() {
  const lastBackupAt = getLastBackupAt()
  const overdue = isBackupOverdue()

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-display font-bold text-[#111111] dark:text-white">Dashboard</h1>

      <DashboardFlagsBanner />

      <LowConfidenceList />

      <div className="text-xs text-slate-500">
        Last backup:{' '}
        {lastBackupAt ? lastBackupAt.toLocaleString() : 'never'}
        {overdue && <span className="text-amber-700 dark:text-amber-400"> — overdue</span>}
      </div>

      <RecentActivityFeed />
    </div>
  )
}
