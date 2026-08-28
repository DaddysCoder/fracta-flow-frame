import { Link } from 'react-router-dom'
import { LegalLayout } from '../components/LegalLayout'
import { ProBadge } from '../components/ProGate'

export function PricingPage() {
  return (
    <LegalLayout title="Frame pricing">
      <p className="text-[#6B6B6B]">
        Frame Free works without an account. Frame Pro adds multi-informant tools, documentation generation,
        and Vector import — with a 14-day trial after email verification. No card required for the trial.
      </p>

      <div className="grid md:grid-cols-2 gap-4 not-prose">
        <div className="rounded-2xl border border-[#E5E5E5] dark:border-slate-700 p-5 space-y-3">
          <h2 className="text-lg font-display font-bold text-[#0B0B0C] dark:text-white">Frame Free</h2>
          <p className="text-2xl font-bold">A$0</p>
          <ul className="text-sm space-y-1 text-slate-600 dark:text-slate-300 list-disc pl-4">
            <li>Up to 2 active participants</li>
            <li>ABC logging, screener, hypothesis, risk flags</li>
            <li>Local storage, PWA, JSON backup/export/import</li>
            <li>Access to all existing local records</li>
            <li>No account required</li>
          </ul>
          <Link
            to="/"
            className="inline-block rounded-md border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium"
          >
            Use Frame Free
          </Link>
        </div>

        <div className="rounded-2xl border-2 border-[#E8542E]/40 p-5 space-y-3 relative">
          <ProBadge className="absolute top-4 right-4" />
          <h2 className="text-lg font-display font-bold text-[#0B0B0C] dark:text-white">Frame Pro</h2>
          <p className="text-2xl font-bold">
            A$29<span className="text-base font-normal text-slate-500">/month</span>
          </p>
          <p className="text-sm text-slate-500">or A$290/year</p>
          <ul className="text-sm space-y-1 text-slate-600 dark:text-slate-300 list-disc pl-4">
            <li>Unlimited participants</li>
            <li>Multi-informant QR screener</li>
            <li>Multiple-informant evidence comparison</li>
            <li>Clinical Report, BSP Appendix, Staff Training Summary</li>
            <li>Vector instrument import</li>
          </ul>
          <p className="text-xs text-slate-500">14-day Pro trial · no card required · one trial per email</p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/login?redirect=/billing"
              className="inline-block rounded-md bg-[#E8542E] text-white px-4 py-2 text-sm font-medium hover:bg-[#F07655]"
            >
              Start free trial
            </Link>
            <Link
              to="/login?redirect=/billing"
              className="inline-block rounded-md border border-[#E8542E] text-[#E8542E] px-4 py-2 text-sm font-medium"
            >
              Sign in to subscribe
            </Link>
          </div>
        </div>
      </div>
    </LegalLayout>
  )
}
