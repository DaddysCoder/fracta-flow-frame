# Primitive AI — FBA Screener

A behaviour support practitioner tool combining structured behaviour/episode
(ABC) logging with a FAST-structured function-of-behaviour screener — local-first,
decision support only. **Phase 1 (MVP) + Phase 2 (triangulation) + Phase 3
(escalation & documentation) + Phase 4 (multi-informant QR handoff)** of the
phased build described in the coding brief, under the Primitive AI brand.

### Brand identity

The header/disclaimer wordmark ("Primitiv*e*<sup>AI</sup>") and the
ink/deep-magenta/paper palette follow the supplied brand guidelines
(`--ink:#333333`, `--mag:#9D1D5B`, `--lift:#D8579A` on dark, `--paper:#F5F4F2`).
Per the guidelines' own rule, magenta appears on exactly the wordmark's "e"
and nowhere else — no magenta headings, rules, or buttons. **No actual SVG
logo asset was supplied** with the guidelines, only filenames — the
guidelines explicitly say "don't rebuild the wordmark by typing it, use the
SVG," which isn't possible without one. `src/components/Wordmark.tsx` is a
documented, literal fallback: swap in the real SVGs if they become
available. The informant-facing `/screener` page deliberately carries no
wordmark — the brief requires it to show no chrome tying it to clinical
records at all.

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

- Every computed value (screener domain scores, episode history, the
  triangulated hypothesis) shows the inputs that produced it — no black-box
  scoring. The hypothesis view has an explicit "show what fed this
  computation" receipts panel (Butler v NDIA transparency requirement).
- Triangulation is **on-demand only** — a practitioner clicks "Recompute
  hypothesis"; nothing recalculates automatically in the background, on
  every episode save, or on a timer. This is deliberate: live recomputation
  risks reading as automated decision-making rather than decision support.
