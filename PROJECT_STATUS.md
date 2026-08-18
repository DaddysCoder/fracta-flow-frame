# Frame — Project Status

Repo: `DaddysCoder/fracta-flow-frame` ("Frame" — the assessment/FBA half of a
two-repo clinical system; "Vector", a separate repo, does BSP authoring and
is out of scope here).

This file replaces the stale onboarding docs it supersedes
(`docs/handoff-brief.md`, and the phase-by-phase README sections that no
longer reflected the codebase) as the single current-status reference for
whoever — human or agent — picks this repo up next.

## Canonical branch

**`reconcile/frame-current`**, branched from `phase-1.5` (the most advanced
branch at reconciliation time: phases 1.1 through 1.5 — wording audit,
checklist-union mechanism, formulation-as-collection, escalation cycle,
dynamic ABC checklists, NDIS terminology tooltips, summary statements,
practitioner confidence rating, cross-cutting dashboard).

It has **not been merged into `main`** — that merge is a deliberate human
decision, not this reconciliation's call, given this is clinical-forms
software. Review `reconcile/frame-current` and merge when satisfied.

Three other branches existed off `main`'s older tip and independently
reimplemented overlapping ground: `claude/frame-phase-1-contract-qxzs36`,
`claude/participant-profile-import`, `claude/strategy-library-seam`. None
of them are merged; useful work was selectively recovered onto
`reconcile/frame-current` instead (below). All three branches are left
intact on `origin` — nothing was deleted.

## Built features (phase-1.5 baseline)

- Practitioner profile + first-use disclaimer gate
- Participant creation with consent attestation; Behaviour creation with a
  required operational definition and a grouped concern-category checklist
- Episode/ABC logging: setting event / antecedent / consequence, each with
  a dynamic per-behaviour checklist (generic starter list ∪ everything
  previously added for that behaviour) plus free text; severity/frequency
  practical scales; risk flags
- FAST-structured function screener, self-administered or via QR handoff
- **Triangulation**: on-demand `FunctionHypothesis` (screener vs. episode
  pattern), agreement status, confidence tier, full audit trail, plus a
  separate practitioner subjective confidence rating (1–6, never merged
  into the computed tier)
- **Formulation**: multiple guided-interview records per behaviour,
  including a 6-phase escalation cycle with per-phase checklists
- **Risk flags**: four auto-triggers, acknowledge → escalate-to-EFA/resolve
  workflow enforced in the actions layer
- **Documentation exports**: `clinical_report` / `plan_appendix` /
  `staff_training_summary`, immutable HTML snapshots
- **Multi-informant QR handoff**: screener invites and incident/ABC report
  invites, both over the same token-based two-QR mechanism, no backend
- Auto-generated plain-English summary statement per behaviour
- In-app NDIS terminology tooltips
- Cross-cutting Dashboard: open flags across every participant, merged
  recent-activity feed, low-confidence-despite-episodes callout

## Recovered on top, this reconciliation

From `claude/frame-phase-1-contract-qxzs36` — the only branch of the three
with genuinely new capability, once its reimplementation of things
phase-1.5 already had better versions of was set aside (see below):

- **`packages/contract`** (`@fracta/contract`) — the versioned Frame/Vector
  boundary package: `ParticipantContext` (Vector → Frame),
  `FbaOutcomeBundle` (Frame → Vector), validators, and a PII-denylist fuzz
  test. Brought across wholesale — it has no dependency on either repo's
  internal types. Wired in via npm workspaces.
- **`ParticipantContext` import** (`importParticipantContext` in
  `actions.ts`) — Participants → "Import from Vector". Validates against
  the contract, upserts a participant by `linkId`, stores `planCycle` and
  `knownBehaviourLabels` (offered as suggestions, never auto-created).
  Participant gained `linkId` / `planCycle` / `knownBehaviourLabels`
  fields (Dexie migration v13).
