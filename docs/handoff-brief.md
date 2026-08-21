# Handoff Brief — Frame by WhatBit (FBA Screener)

Repo: https://github.com/DaddysCoder/fracta-flow-frame
Live: https://screen-fba.polina-67d.workers.dev/
Purpose of this document: onboard a new coding agent (Gemini CLI, Claude Code, or similar) to continue this build with full context, without needing the original planning conversation.

---

## 0. First task: audit before building anything

**Status of Phase 2 and Phase 3 is unconfirmed — verify against the actual codebase before assuming either is done.** Phase 1 (MVP) and Phase 4 (QR multi-informant handoff) are confirmed shipped and tested. Phase 2 (triangulation logic) and Phase 3 (escalation/documentation) have written briefs but no confirmed shipped status. Check the repo directly — look for a `FunctionHypothesis` implementation (Phase 2) and a `RiskFlag`/`DocumentationExport` implementation (Phase 3) — before planning further work, rather than trusting any assumption about what exists.

## 1. What this is

A local-first PWA for NDIS/disability behaviour support practitioners: structured behaviour intake, ABC/episode logging, a function-of-behaviour screener, and (per the roadmap) logic that compares the screener's hypothesis against observed episode patterns and flags disagreement rather than asserting a single answer. Explicitly positioned as **decision support, not diagnostic** — the tool assembles and flags, the practitioner interprets and decides. This framing must be preserved in every UI surface, not just a one-time disclaimer.

## 2. Core architectural principles (non-negotiable — preserve in all future work)

- **Local-first, no backend for participant data.** Data lives in the practitioner's browser (Dexie/IndexedDB), not on a server. This is a deliberate compliance/liability decision (NDIS Quality & Safeguards Commission doesn't endorse AI-generated clinical content or automated decision-making without clinical judgement), not just a technical choice.
- **No licensed/copyrighted clinical instruments.** The function screener is built on FAST's openly published item structure (Iwata et al., 2013), not QABF or MAS (both commercial/copyrighted). The severity/frequency scale is an original 0–4/0–3 scale, not BPI-01 (dropped due to licensing). Any new checklist content should be sourced from openly citable material (see §6) or built original — never copy a paid provider's proprietary item list.
- **Computed outputs are hypotheses, never verdicts.** Any function/pattern-matching logic must show agreement/mismatch/confidence, with visible caveats, and must be recomputed on-demand (practitioner-triggered), not live/automatic — automatic recomputation risks reading as automated decision-making to a regulator.
- **Full audit trail.** Every computed result must show what data fed it (episode IDs, screener response IDs). Practitioners are accountable for content they can't explain (Butler v NDIA precedent) — the tool must support that, not obscure it.
- **Scope gating: open signup**, not restricted to registered practitioners — liability is handled via an unmissable "decision support, not diagnostic" disclaimer, not identity verification.
- **Consent: a plain attestation only** (boolean + timestamp + who) — not a scope-tracked consent management system. The practitioner/org is fully responsible for consent being properly obtained; the tool just records that they attested to it.

## 3. Stack

