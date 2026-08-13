# Phase 1.4 — wording audit (flag, don't silently change)

Per brief §0a: this is a flagged list for human review, not an auto-edit. Only the
four items in §0 were changed directly; everything below needed a practitioner's
explicit sign-off before wording changes, same as every other unsourced
starter list in this build.

**Status: closed.** Every item below now has an explicit decision (Phase 1.5),
recorded in the "Decision" column. See `scales.ts` and `FormulationForm.tsx` for
the applied changes.

Columns: **Item** — **Where** — **What's flagged** — **Suggested alternative (if any)** — **Decision**.

## Already fixed (§0, for reference — not part of this review)

| Item | Where | Fix applied |
|---|---|---|
| "Attention (adult) given or avoided" | `CONSEQUENCE_ITEMS` | → "Attention (staff/support worker) given or avoided" |
| "Repetitive / unusual" heading + "Talks to self" | `BEHAVIOUR_CONCERN_GROUPS` | Heading → "Repetitive / patterned behaviours"; "Talks to self" removed |
| "Corrected or reprimanded" | `ANTECEDENT_ITEMS` | → "Corrected or redirected" |
| "Does the opposite of what is asked" | `BEHAVIOUR_CONCERN_GROUPS` | → "Acts contrary to the direction given" |

## Flagged for review — now resolved

| Item | Where | What's flagged | Suggested alternative | Decision |
|---|---|---|---|---|
| "Avoiding eye contact" / "Fidgeting" / "Pacing" | `ESCALATION_PHASE_ITEMS.early_warning` | Pathologizing risk — reduced eye contact, fidgeting, and pacing are baseline traits/self-regulation strategies for many neurodivergent people, not necessarily escalation precursors. | Remove, or reframe as person-specific ("a *change* from this person's usual presentation"). | **Kept as-is**, wording unchanged. Instead, `FormulationForm.tsx`'s Early Warning checklist now carries an explicit prompt instructing the practitioner to select only items representing a change from this person's own baseline (as recorded in the Baseline phase directly above it) — the mechanism was already implicit (Baseline phase exists precisely to establish that reference point); this makes it explicit rather than adding new wording caveats to each item. |
| "Muttering" | `ESCALATION_PHASE_ITEMS.early_warning` | Same self-talk/vocal-stimming concern as "Talks to self" (§0) — this item lives in the same family and wasn't caught by that fix. Also mildly dismissive in tone. | Reframe neutrally (e.g. "vocalising or talking to self more than usual for this person"). | **Changed** → "Vocalising or talking to self more than usual for this person". |
| "Refuses to follow instructions" | `BEHAVIOUR_CONCERN_GROUPS.Non-compliance / avoidance` | Punitive/compliance-framed register — "refuses" casts non-compliance (sometimes an appropriate communication of "no") in a negative light. | "Does not follow instructions given" — neutral, observable. | **Changed** → "Does not follow instructions given". |
| "Task was too hard" / "Task went on too long" | `ANTECEDENT_ITEMS` | Informal, slightly childish phrasing that reads like a classroom-observation note. | "Task exceeded the person's current skill level" / "Task continued longer than the person could sustain". | **Changed** → "Task was difficult for the person" / "Task continued longer than the person could manage" — a middle ground between the fully clinical alternative and the original informal phrasing, kept in plain language for the support-worker audience. |
| "With peers or other people present" | `ANTECEDENT_ITEMS` | Minor, low-confidence flag — "peers" is in ordinary use in adult disability/day-program settings too. | Optionally "With other people present". | **No change** — left as-is. |
| "Doesn't respond to direction" | `BEHAVIOUR_CONCERN_GROUPS.Non-compliance / avoidance` | Style-only: informal contraction inconsistent with the rest of the list's register. | "Does not respond to direction". | **Changed** → "Does not respond to direction". Grepped the rest of the checklist/label content (`scales.ts`, `terminology.ts`) for other stray contractions (`\w+n't\b`) — this was the only one found. |

## Areas checked with no findings

- `SETTING_EVENT_ITEMS` — no school/child-context or pathologizing language found.
- `CONSEQUENCE_ITEMS` (beyond the already-fixed "adult" label) — neutral, observable phrasing throughout.
- `TERMINOLOGY_DEFINITIONS` (9 terms) — plain-language, adult-appropriate register; no punitive or pathologizing framing found. (These remain separately flagged as *authored, not sourced* per the Phase 1.3 summary — that flag is about provenance, not wording quality.)
- `ESCALATION_PHASE_ITEMS.baseline`, `.escalation`, `.peak_crisis`, `.de_escalation`, `.recovery` — no findings beyond "Muttering" (early_warning, listed above). The peak-crisis and escalation items are genuinely risk-relevant physical/verbal indicators, not baseline traits, so they weren't flagged.
- `BEHAVIOUR_CONCERN_GROUPS` — Aggression/harm, Property/environment, Self-directed, Elopement/unsafe wandering, Verbal/vocal groups — no additional findings beyond the items above.
