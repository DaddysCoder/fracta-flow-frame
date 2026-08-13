# Phase 1.4 — wording audit (flag, don't silently change)

Per brief §0a: this is a flagged list for human review, not an auto-edit. Only the
four items in §0 were changed directly; everything below needs a practitioner's
explicit sign-off before wording changes, same as every other unsourced
starter list in this build.

Columns: **Item** — **Where** — **What's flagged** — **Suggested alternative (if any)**.

## Already fixed (§0, for reference — not part of this review)

| Item | Where | Fix applied |
|---|---|---|
| "Attention (adult) given or avoided" | `CONSEQUENCE_ITEMS` | → "Attention (staff/support worker) given or avoided" |
| "Repetitive / unusual" heading + "Talks to self" | `BEHAVIOUR_CONCERN_GROUPS` | Heading → "Repetitive / patterned behaviours"; "Talks to self" removed |
| "Corrected or reprimanded" | `ANTECEDENT_ITEMS` | → "Corrected or redirected" |
| "Does the opposite of what is asked" | `BEHAVIOUR_CONCERN_GROUPS` | → "Acts contrary to the direction given" |

## Flagged for review

| Item | Where | What's flagged | Suggested alternative |
|---|---|---|---|
| "Avoiding eye contact" | `ESCALATION_PHASE_ITEMS.early_warning` | Pathologizing risk — reduced/no eye contact is a baseline communication style for many autistic/neurodivergent people, not necessarily an escalation precursor. Listing it as a generic "early warning" sign risks flagging ordinary neurodivergent presentation as crisis-adjacent. | Remove, or reframe as person-specific ("a *change* from this person's usual eye contact"), decided per-behaviour rather than as a generic starter item. |
| "Fidgeting" | `ESCALATION_PHASE_ITEMS.early_warning` | Same pathologizing risk — fidgeting/stimming is frequently a baseline self-regulation behaviour, not an early-warning sign. | Remove, or reframe as "a change from baseline movement/stimming." |
| "Pacing" | `ESCALATION_PHASE_ITEMS.early_warning` | Same category of concern — pacing can be an ordinary self-regulation strategy rather than an escalation indicator. | Consider reframing as relative to baseline, same as the two above. |
| "Muttering" | `ESCALATION_PHASE_ITEMS.early_warning` | Same self-talk/vocal-stimming concern already addressed for "Talks to self" in the Behaviours of Concern list (§0) — this item lives in the same family and wasn't caught by that fix. "Muttering" also carries a mildly dismissive/pejorative tone. | Remove, or reframe neutrally (e.g. "vocalising or talking to self more than usual for this person"). |
| "Refuses to follow instructions" | `BEHAVIOUR_CONCERN_GROUPS.Non-compliance / avoidance` | Punitive/compliance-framed register — "refuses" casts non-compliance (which is sometimes an appropriate communication of "no") in a negative light, echoing school-discipline framing. | Consider "Does not follow instructions given" — neutral, observable, no judgement about why. |
| "Task was too hard" / "Task went on too long" | `ANTECEDENT_ITEMS` | Informal, slightly childish phrasing ("was too hard") that reads more like a classroom-observation note than adult clinical documentation. | "Task exceeded the person's current skill level" / "Task continued longer than the person could sustain" — though these read more clinical/less plain-language, so there's a real trade-off against the screener's support-worker audience; flagging rather than pre-deciding. |
| "With peers or other people present" | `ANTECEDENT_ITEMS` | Minor — "peers" is a school-register word, though it's also in ordinary use in adult disability/day-program settings (peer support, peer groups), so this is a low-confidence flag rather than a clear miss. | Optionally "With other people present" for a fully age-neutral register, if "peers" reads too school-specific in your services. |
| "Doesn't respond to direction" | `BEHAVIOUR_CONCERN_GROUPS.Non-compliance / avoidance` | Style-only: informal contraction ("Doesn't") inconsistent with the more formal register used elsewhere in the same list. | "Does not respond to direction" for consistency — cosmetic only. |

## Areas checked with no findings

- `SETTING_EVENT_ITEMS` — no school/child-context or pathologizing language found.
- `CONSEQUENCE_ITEMS` (beyond the already-fixed "adult" label) — neutral, observable phrasing throughout.
- `TERMINOLOGY_DEFINITIONS` (9 terms) — plain-language, adult-appropriate register; no punitive or pathologizing framing found. (These remain separately flagged as *authored, not sourced* per the Phase 1.3 summary — that flag is about provenance, not wording quality.)
- `ESCALATION_PHASE_ITEMS.baseline`, `.escalation`, `.peak_crisis`, `.de_escalation`, `.recovery` — no findings beyond "Muttering" (early_warning, listed above). The peak-crisis and escalation items are genuinely risk-relevant physical/verbal indicators, not baseline traits, so they weren't flagged.
- `BEHAVIOUR_CONCERN_GROUPS` — Aggression/harm, Property/environment, Self-directed, Elopement/unsafe wandering, Verbal/vocal groups — no additional findings beyond the items above.
