import { Link } from 'react-router-dom'
import { LegalLayout } from '../components/LegalLayout'
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_EFFECTIVE_LABEL,
  LEGAL_JURISDICTION,
  LEGAL_OPERATOR,
  LEGAL_VERSION,
} from '../lib/legal'

export function TermsPage() {
  return (
    <LegalLayout title="Frame Terms of Use">
      <p className="text-[#6B6B6B] dark:text-slate-400">
        Effective {LEGAL_EFFECTIVE_LABEL} · Version {LEGAL_VERSION}
      </p>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#0B0B0C] dark:text-white">1. Agreement</h2>
        <p>
          These Terms of Use (&ldquo;Terms&rdquo;) govern your access to and use of Frame by WhatBit
          (&ldquo;Frame&rdquo;), a behaviour support decision-support application operated by{' '}
          {LEGAL_OPERATOR} (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) under the WhatBit
          brand. By using Frame you agree to these Terms. If you do not agree, do not use Frame.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#0B0B0C] dark:text-white">2. What Frame is</h2>
        <p>
          Frame helps behaviour support practitioners organise descriptive behavioural data, run a
          structured function screener, compare screener results with observed episode patterns, and
          produce documentation drafts. Frame is <strong>decision support only</strong>. It produces
          hypotheses and flags disagreement between data sources. It does not produce a determination
          of behavioural function, a diagnosis, or a clinical sign-off.
        </p>
        <p>
          Frame is not a replacement for experimental or analogue functional analysis, qualified
          clinical judgement, or your professional obligations under applicable law and registration
          requirements.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#0B0B0C] dark:text-white">
          3. Your responsibilities
        </h2>
        <p>You are solely responsible for:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>obtaining and documenting participant consent before recording any identifying or behavioural information;</li>
          <li>the accuracy, interpretation, and clinical use of all data you enter;</li>
          <li>any reports, plans, or decisions you produce using Frame outputs;</li>
          <li>maintaining backups of data stored on your device (see section 4);</li>
          <li>complying with your professional standards, employer policies, and applicable privacy law.</li>
        </ul>
        <p>
          Frame does not verify your identity, qualifications, or registration. Open access to the app
          does not imply that we endorse your use for any particular participant or setting.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#0B0B0C] dark:text-white">
          4. Local-first data
        </h2>
        <p>
          By default, participant and clinical workflow data is stored locally in your browser
          (IndexedDB) on your device. We do not operate a central participant database or cloud
          caseload storage as part of Frame public beta. Static application files may be served via
          our hosting provider; that delivery does not include your caseload data.
        </p>
        <p>
          Browser storage can be cleared by the operating system, browser settings, or device
          replacement. You must export backups regularly. We are not responsible for data loss
          caused by device failure, browser clearing, or failure to maintain backups.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#0B0B0C] dark:text-white">5. Acceptable use</h2>
        <p>You must not:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>represent Frame outputs as a definitive functional analysis, diagnosis, or validated assessment;</li>
          <li>use Frame in a way that breaches participant privacy, consent, or applicable law;</li>
          <li>attempt to reverse engineer, scrape, or disrupt the service;</li>
          <li>misrepresent your relationship with {LEGAL_OPERATOR} or WhatBit.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#0B0B0C] dark:text-white">
          6. Intellectual property
        </h2>
        <p>
          Frame software, branding, and documentation are owned by or licensed to {LEGAL_OPERATOR}.
          You retain ownership of content you enter. You grant us no rights over your caseload data
          because we do not receive it by default.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#0B0B0C] dark:text-white">
          7. Beta disclaimer
        </h2>
        <p>
          Frame is offered as a public beta. Features may change, break, or be withdrawn. We provide
          Frame on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of
          any kind, whether express or implied, including fitness for a particular purpose or
          non-infringement, to the maximum extent permitted by law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#0B0B0C] dark:text-white">
          8. Limitation of liability
        </h2>
        <p>
          To the maximum extent permitted by law, {LEGAL_OPERATOR} and its directors, employees, and
          affiliates are not liable for any indirect, incidental, special, consequential, or punitive
          damages, or any loss of data, revenue, or clinical outcomes arising from your use of Frame.
          Where liability cannot be excluded, our total liability is limited to AUD $100 or the
          minimum amount permitted by law.
        </p>
        <p>
          Nothing in these Terms excludes, restricts, or modifies rights or remedies that cannot be
          excluded under the Australian Consumer Law or other applicable mandatory laws.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#0B0B0C] dark:text-white">9. Changes</h2>
        <p>
          We may update these Terms from time to time. Material changes will be reflected by an updated
          effective date and version. Continued use after changes take effect requires renewed acceptance
          where we implement a version gate in the app.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#0B0B0C] dark:text-white">10. Governing law</h2>
        <p>
          These Terms are governed by the laws of {LEGAL_JURISDICTION}. You submit to the non-exclusive
          jurisdiction of the courts of New South Wales, Australia.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#0B0B0C] dark:text-white">11. Contact</h2>
        <p>
          Questions about these Terms:{' '}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            className="text-[#E8542E] hover:text-[#F07655] underline-offset-2 hover:underline"
          >
            {LEGAL_CONTACT_EMAIL}
          </a>
          . See also our{' '}
          <Link to="/privacy" className="text-[#E8542E] hover:text-[#F07655] underline-offset-2 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </LegalLayout>
  )
}
