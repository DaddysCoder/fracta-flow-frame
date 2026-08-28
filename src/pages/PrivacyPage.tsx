import { Link } from 'react-router-dom'
import { LegalLayout } from '../components/LegalLayout'
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_EFFECTIVE_LABEL,
  LEGAL_JURISDICTION,
  LEGAL_OPERATOR,
  LEGAL_VERSION,
} from '../lib/legal'

export function PrivacyPage() {
  return (
    <LegalLayout title="Frame Privacy Policy">
      <p className="text-[#6B6B6B] dark:text-slate-400">
        Effective {LEGAL_EFFECTIVE_LABEL} · Version {LEGAL_VERSION}
      </p>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#0B0B0C] dark:text-white">1. Who we are</h2>
        <p>
          {LEGAL_OPERATOR} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates Frame by WhatBit
          (&ldquo;Frame&rdquo;) under the WhatBit brand. This Privacy Policy explains how information
          is handled when you use Frame. Contact:{' '}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            className="text-[#E8542E] hover:text-[#F07655] underline-offset-2 hover:underline"
          >
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#0B0B0C] dark:text-white">2. Local-first by design</h2>
        <p>
          Frame is built local-first. Participant profiles, behavioural records, screeners, episodes,
          exports, and practitioner profile data are stored in your browser on your device (IndexedDB)
          unless you explicitly export a backup file. Participant clinical records are not stored in
          our central database. Optional Frame Pro accounts store email, authentication, trial, and
          billing metadata only — not your caseload.
        </p>
        <p>
          Because your caseload stays on your device, you — not {LEGAL_OPERATOR} — are the primary
          custodian of that information. You must comply with applicable privacy and health
          information obligations in your jurisdiction and professional context.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#0B0B0C] dark:text-white">
          3. Information stored on your device
        </h2>
        <p>Frame may store locally, among other things:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>your practitioner name and role;</li>
          <li>legal acceptance timestamps and version identifiers;</li>
          <li>participant identifying details you enter;</li>
          <li>behaviour definitions, episodes, screeners, hypotheses, flags, and documentation exports;</li>
          <li>backup reminder timestamps in browser local storage;</li>
          <li>imported Vector instrument definitions you choose to load.</li>
        </ul>
        <p>
          QR invite links encode only a token and informant role — not participant identity or clinical
          records. Informant responses are transferred by QR between devices you control; they are not
          uploaded to our servers by default.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#0B0B0C] dark:text-white">
          4. Account, authentication, and billing data (Cloudflare D1)
        </h2>
        <p>If you choose to sign in for Frame Pro trial or subscription, we store on our servers:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>your normalized email address and email verification timestamp;</li>
          <li>hashed one-time sign-in codes and session tokens (not plaintext);</li>
          <li>Pro trial start and end dates (one trial per email);</li>
          <li>Stripe customer and subscription identifiers and status returned by Stripe webhooks.</li>
        </ul>
        <p>
          This data lives in a Cloudflare D1 database for account and billing purposes only. It does
          not include participant names, episodes, screeners, or other clinical content.
        </p>
        <p>
          Sign-in codes are sent by transactional email. OTPs expire quickly, are single-use, and are
          rate-limited. Clearing browser data does not reset server-side trial eligibility.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#0B0B0C] dark:text-white">
          5. What we do not collect
        </h2>
        <p>Frame does not include:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>analytics, advertising, or behavioural tracking pixels;</li>
          <li>central storage or automatic cloud sync of participant or episode data;</li>
          <li>AI processing of your caseload on our servers.</li>
        </ul>
        <p>
          Payment card details are collected and stored by Stripe, not by Frame. See Stripe&apos;s
          privacy policy for how they handle payment information.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#0B0B0C] dark:text-white">
          6. Hosting and technical logs
        </h2>
        <p>
          We serve Frame as a static web application (for example via Cloudflare). When you load the
          app, your browser requests HTML, JavaScript, and assets from our hosting infrastructure.
          Standard infrastructure logs may record technical data such as IP address, user agent, request
          time, and URL path. Query strings may be redacted in observability settings where configured.
        </p>
        <p>
          These logs support security and reliability. They do not include your IndexedDB caseload
          contents because that data never leaves your device unless you export it.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#0B0B0C] dark:text-white">7. Email contact</h2>
        <p>
          If you email us at {LEGAL_CONTACT_EMAIL}, we use your email address and message content only
          to respond. We do not sell personal information.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#0B0B0C] dark:text-white">8. Backups you create</h2>
        <p>
          JSON backup files you export contain your full local database snapshot. You are responsible
          for securing backup files on whatever storage or channels you use (email, cloud drive, USB,
          etc.). {LEGAL_OPERATOR} does not receive those files unless you send them to us voluntarily.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#0B0B0C] dark:text-white">9. Children</h2>
        <p>
          Frame is intended for qualified practitioners working in professional behaviour support
          contexts. It is not directed at children for self-service use.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#0B0B0C] dark:text-white">10. Changes</h2>
        <p>
          We may update this Privacy Policy. Material changes will be reflected by an updated effective
          date and version. Where the app implements a version gate, you may be asked to acknowledge
          the updated policy before continued use.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#0B0B0C] dark:text-white">11. Governing law</h2>
        <p>
          This policy is governed by the laws of {LEGAL_JURISDICTION}, subject to mandatory privacy
          laws that apply to you in your own professional capacity.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#0B0B0C] dark:text-white">12. Contact</h2>
        <p>
          Privacy questions:{' '}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            className="text-[#E8542E] hover:text-[#F07655] underline-offset-2 hover:underline"
          >
            {LEGAL_CONTACT_EMAIL}
          </a>
          . See also our{' '}
          <Link to="/terms" className="text-[#E8542E] hover:text-[#F07655] underline-offset-2 hover:underline">
            Terms of Use
          </Link>
          .
        </p>
      </section>
    </LegalLayout>
  )
}
