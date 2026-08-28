import { NavLink, Outlet } from 'react-router-dom'
import { BackupBanner } from './BackupBanner'
import { EntitlementBanner } from './EntitlementBanner'
import { Wordmark } from './Wordmark'

const navItem =
  'px-3.5 py-2 rounded-full text-sm font-semibold text-[#6B6B6B] hover:bg-[#E8542E]/10 hover:text-[#E8542E] aria-[current=page]:bg-[#E8542E] aria-[current=page]:text-white dark:text-slate-300 dark:hover:bg-[#E8542E]/20 dark:aria-[current=page]:bg-[#E8542E] dark:aria-[current=page]:text-white'

export function Layout() {
  return (
    <div className="min-h-svh bg-[#F5F5F5] dark:bg-slate-950 flex flex-col md:flex-row">
      <header className="md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-[#E5E5E5] dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
        <div className="px-4 py-4 md:py-6 flex md:flex-col items-center md:items-stretch justify-between gap-4">
          <Wordmark />
          <nav className="flex md:flex-col gap-1" aria-label="Primary">
            <NavLink to="/" end className={navItem}>
              Dashboard
            </NavLink>
            <NavLink to="/participants" className={navItem}>
              Participants
            </NavLink>
            <NavLink to="/settings" className={navItem}>
              Settings
            </NavLink>
            <NavLink to="/pricing" className={navItem}>
              Pricing
            </NavLink>
          </nav>
        </div>
        <p className="hidden md:block mt-auto px-4 pb-4 text-[11px] text-[#6B6B6B]">
          Frame by WhatBit
        </p>
      </header>
      <div className="flex-1 flex flex-col min-w-0">
        <EntitlementBanner />
        <BackupBanner />
        <main className="max-w-5xl w-full mx-auto px-4 py-6 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
