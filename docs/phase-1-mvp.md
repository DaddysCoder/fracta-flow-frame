# Coding Brief — Combined FBA / Function-of-Behaviour Tool

Status: pre-build, for developer scoping and estimation
Owner: [practitioner name]
Domain: NDIS positive behaviour support (PBS)

---

## 1. What this is

A tool for behaviour support practitioners that combines:
- Structured behaviour description, frequency, severity, risk and trigger/setting-event data (existing practitioner workflow)
- A function-of-behaviour screener (indirect assessment), built on the **published, open-access FAST item structure** — not QABF or MAS, which are commercial/copyrighted
- A descriptive data layer (ABC episode logging) that accumulates against the same behaviour records over time
- **Triangulation logic**: compares the screener's hypothesised function against the pattern emerging from logged episodes, and surfaces *agreement / partial match / mismatch* — never a single confident verdict
- **Escalation flags**: when severity crosses a threshold, mismatch persists, or confidence stays low, the tool prompts the practitioner toward experimental functional analysis or senior review — it does not resolve the question itself
- A documentation export suitable for inclusion in a behaviour support plan

## 2. What this explicitly is NOT

- Not a diagnostic tool. It produces hypotheses and flags disagreement, never a determination of function.
- Not a replacement for experimental/analogue functional analysis — it's a structured intake and triangulation layer that should *point toward* EFA when confidence is low, not substitute for it.
- Not a general data-collection/storage platform. See architecture below — by default it does not retain identifiable participant data centrally.
- Not built on QABF or MAS item content (licensing) — FAST's published structure is the reference for the screener; severity/frequency uses an original scale (§7.3), not BPI-01, avoiding any licensing dependency.

## 3. Regulatory and design constraints (non-negotiable, baked into architecture — not bolted on later)

- **NDIS Quality & Safeguards Commission position on AI in behaviour support plan development (Feb 2026):** does not endorse AI-generated clinical content; expects full de-identification and no participant personal information disclosed to AI systems; explicitly names "automated decision-making without clinical judgement" as a risk. → The tool assembles and flags; it never authors clinical conclusions. Any computed output must be presented as a hypothesis requiring practitioner sign-off, not a result.
- **Butler v NDIA:** practitioners remain fully accountable for content they cannot explain. → Every computed hypothesis must show its inputs (which episodes, which screener responses) — no black-box scoring.
- **Australian Privacy Act (APPs):** even *transient* processing of identifiable health data counts as "collection/handling," not just storage. Applies regardless of whether data is retained.
- **IP/licensing:** FAST item structure is safe (published in open journal article, Iwata et al., 2013). Severity/frequency rating uses an original scale authored for this tool (§7.3), not a licensed instrument — no reproduction rights needed.

## 4. Architecture

### Core principle: local-first, not server-first
The MVP is a **Progressive Web App (PWA)** — installable to the home screen, works offline, stores data in the browser's local storage (IndexedDB) on the practitioner's own device. There is **no central database of participant data** in the MVP. This is a deliberate compliance and liability decision, not just a technical one — see §3.

- All computation (severity scoring, triangulation logic, confidence calculation) runs **client-side**. No participant data needs to leave the device for the tool to function.
- Practitioner is the effective data controller for their own local device; the vendor is not holding a standing archive.
- Durability caveat to design around: browser local storage is not bulletproof long-term (iOS Safari in particular is known to clear it aggressively) — the product must prompt regular export/backup, not treat on-device storage as permanent.

### Multi-informant data collection (phased, not MVP)
Ongoing collection from multiple support workers/parents is the target end state but is explicitly **out of scope for MVP**. Two different mechanisms for two different data types, added in later phases:

**Add-on v1 — Screener handoff via ephemeral relay (email-based, form-style)**
The practitioner generates a one-time link for a specific behaviour + informant, emails it out, the informant fills in the screener on their own device, and the response is retrieved back into the practitioner's app.
- This requires a small **relay backend** — it cannot be done as pure local-only, since something has to hold the response between informant submission and practitioner retrieval.
- Design as **ephemeral, not archival**: response is encrypted client-side before transmission, held only until the practitioner's device retrieves it, then purged. No standing database of informant responses.
- Still counts as "handling" personal data under the Privacy Act even though nothing is retained — needs consent framing and encryption in transit and at rest during the brief hold window.
- Build components: token generation with expiry, transactional email sending, temporary encrypted storage, retrieval + purge logic.

**Add-on v1 (alternative, no backend) — QR handoff**
For same-room/synchronous handoff only: informant completes the screener on their own device, generates a QR code of their responses (small payload — a 16–30 item screener fits comfortably in one QR frame), practitioner scans it directly into their device. Zero server involvement. Good fit specifically because the screener is a single, discrete, small completed instrument — not suited to the episode/ABC data below.