- **`FbaOutcomeBundle` generation/export** (`lib/fbaOutcomeBundle.ts`,
  `generateFbaOutcomeBundleExport`) — assembles the contract-shaped,
  validated, PII-denylist-checked bundle from a behaviour's episodes,
  formulations, hypothesis and open risk flags, and stores it as an
  immutable `fba_outcome_bundle` `DocumentationExport`. Fails closed (with
  a clear reason, no silent fallback) when the participant has no
  `linkId`, a selected behaviour has no operational definition, or no
  hypothesis has been computed yet. Surfaced in `ExportPanel`.
- **Printable paper forms** (`lib/printableForms.ts`) — blank,
  print-to-fill versions of the Formulation interview and the ABC/episode
  form, using the exact same starter checklists as the on-screen forms.
  Linked from the Behaviour detail page's Episodes/Formulation tabs.
- **Behaviour trend chart** (`components/BehaviourTrendChart.tsx`) — a
  severity/frequency line chart per behaviour, finally using the
  `recharts` dependency that was already installed but unwired. Added to
  the Episodes tab.

Everything above was **adapted to phase-1.5's existing APIs** —
`FormulationRecord`, `EscalationPhaseData` (whose `checkedItems` are
already resolved display strings, not item IDs), `scales.ts`/`checklists.ts`
for content, `practitionerConfidenceRating` — rather than reintroducing the
contract branch's own parallel `Formulation`/`ChecklistEntry`/
`escalationContent.ts`/`fbaContent.ts` types and content, which is what it
had independently rebuilt on top of an older base.

## Deliberately left out, and why

**From `claude/frame-phase-1-contract-qxzs36`** — everything below is a
duplicate reimplementation of ground phase-1.5 already covers, built
independently because that branch forked before phase 1.1–1.5 landed.
Per the reconciliation brief, phase-1.5's version wins in every case:

- `src/lib/checklists.ts`, `terminology.ts` deletions/rewrites, and
  `scales.ts`'s 235-line rewrite — phase-1.5's wording-audited
  `scales.ts`/`checklists.ts`/`terminology.ts` are the current, reviewed
  content; the contract branch's `fbaContent.ts`/`escalationContent.ts`
  are a parallel, less-reviewed sourcing pass over the same material.
- `Formulation`/`ChecklistEntry`/`EscalationCycle` types — phase-1.5's
  `FormulationRecord`/`EscalationPhaseData` (plus its Phase 1.4
  informant-name/role fields) supersede these.
- `IncidentReportPage.tsx` / `incidentReportPayload.ts` — phase-1.5
  already ships this exact feature (option (b): generic starter
  checklist + free text on the `/report` page, practitioner reconciles on
  import) as `InformantReportPage.tsx` / `reportPayload.ts` / `ReportInvite`,
  and phase-1.5's payload actually carries more detail (checklist tag
  indices, not just free text).
- `practitionerConfidence` / `setPractitionerConfidence` /
  `hypothesisConfidence.test.ts` — phase-1.5 already shipped this as
  `practitionerConfidenceRating` / `setPractitionerConfidenceRating`.
- `SummaryStatementPanel.tsx`, `Tooltip.tsx`, `LowConfidenceList.tsx`,
  `RecentActivityFeed.tsx`, `ChecklistGroup.tsx` — phase-1.5's
  `BehaviourDetail.tsx` (summary statement inline + `InfoHint`) and
  `Dashboard.tsx` (low-confidence callout + activity feed inline) already
  cover this ground; these components are a parallel rebuild of the same
  UI against the rejected types above.

**`claude/participant-profile-import`** — left out entirely. It adds a
`ParticipantProfile` field to `Participant` carrying legal name, date of
birth, NDIS number, address, and contacts, imported from a hypothetical
external "pbs-registry" system unrelated to the Frame/Vector contract.
This works against a core design principle phase-1.5 (and the
`@fracta/contract` boundary) deliberately upholds: Frame keeps identifying
detail to a single opaque `identifyingDetails` string precisely so it can
be excluded from every clinical export by construction, and the
sanctioned way for participant identity to enter Frame from an external
system is `ParticipantContext`'s `displayLabel` (initials/alias only,
contract A1/A2) — not a second, richer identity-import pathway carrying
real PII. Recommend re-evaluating this branch's actual need separately,
against the real Vector integration, rather than merging it as-is.