- The mandatory EFA caveat ("even a full match is not equivalent to
  confirmation via experimental functional analysis") is shown next to the
  hypothesis result every time it's displayed, at every confidence tier —
  never a one-time disclaimer buried in settings.
- Risk flags never disappear silently: `open → acknowledged → (escalated_to_efa
  | resolved)` is enforced in the actions layer, not just the UI. Resolving
  without a note is rejected; there is no dismiss/hide action that leaves no
  trace, matching the Phase 2 audit-trail principle.
- No push/background notifications — there's no backend to send them from.
  Flags are in-app state surfaced when the practitioner opens the app.
- Documentation exports render to an immutable `contentSnapshot` at
  generation time (print-friendly HTML, no PDF library). Editing episodes or
  screeners afterward never changes an already-generated export.
- An unmissable first-use disclaimer ("decision support, not diagnostic")
  must be acknowledged before any other screen is reachable — this is the
  primary liability defence given open, unverified signup.
- Consent is a simple attestation (checkbox + timestamp + practitioner),
  not a managed consent system — the practitioner remains responsible for
  actually obtaining it.

## What's implemented

**Phase 1 (MVP)**
- Practitioner profile + first-use disclaimer gate
- Participant creation with consent attestation
- Behaviour creation with a required operational definition
- Episode/ABC logging (setting event, antecedent, consequence, severity,
  frequency/context, risk flags) — the highest-frequency-use screen
- FAST-structured function screener, self-administered
- Dashboard with per-behaviour severity/frequency trend charts
- JSON export/import and a backup-overdue reminder banner

**Phase 2 (triangulation)** — new "Triangulation" tab on each behaviour
- On-demand `FunctionHypothesis` computation: screener top domain(s)
  (averaged across multiple screeners, with an inter-rater disagreement
  flag) vs. the dominant episode consequence tag
- `agreementStatus` (match / partial_match / mismatch / insufficient_data)
  and `confidenceLevel` (low / moderate / high, anchored to the Idaho SDE
  and descriptive-assessment conventions, capped when episodes cluster on
  one day) always shown together, never as a single verdict
- Tied screener domains and tied episode patterns are treated as ambiguous,
  never forced to an arbitrary winner
- Audit/receipts view resolving `contributingEpisodeIds` /
  `contributingScreenerIds` to actual records
- Soft escalation nudge (not the automated Phase 3 version) on mismatch or
  persistent low confidence
- `src/lib/hypothesis.ts` is a pure, DB-free computation module with a
  vitest suite (`npm test`) covering every test case in the brief

**Phase 3 (escalation & documentation)** — new "Flags" tab per behaviour, a
dashboard flags banner, and a "Documentation" tab per participant
- `RiskFlag` auto-triggers, each firing independently so a behaviour can
  have several open flags at once:
  - `severity_threshold` — a Severe (3) episode, or 3 consecutive episodes
    trending upward — fires immediately on episode save
  - `risk_checklist_item` — any ticked risk checklist item, independent of
    severity — fires immediately on episode save, the most urgent trigger
  - `persistent_mismatch` — `mismatch` on 3 *consecutive recomputes* (not
    3 episodes) — checked when a hypothesis is recomputed
  - `sustained_low_confidence` — confidence stays `low` despite 8+ logged
    episodes — checked when a hypothesis is recomputed
  - Duplicate open flags of the same trigger type are suppressed until the
    existing one is acknowledged/escalated/resolved
- Acknowledge → escalate-to-EFA or resolve-with-note workflow, enforced in
  the actions layer: only open flags can be acknowledged, only acknowledged
  flags can be escalated or resolved, and resolving without a note throws
- `src/lib/riskFlags.ts` is a pure, DB-free trigger-check module with a
  vitest suite covering every test case in the brief (checklist independent
  of severity, two separate flags from one episode, recompute-count vs.
  episode-count for `persistent_mismatch`)
- Three documentation export formats over one shared data pass
  (`src/lib/documentExport.ts`): `clinical_report` (full detail — episodes,
  screeners, hypothesis, all flags), `plan_appendix` (condensed, still
  carries the EFA caveat, unresolved flags only), `staff_training_summary`
  (leanest — explicitly a stub pending the separate, out-of-scope
  strategy-library integration)
- Multi-behaviour export supported (`behaviourIds: string[]`); exports open
  as print-friendly HTML in a new tab for the browser's native print-to-PDF

**Phase 4 (multi-informant handoff, QR only)** — new "Multi-informant" tab
per behaviour, and a standalone `/screener` route
- Two lightweight QR codes, no backend, no accounts: the practitioner
  generates an invite QR encoding only a random `token` and `role` (never a
  behaviour name or any clinical detail); the informant completes the same
  FAST screener in their own mobile browser at `/screener` — a route that
  never touches IndexedDB and shows no navigation chrome — and gets back an
  on-screen response QR generated entirely client-side
- The practitioner scans the response QR (camera via `jsqr`, with a
  manual-paste fallback for when scanning isn't convenient) and the token
  round-trips the response to the correct `ScreenerInvite` automatically —
  no manual behaviour re-selection
- Payload-size discipline (brief §5) is solved structurally rather than by
  dropping detail: the response QR encodes only the token, a completion
  timestamp, and a 24-character answer-code string in `SCREENER_ITEMS`'
  fixed canonical order — domain and item id are reconstructed on decode
  from that same order, so the full response detail travels in ~80 bytes
  without ever needing FAST's `rawResponses`-vs-`domainScores` trade-off.
  `src/lib/qrPayload.test.ts` asserts this stays well under a safe QR
  capacity ceiling.
- Explicit error states, not silent failures: token not found, invite
  already used, and invite cancelled are three distinct messages. A second
  scan of an already-imported response is rejected (transactional check on
  the invite's status), so it can't silently create a duplicate
  `FunctionScreener`. Two pending invites for the same behaviour track and
  import independently.
- `src/lib/qrPayload.ts` and the invite/import actions are covered by a
  vitest suite exercising every test case in the brief (full round trip,
  unmatched token, duplicate scan, two concurrent invites, payload size).
  A full Playwright pass additionally verified the round trip across two
  separate browser contexts end to end.
- Explicitly deferred (brief §7): the async email relay (build only if
  QR-only usage shows real demand for it), any informant account/identity
  system, and BYO-storage sync for ongoing multi-person episode logging.

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build to dist/
npm run preview  # serve the production build locally
npm test         # vitest unit tests (triangulation, risk flags, QR payload/handoff)
```

Stack: Vite + React + TypeScript, Tailwind CSS, Dexie (IndexedDB),
react-router-dom, recharts, vite-plugin-pwa, qrcode, jsqr, vitest
(jsdom + fake-indexeddb for DB-backed tests).