**Add-on v2 — BYO-storage sync for ongoing episode logging**
Continuous, high-volume, multi-person episode logging doesn't suit a relay or QR pattern (too frequent, too much data). For this, connect to storage the *organisation* already controls and is already responsible for (their own Google Drive/SharePoint/case management export folder) rather than centralising it on the vendor's infrastructure. Heavier build (OAuth/connector flow per storage provider), gated to orgs that opt in; local-first remains the default for anyone who doesn't connect storage.

### Decision still open before backend work starts
Whether the relay pattern (v1) is worth building before validating demand with the QR/no-backend version first. Recommend building QR handoff before the email relay, since it delivers the same core capability (multi-informant screener) with zero backend risk, and can validate whether async (non-same-room) handoff is actually needed before investing in it.

## 5. Data model

```
Organisation ─┬─ Practitioner
              └─ Participant ── Behaviour ─┬─ Episode (many)
                                            ├─ FunctionScreener (many, per informant)
                                            ├─ FunctionHypothesis (computed, recalculated)
                                            └─ RiskFlag (many)
```

### Organisation
`org_id`, `name`, `ndis_registration_status`, `data_residency_region`

### Practitioner (user)
`practitioner_id`, `org_id` (FK), `name`, `role` (BSP / support worker / senior practitioner), `ndis_registration_number` (nullable, scope-gating), `permissions`

### Participant
`participant_id`, `org_id` (FK), `identifying_details` (kept logically/physically separate from all behavioural data — de-identification-ready by design), `consent_attested` (boolean), `consent_attested_at`, `consent_attested_by` (FK — practitioner, not vendor; no scope tracking or verification, see §7.4), `primary_practitioner_id` (FK)

### Behaviour
`behaviour_id`, `participant_id` (FK), `name`, `operational_definition` (required — observable/measurable, no interpretation), `status`, `created_by`, `created_at`

### Episode (descriptive/ABC data)
`episode_id`, `behaviour_id` (FK), `date_time`, `duration`, `severity_rating` (0–3 original scale, see §7.3), `frequency_context` (0–4 original scale, see §7.3), `setting_event`, `antecedent` (text + tag: demand/transition/sensory/social/unknown), `consequence` (text + tag: attention/escape/tangible/automatic/none observed), `logged_by` (FK), `risk_flags` (checklist: injury/property damage/elopement/etc.)

### FunctionScreener (indirect assessment)
`screener_id`, `behaviour_id` (FK), `informant_id` (FK, role recorded), `date_completed`, `domain_scores` (attention/escape/tangible/automatic — FAST-structured), `raw_responses` (stored for audit trail, not just the score)

### FunctionHypothesis (computed, never hand-authored)
`hypothesis_id`, `behaviour_id` (FK), `screener_result`, `episode_pattern_result`, `agreement_status` (match/partial match/mismatch), `confidence_level` (derived — anchor thresholds to descriptive-assessment methodology literature on minimum observation counts, not an arbitrary number), `last_computed_at`

- **Recompute trigger: on-demand only, not live.** Practitioner explicitly triggers recomputation after adding data, rather than the hypothesis silently updating in the background. This is a deliberate choice to keep the tool legible as decision support rather than automated decision-making (§3).

### RiskFlag / Escalation
`flag_id`, `behaviour_id` (FK), `trigger_type` (severity threshold / persistent mismatch / low confidence over N episodes / risk checklist item), `triggered_at`, `status` (open/acknowledged/escalated to EFA/resolved), `acknowledged_by` (FK — forces active practitioner response, not silent logging)

### DocumentationExport
`export_id`, `participant_id`/`behaviour_id`, `generated_at`, `generated_by`, `content_snapshot` (versioned, for audit trail), `format` (clinical report / plan appendix / staff training summary)

## 6. Phased roadmap

**Phase 1 — MVP (local-only, single practitioner)**
- Behaviour definition screen
- Episode/ABC logging screen (highest-frequency-use screen — prioritise this UX)
- FAST-structured function screener, self-administered by the practitioner
- Original 0–4 frequency / 0–3 severity scale (§7.3) on episodes
- Dashboard: frequency/severity trend per behaviour over time
- Local storage (IndexedDB), export/backup prompts

**Phase 2 — Triangulation logic**
- On-demand hypothesis computation comparing screener result to episode pattern
- Agreement/partial match/mismatch display with confidence level
- Auditable: shows which episodes/responses fed the computation

