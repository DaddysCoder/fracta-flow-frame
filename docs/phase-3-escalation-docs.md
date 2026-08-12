# Coding Brief — Phase 3: Escalation & Documentation

Repo: https://github.com/DaddysCoder/fba-screener
Builds on: Phase 1 (shipped) + Phase 2 (triangulation/FunctionHypothesis)
Status: ready to build

---

## 1. What this phase adds

Two things: **automated risk flagging** (surfacing when something needs a practitioner's attention, with mandatory acknowledgement — not silent), and **documentation export** (turning the accumulated data into something that reads as defensible clinical documentation, not a raw data dump).

Constraint carried over from the architecture: this is still a local-first PWA with no backend. "Flags" are in-app surfaced state the practitioner sees when they open the app — not push notifications, since there's no server to send them from. Don't scope in a notification backend here.

## 2. Data model additions

```ts
interface RiskFlag {
  id: string;
  behaviourId: string;
  triggerType: 'severity_threshold' | 'persistent_mismatch' | 'sustained_low_confidence' | 'risk_checklist_item';
  triggerDetail: string;        // human-readable, e.g. "3 consecutive episodes rated Severe"
  triggeredAt: Date;
  status: 'open' | 'acknowledged' | 'escalated_to_efa' | 'resolved';
  acknowledgedBy: string | null;  // practitioner id — null until acknowledged
  acknowledgedAt: Date | null;
  resolutionNote: string | null;
}

interface DocumentationExport {
  id: string;
  participantId: string;
  behaviourIds: string[];        // supports multi-behaviour exports
  generatedAt: Date;
  generatedBy: string;
  format: 'clinical_report' | 'plan_appendix' | 'staff_training_summary';
  contentSnapshot: string;       // the fully rendered content at generation time — immutable once created
}
```

## 3. RiskFlag trigger logic

Each trigger type fires independently — a behaviour can have multiple open flags at once.

- **`severity_threshold`** — fires when an episode is logged with severity = 3 (Severe), or when 3+ consecutive episodes trend upward in severity. Fires immediately on save, not on next recompute.
- **`risk_checklist_item`** — fires immediately whenever any `Episode.risk_flags` checklist item is ticked (injury, property damage, elopement, etc.), regardless of severity rating. This is the most urgent trigger type — don't gate it behind confidence or episode count.
- **`persistent_mismatch`** — fires when `FunctionHypothesis.agreementStatus` is `mismatch` across 3 consecutive recomputes (not 3 episodes — 3 separate times the practitioner has recomputed and gotten mismatch again). Distinguishing "recomputed 3 times, still mismatched" from "3 episodes logged" matters: it means the disagreement isn't resolving as more data comes in.
- **`sustained_low_confidence`** — fires when `confidenceLevel` stays `low` despite 8+ logged episodes. This is a different problem than "not enough data yet" — it means the pattern genuinely isn't converging, which is itself informative and worth surfacing (possible signal that descriptive data collection alone won't resolve function here, and EFA should be considered sooner rather than later).

## 4. Acknowledgement workflow (accountability-preserving, not silently dismissible)

- New flags default to `open` and are surfaced prominently on the dashboard — not buried in a settings/notifications page.
- A flag can only move out of `open` via explicit practitioner action: **acknowledge** (records who + when, flag becomes `acknowledged`, stays visible but de-emphasised), then separately **escalate to EFA** or **resolve with a note** (`resolutionNote` required — no silent resolution).
- No "dismiss" or "hide" action that doesn't leave a record. This is the same principle as Phase 2's audit trail — if a practitioner is accountable for content they can't explain (Butler v NDIA), they need to be able to show what flags existed and what they did about them.

## 5. Documentation export

Three formats, differing in what they surface — not three separate documents assembled from scratch, but three views over the same underlying data:

- **`clinical_report`** — full detail: behaviour definitions, all episodes, screener responses, current FunctionHypothesis with its full agreement/confidence state and caveat text, all flags (open and resolved) with their resolution history. This is the practitioner's own defensible record.
- **`plan_appendix`** — condensed version suitable for inclusion in the actual NDIS Behaviour Support Plan document: behaviour definition, current hypothesis summary (with the same mandatory EFA-correspondence caveat — don't drop it just because the format is shorter), episode count/date range as evidence basis, any unresolved flags.
- **`staff_training_summary`** — the leanest format, oriented at support workers rather than clinical audiences: what the behaviour looks like, known triggers/setting events from episode data, current status. **Note:** this format is genuinely more useful once it can pull matched strategies from the separate strategy-library work — until that integration exists (explicitly out of scope, staying standalone per the original brief), treat this as a basic/stub format rather than over-investing in it this phase.

**Implementation approach:** render as print-friendly HTML and let the practitioner use the browser's native print-to-PDF, rather than bundling a PDF-generation library. Simpler, more robust for an offline-first PWA, no added dependency weight. `contentSnapshot` stores the rendered HTML/content at generation time — if the underlying data changes later, previously generated exports don't silently drift, matching the versioned-audit-trail principle from the original brief.

## 6. Test cases to cover

- Risk checklist item ticked on an episode with severity = 0 → flag still fires immediately (checklist item is independent of severity threshold)
- Severity threshold and risk checklist both trigger from the same episode → two separate flags, not merged into one (each needs its own acknowledgement trail)
- `persistent_mismatch` — verify it counts recomputes, not episodes (logging 5 episodes between two recomputes should not itself count as 5 toward the threshold)
- Acknowledging a flag without a resolution note → allowed (acknowledge ≠ resolve); resolving without a note → blocked
- Export generated, then underlying episode data edited afterward → the existing export's `contentSnapshot` is unchanged; a new export must be generated to reflect the change
- Multi-behaviour export → all included behaviours' flags and hypotheses render correctly in one document, not just the first

## 7. Explicitly out of scope for this phase

- Any push/background notification (no backend — see constraint in §1)
- Multi-informant handoff (Phase 4)
- Strategy-matching content in `staff_training_summary` (depends on the separate, standalone strategy-library work)
