import { NavLink, Outlet } from 'react-router-dom'
import { BackupBanner } from './BackupBanner'
import { Wordmark } from './Wordmark'

const navItem =
  'px-3 py-2 rounded-md text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 aria-[current=page]:bg-[#111111] aria-[current=page]:text-white dark:aria-[current=page]:bg-white dark:aria-[current=page]:text-[#111111]'

export function Layout() {
  return (
    <div className="min-h-svh bg-[#F5F5F5] dark:bg-slate-950 flex flex-col">
      <header className="border-b border-[#E5E5E5] dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <span className="flex items-baseline gap-2">
            <Wordmark />
            <span className="text-xs font-medium text-[#6B6B6B]">by Primitive AI</span>
          </span>
          <nav className="flex gap-1">
            <NavLink to="/" end className={navItem}>
              Dashboard
            </NavLink>
            <NavLink to="/participants" className={navItem}>
              Participants
            </NavLink>
            <NavLink to="/settings" className={navItem}>
              Settings
            </NavLink>
          </nav>
        </div>
      </header>
      <BackupBanner />
      <main className="max-w-4xl w-full mx-auto px-4 py-6 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