**Phase 3 — Escalation and documentation**
- Auto-flag on severity threshold, persistent mismatch, or sustained low confidence
- Practitioner must acknowledge flags (not silently dismissible)
- Export view formatted as defensible clinical documentation

**Phase 4 — Multi-informant add-on**
- QR handoff for screener (no backend)
- Evaluate demand for async email relay before building it
- Evaluate demand for BYO-storage sync for ongoing multi-person episode logging

**Phase 5 (future, not scoped here)** — potential link from FunctionHypothesis output into a separate strategy-matching tool (function → evidence-based strategy), staying standalone until both tools are mature.

## 7. Decisions (resolved Aug 2026)

1. **Practitioner scope gating — RESOLVED: open signup, not NDIS-restricted.** Standard self-serve onboarding (role/profession field, no registration verification), same as most professional SaaS tools. Liability consequence: since there's no verification step, the disclaimer/ToS layer becomes the primary liability defence — "decision support, not diagnostic," requires appropriate clinical judgement to interpret — must be unmissable at first use, not buried in ToS.

2. **Confidence threshold — RESOLVED: anchored to established FBA methodology, not invented.** Two citable conventions:
   - Idaho SDE FBA Technical Handbook: minimum 3–6 baseline data points needed to establish a pattern/trend before acting on it.
   - Descriptive/experimental FBA methodology (Martin & Pear, 2011; Bourret & Pietras, 2013, as summarised in *Instruction in Functional Assessment*): at least 5 data points, gathered across 5+ separate sessions/days, examined for stability, trend, and overlap before a pattern is considered reliable.

   Proposed tiers for `FunctionHypothesis.confidence_level`:
   - **Low** — fewer than 3 episodes logged
   - **Moderate** — 3–5 episodes showing a consistent pattern across at least 2 different days/contexts
   - **High** — 5+ episodes, consistent pattern, across 5+ separate days (matches the descriptive-assessment convention above)

   **Critical caveat to surface in the UI regardless of tier:** Thompson & Iwata's comparison of descriptive assessment against true experimental functional analysis found agreement in only 3 of 12 cases. Even a "high confidence" match between screener and episode pattern is *not* equivalent to experimental FA confirmation — the tool should say this explicitly wherever confidence is displayed, not just gate on episode count.

3. **Severity/frequency scale — RESOLVED: build an original scale, not a licensed instrument.** BPI-01 is a fixed 52-item list; this tool doesn't need a fixed item bank because `Behaviour.operational_definition` is already practitioner-authored per behaviour. Rate *that* on a generic ordinal scale instead — same move already made with FAST vs. QABF (open structure, original wording, no licensing dependency).

   Proposed scale:

   **Frequency (0–4):**
   - 0 — Never observed
   - 1 — Rarely (less than monthly)
   - 2 — Occasionally (weekly)
   - 3 — Frequently (daily)
   - 4 — Constantly (multiple times daily or more)

   **Severity (0–3):**
   - 0 — No problem / no impact
   - 1 — Mild — minor disruption, no harm, brief redirection resolves it
   - 2 — Moderate — noticeable disruption/distress, some risk of harm or property damage, requires active intervention
   - 3 — Severe — significant risk of harm to self/others or major property damage, requires immediate intervention/emergency response

   **Honest caveat to carry into the product and documentation:** this scale is *original and operationally practical*, not independently psychometrically validated the way BPI-01, OBS, or FAST are — there's no published reliability/validity evidence for these specific anchor points because they're newly authored, not sourced from a validated instrument. Label it as such in the tool (e.g. "practical severity rating," not "validated severity measure") — same evidentiary category as the risk-flag checklist, not the same category as the FAST-based function screener. Free from licensing risk in exchange for not being able to cite external psychometric evidence for this specific component.

4. **Consent — RESOLVED: simple attestation, not a managed consent system.** The practitioner is the one obtaining and being responsible for consent (their existing NDIS Practice Standards obligation) — the tool's role is limited to capturing that they attested to it, not verifying, scoping, or taking any responsibility for it.
   - `consent_record` simplified to: boolean (attested yes/no) + timestamp + which practitioner ticked it. No scope tracking, no per-feature consent management, no vendor-side verification.
   - Standard checkbox pattern: "I confirm appropriate consent has been obtained for this data" at the point of participant creation.
   - ToS makes explicit: consent is entirely the practitioner's/organisation's responsibility — the tool provides the attestation record only, takes no responsibility for whether consent was actually properly obtained.

5. **Phase 4 relay backend — RESOLVED: build QR-only first, validate demand before building the email relay.** No infrastructure work on the relay until QR-based multi-informant support has shipped and usage shows whether async (non-same-room) handoff is actually needed.
