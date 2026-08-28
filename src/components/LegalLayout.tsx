import { Link } from 'react-router-dom'
import { Wordmark } from './Wordmark'
import { LEGAL_CONTACT_EMAIL, LEGAL_EFFECTIVE_LABEL, LEGAL_OPERATOR } from '../lib/legal'

export function LegalLayout({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-svh bg-[#F5F5F5] dark:bg-slate-950">
      <header className="border-b border-[#E5E5E5] dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="shrink-0">
            <Wordmark />
          </Link>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm" aria-label="Legal">
            <Link
              to="/terms"
              className="text-[#6B6B6B] hover:text-[#E8542E] dark:text-slate-400 dark:hover:text-[#F07655]"
            >
              Terms
            </Link>
            <Link
              to="/privacy"
              className="text-[#6B6B6B] hover:text-[#E8542E] dark:text-slate-400 dark:hover:text-[#F07655]"
            >
              Privacy
            </Link>
            <Link
              to="/about"
              className="text-[#6B6B6B] hover:text-[#E8542E] dark:text-slate-400 dark:hover:text-[#F07655]"
            >
              About
            </Link>
            <Link
              to="/pricing"
              className="text-[#6B6B6B] hover:text-[#E8542E] dark:text-slate-400 dark:hover:text-[#F07655]"
            >
              Pricing
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <article className="rounded-2xl border border-[#E5E5E5] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#E8542E] mb-2">Frame by WhatBit</p>
          <h1 className="text-2xl font-display font-bold text-[#0B0B0C] dark:text-white mb-6">{title}</h1>
          <div className="prose-legal space-y-4 text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
            {children}
          </div>
        </article>
        <footer className="mt-8 text-center text-xs text-[#6B6B6B] dark:text-slate-500 space-y-1">
          <p>
            {LEGAL_OPERATOR} · {LEGAL_EFFECTIVE_LABEL}
          </p>
          <p>
            <a
              href={`mailto:${LEGAL_CONTACT_EMAIL}`}
              className="text-[#E8542E] hover:text-[#F07655] underline-offset-2 hover:underline"
            >
              {LEGAL_CONTACT_EMAIL}
            </a>
          </p>
        </footer>
      </main>
    </div>
  )
}
