import { Link } from 'react-router-dom'
import { LegalLayout } from '../components/LegalLayout'

export function AboutPage() {
  return (
    <LegalLayout title="About Frame">
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#0B0B0C] dark:text-white">Decision support, not diagnosis</h2>
        <p>
          Frame by WhatBit helps behaviour support practitioners structure intake, log descriptive
          episodes (ABC-style data), run a FAST-structured function screener, compare screener
          results with observed patterns, and draft documentation — all local-first on your device.
        </p>
        <p>
          Frame assembles hypotheses and flags disagreement between data sources. It never produces a
          determination of behavioural function. Every output requires your clinical judgement to
          interpret, and your sign-off before it informs a behaviour support plan.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#0B0B0C] dark:text-white">What Frame is not</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Not a replacement for experimental or analogue functional analysis.</li>
          <li>Not a validated clinical instrument — severity and frequency scales are practical ratings for workflow use.</li>
          <li>Not a cloud caseload system — participant data stays on your device unless you export it.</li>
          <li>Not an AI clinician — no server-side analysis of your records in public beta.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#0B0B0C] dark:text-white">Local-first architecture</h2>
        <p>
          Frame is a Progressive Web App. Your caseload lives in IndexedDB in your browser. QR handoffs
          for informant screeners and Field capture use <code className="text-xs">window.location.origin</code>{' '}
          so invites always point to the site you are actually using — no hardcoded deployment URLs.
        </p>
        <p>
          Export JSON backups regularly. Browser storage can be cleared by the OS, especially on mobile
          Safari. Treat on-device storage as convenient, not permanent.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#0B0B0C] dark:text-white">WhatBit product family</h2>
        <p>
          Frame, Vector, and Field are separate WhatBit tools. Vector authors instruments you import
          into Frame. Field capture posts episodes into the same behaviour log via QR handoff.
        </p>
      </section>

      <section className="space-y-3">
        <p>
          Read our{' '}
          <Link to="/terms" className="text-[#E8542E] hover:text-[#F07655] underline-offset-2 hover:underline">
            Terms of Use
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-[#E8542E] hover:text-[#F07655] underline-offset-2 hover:underline">
            Privacy Policy
          </Link>
          , or return to the{' '}
          <Link to="/" className="text-[#E8542E] hover:text-[#F07655] underline-offset-2 hover:underline">
            app
          </Link>
          .
        </p>
      </section>
    </LegalLayout>
  )
}
