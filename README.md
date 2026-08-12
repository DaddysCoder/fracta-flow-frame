# FBA Screener

A behaviour support practitioner tool combining structured behaviour/episode
(ABC) logging with a FAST-structured function-of-behaviour screener — local-first,
decision support only. **Phase 1 (MVP)** of the phased build described in the
coding brief.

## What this is (and isn't)

- Produces hypotheses and raw screener/episode data for a practitioner to
  interpret — **never a determination of behavioural function**.
- Not a replacement for experimental/analogue functional analysis.
- Not a general data-collection platform: by default, no participant data
  leaves the practitioner's own device.
- Built on the published, open-access **FAST item structure** (Iwata et al.,
  2013) — four functional domains (attention / escape / tangible /
  automatic), yes/no/unsure items. Item wording is originally authored for
  this tool, not reproduced from FAST or any commercial instrument (QABF,
  MAS), avoiding licensing dependency.
- Severity (0–3) and frequency (0–4) use an original, practical scale
  authored for this tool — not BPI-01 or another licensed/validated
  instrument. Labelled as "practical rating" throughout the UI, never as
  "validated".

## Architecture: local-first, not server-first

This is a **Progressive Web App** — installable, works offline, stores all
data in the browser's IndexedDB on the practitioner's own device via
[Dexie](https://dexie.org/). There is no central database and no server in
this MVP:

- All computation runs client-side. No participant data needs to leave the
  device for the tool to function.
- The practitioner is the effective data controller for their own device.
- Browser storage isn't bulletproof long-term (iOS Safari in particular
  clears it aggressively) — the app surfaces a backup reminder banner and
  provides JSON export/import (Settings → Data & backup) rather than
  treating on-device storage as permanent.

## Regulatory/design constraints baked into this build

- Every computed value (screener domain scores, episode history) shows the
  inputs that produced it — no black-box scoring.
- No triangulation, hypothesis, or risk-flag computation exists in this MVP.
  That's deliberate: Phase 1 only assembles data. Phase 2 adds explicit,
  on-demand triangulation (screener vs. episode pattern); Phase 3 adds
  escalation flags. Neither auto-updates in the background.
- An unmissable first-use disclaimer ("decision support, not diagnostic")
  must be acknowledged before any other screen is reachable — this is the
  primary liability defence given open, unverified signup.
- Consent is a simple attestation (checkbox + timestamp + practitioner),
  not a managed consent system — the practitioner remains responsible for
  actually obtaining it.

## What's implemented (Phase 1 MVP)

- Practitioner profile + first-use disclaimer gate
- Participant creation with consent attestation
- Behaviour creation with a required operational definition
- Episode/ABC logging (setting event, antecedent, consequence, severity,
  frequency/context, risk flags) — the highest-frequency-use screen
- FAST-structured function screener, self-administered
- Dashboard with per-behaviour severity/frequency trend charts
- JSON export/import and a backup-overdue reminder banner

## Not yet built (later phases, see brief)

- Phase 2: on-demand triangulation (`FunctionHypothesis`, agreement/
  confidence)
- Phase 3: escalation flags (`RiskFlag`) and clinical documentation export
- Phase 4: multi-informant screener handoff (QR first, email relay only if
  demand is validated) and BYO-storage sync for ongoing episode logging

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build to dist/
npm run preview  # serve the production build locally
```

Stack: Vite + React + TypeScript, Tailwind CSS, Dexie (IndexedDB),
react-router-dom, recharts, vite-plugin-pwa.