**`claude/strategy-library-seam`** — left out entirely, flagged per the
reconciliation brief's explicit instruction to check it carefully. It adds
a `MatchedStrategy`/`StrategyLookup` seam so `staff_training_summary`
exports can render ranked, rationale-carrying intervention strategies.
Even though it ships with "no strategy content or matching logic," a
match-and-rank-strategies-by-function seam is exactly the shape of BSP
*intervention planning* content — picking and justifying strategies for a
function — which is Vector's job, not Frame's (see the reconciliation
brief's item 8: no strategy approval / plan-authoring content in Frame).
Frame's boundary with Vector should stay the one-way `FbaOutcomeBundle`
handoff (assessment findings out); a strategy-matching hook growing inside
Frame's own document renderer invites exactly the scope creep the
Frame/Vector split exists to prevent, even sitting inert. If a
strategy-library integration is wanted, it belongs on Vector's side of the
contract boundary, consuming `FbaOutcomeBundle.outcomes[].hypothesis` the
way any other downstream consumer would.

## A naming note: `src/components/HandoffPanel.tsx`

The reconciliation brief listed this alongside `README.md`'s handoff
sections and `docs/handoff-brief.md` as stale documentation to fold into
this file. It isn't documentation — it's the live "Multi-informant" tab
component (QR invite generation/scanning for both the screener and
incident-report handoff flows). It was left untouched. Only the actual
stale planning docs (`docs/handoff-brief.md`, now removed) were folded in
here.

## Vector ↔ Frame interface

The only thing that crosses the repo boundary is `@fracta/contract`
(`packages/contract`), imported by both repos, importing neither:

- **In**: Vector → Frame via `ParticipantContext` — `linkId` (Vector-minted,
  opaque), `displayLabel` (initials/alias, never identifying detail),
  `planCycle`, `knownBehaviourLabels`, consent fields. Consumed by
  `importParticipantContext`.
- **Out**: Frame → Vector via `FbaOutcomeBundle` — one bundle per
  generation, one `FbaOutcome` per included behaviour: summary statement
  (rendered + structured slots), hypothesis (screener/episode results,
  agreement, computed + practitioner confidence, the mandatory EFA
  caveat), evidence base (episode/screener audit trail), merged
  escalation-cycle display text, open risk flags. Produced by
  `generateFbaOutcomeBundleExport`, fails closed (no `linkId`, no
  operational definition, no computed hypothesis), validated against the
  contract and PII-denylist-checked before it's ever written.
- Identity never crosses in the other direction: Frame never mints a
  `linkId`, and no field carrying legal name/DOB/NDIS number/address/etc.
  is allowed in a bundle (enforced by `findDenylistedKeys`, fuzz-tested in
  `packages/contract/src/contract.test.ts`).

## Unfinished / open work

- `staff_training_summary` documentation export is still an intentional
  stub — see the strategy-library-seam decision above for why that stays
  a Vector-side integration rather than growing inside Frame.
- No UI yet to browse/manage a participant's `knownBehaviourLabels`
  suggestions when adding a new Behaviour — the data is imported and
  stored, but "Add behaviour" doesn't surface them as suggestions yet.
- `FbaOutcomeBundle.planCycleRef` is populated correctly whenever the
  participant has an imported `planCycle`, but there's no UI feedback
  loop showing the practitioner *why* a plan cycle is or isn't being
  echoed into a given bundle.
- `claude/participant-profile-import` and `claude/strategy-library-seam`
  remain unmerged, unresolved branches — see above for why, and consider
  formally closing them out (or explicitly rejecting) rather than leaving
  them open indefinitely.

## Next 3 tasks

1. Wire `knownBehaviourLabels` into the "Add behaviour" flow as
   suggestions (never auto-created), closing the loop on the
   `ParticipantContext` import.
2. Decide and document the `claude/participant-profile-import` and
   `claude/strategy-library-seam` branches' fate (close, or scope a
   Vector-side/contract-extension replacement) rather than leaving them
   open indefinitely.
3. Get `reconcile/frame-current` reviewed and merged into `main` — it is
   deliberately not merged by this reconciliation.