Vite + React + TypeScript + Tailwind + Dexie (IndexedDB), offline-capable PWA. QR generation/scanning via a client-side library (jsqr for scanning) with manual paste as an equally-prominent fallback (camera scanning doesn't always work in real practitioner use). Deployed on Cloudflare Pages/Workers.

## 4. Confirmed shipped

**Phase 1 (MVP):** disclaimer gate, consent attestation, practitioner profile, participant/behaviour management with required operational definitions, episode/ABC logging (severity/frequency scales, antecedent/consequence tags, risk flags), FAST-structured screener, dashboard with trend charts, JSON export/import, backup-overdue reminder.

**Phase 4 (multi-informant QR handoff):** two-QR mechanism — invite QR carries only a token + informant role (no clinical/behaviour detail, verified no leakage), opens a standalone `/screener` route (no install, no IndexedDB, no nav chrome) for the informant, response renders as a second on-screen QR the practitioner scans back (camera or manual paste). Correlated via a random token, no backend. Response payload solved structurally (24-char answer-code string against the screener's fixed item order, ~78 bytes) rather than needing to trim audit detail. Explicit unit-tested error states (token not found/used/cancelled), transactional duplicate-scan rejection. 41 unit tests passing, full Playwright round-trip verified across two browser contexts.

**Brand identity applied:** Frame by WhatBit — `FRAME` wordmark, WhatBit parent lockup (`What` ink / `Bit` accent `#7B2FF7`), ink `#0B0B0C`, muted `#6B6B6B`, Montserrat + Nunito. Accent is used on chrome (sidebar/pill nav, mark), not on every clinical action button.

## 5. Pending work (in rough priority order)

**Phase 2 — Triangulation (`FunctionHypothesis`)** — *verify not already built first (§0)*
Compare the FAST screener's hypothesised function domain against the dominant pattern in logged episode consequence tags (these already align 1:1 with the four FAST domains — attention/escape/tangible/automatic, no mapping layer needed). Agreement status: match/partial_match/mismatch/insufficient_data. Confidence tiers anchored to citable methodology, not arbitrary: Low <3 episodes; Moderate 3–5 episodes across ≥2 distinct days; High 5+ episodes across ≥5 distinct days (Idaho SDE FBA handbook; standard descriptive-assessment convention). **Mandatory caveat wherever confidence is shown:** even a full match is not equivalent to experimental functional analysis confirmation (Thompson & Iwata found descriptive assessment matched true FA outcomes in only 3 of 12 cases). Recompute is on-demand only, never automatic.

**Phase 3 — Escalation & documentation (`RiskFlag`, `DocumentationExport`)** — *verify not already built first (§0)*
Four trigger types: severity threshold crossed, risk-checklist item ticked (fires immediately, independent of severity), persistent mismatch across 3 consecutive recomputes, sustained low confidence despite 8+ episodes. Acknowledge → escalate-to-EFA or resolve-with-note workflow, no silent dismissal. Documentation export in three formats (clinical_report, plan_appendix, staff_training_summary) rendered as print-to-PDF HTML with immutable content snapshots — `staff_training_summary` is deliberately a stub until the separate strategy-library project can plug in matched strategies.

**Phase 1.1/1.2/1.3 — UX and content overhaul** (most recent work, likely not yet built)
- Navigation fixes: obvious next-step after saving a Participant; creating a Behaviour should land directly in its detail view, not require a second click back in
- Dashboard fix: currently duplicates the Participants list — should instead show cross-cutting analytics (open risk flags across everyone, recent activity feed, low-confidence behaviours needing attention, backup-overdue reminder). Participants screen stays as the plain list/management view.
- Behaviours of Concern: replace free text with a grouped-checkbox list sourced from the Queensland DoE FBA guide's Problem Behaviour Inventory (adapted from LaVigna & Willis) — grouped under headers (aggression/harm to others, property/environment, self-directed, elopement/unsafe wandering, verbal/vocal, non-compliance/avoidance, repetitive/unusual), plus "Other" free text. Adapt wording from school-context to general disability-support context.
- New **Formulation** feature (multiple records per behaviour, not one fixed section): guided-prompt interview sections (behaviour description with recent-example/intense-episode/before-and-response prompts; onset; frequency impression — separate from real logged-episode data, must not feed Phase 2's confidence calc; high/low risk scenarios) each resolving to free text, not mandatory fields. Includes a 6-phase escalation cycle (baseline/early warning/escalation/peak-crisis/de-escalation/recovery) with tick-box observable-behaviour checklists per phase (standard PBS/Colvin convention).
- ABC/episode logging becomes dynamic: checklists pulled from that behaviour's Formulation data (antecedent/trigger, setting event, consequence — sourced from the Queensland DoE guide's FACTS/ABC Recording Form categories), falling back to generic lists if no Formulation exists yet, always with "add your own" (saved back for reuse).
- **Consequence checklist must still map to the four FAST domains** for Phase 2 compatibility — attention can be split into adult/peer subtypes for display, but must roll up to the parent `attention` domain for hypothesis matching.
- Extend the Phase 4 QR mechanism to incident/ABC reports, not just the screener — open design decision, not yet resolved: full per-behaviour checklist fidelity in the QR payload vs. a simpler generic checklist reconciled on import. Decide before building.
- Make the manual-paste/copy-code path for QR responses equally prominent, not a buried fallback (real practitioners often can't rely on in-person camera scanning).
- New: auto-generated plain-English summary statement (template: *"During [routine] when [antecedent], [participant] will [behaviour] because [consequence]. Therefore the function is to [access/avoid]. More likely when [setting event]."* — Queensland DoE guide), populated from the most common logged patterns plus the current FunctionHypothesis, shown on the behaviour detail view and included in documentation exports.
- New: optional practitioner self-rated confidence (1–6 scale, Queensland DoE guide convention) attached to a FunctionHypothesis, shown alongside — not merged with — the computed confidence tier.
- In-app terminology tooltips (Antecedent, Function, Hypothesis, Setting event, etc.) using the Queensland DoE guide's plain-language definitions.

## 6. Source material to work from

- FAST (Functional Analysis Screening Tool) — Iwata et al., 2013, published/open, already the basis for the screener
- Idaho SDE FBA Technical Handbook — confidence threshold convention
- *Guide to Functional Behaviour Assessment for Schools*, Queensland Department of Education — Problem Behaviour Inventory (adapted from LaVigna & Willis), FACTS (adapted from March, Horner, Lewis-Palmer, Brown, Crone & Todd, 1999), ABC Recording Form, terminology, summary statement template — the source for most of §5's checklist content
- Colvin's Acting-Out Behaviour Cycle — general PBS/crisis-prevention convention, basis for the escalation cycle

## 7. What NOT to do

- Don't add any server-side storage of participant data — breaks the core compliance/liability positioning
- Don't make FunctionHypothesis recompute live/automatic
- Don't use QABF, MAS, or BPI-01 content/wording directly — licensing risk
- Don't build the email-relay backend for multi-informant handoff unless QR-only usage shows real demand for it — deliberately deferred
- Don't over-invest in the `staff_training_summary` export format — it's a stub pending the separate strategy-library integration
