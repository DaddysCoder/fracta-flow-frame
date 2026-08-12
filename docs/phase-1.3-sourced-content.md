# Coding Brief — Phase 1.3: Sourced Content Upgrade + Dashboard Differentiation

Repo: https://github.com/DaddysCoder/fba-screener
Revises: placeholder checklist content in Phase 1.1 and Phase 1.2 with citable, field-tested source material
Source: *Guide to Functional Behaviour Assessment for Schools*, Queensland Department of Education
Status: ready to build

---

## 1. Why this matters

Phase 1.1 and 1.2 shipped checklist content marked "general convention — review before shipping" because nothing citable was available at the time. This guide is a real, publicly published resource with field-tested checklists (adapted from named, cited sources — LaVigna & Willis; March, Horner, Lewis-Palmer, Brown, Crone & Todd, 1999) — worth replacing the placeholders with, adapted from school-context language to general disability-support context.

## 2. Behaviours of Concern — replace the placeholder category list

The guide's Problem Behaviour Inventory (adapted from LaVigna and Willis) is a much richer, granular list than the broad categories in Phase 1.1's brief — closer to actual behaviour topographies than umbrella categories. Recommend restructuring the dropdown as **grouped checkboxes** rather than a flat 60-item list, organised under headers like:

- **Aggression/harm to others** — hits, bites, kicks, pinches, scratches, spits, strikes with weapons, threatens, fights with others
- **Property/environment** — throws objects, breaks things intentionally, turns over furniture, damages property
- **Self-directed** — attempts to hurt self, bangs head, bites/scratches/hits self, throws body against objects
- **Elopement/unsafe wandering** — runs away, wanders off, climbs/jumps on furniture
- **Verbal/vocal** — shouts angrily, yells/screams, swears, threatens verbally
- **Non-compliance/avoidance** — says no, disobeys, does opposite of what's asked, doesn't respond to direction
- **Repetitive/unusual** — counts/checks repeatedly, talks to self, repeatedly brings up same topic
- **Other** (free text)

**Important adaptation note:** the source list is school/child-context (references classrooms, homework, siblings). Your caseload spans broader ages and NDIS settings — review each item for relevance and reword where needed (e.g. "runs around the house" → "moves around the environment unsafely") rather than importing verbatim.

## 3. ABC checklists — replace placeholders with the guide's field-tested categories

The guide's FACTS (Part B) and ABC Recording Form give an actual tested checklist structure that **maps cleanly onto the FAST domains already used in Phase 2's triangulation logic** — better than the improvised list in Phase 1.1/1.2:

**Antecedent/context checklist (adapt from FACTS "environmental features" + ABC Recording Form):**
Given instruction/demand, Correction/reprimand, Alone (no attention/activity), With peers/others present, Doing an activity, Activity/item removed, Transition, Task too hard, Task too long, Unstructured time, Other

**Consequence checklist — maps directly to FAST domains, with a useful refinement:**
- Attention (adult) given / avoided
- Attention (peer/other) given / avoided
- Activity or item provided *(→ tangible domain)*
- Sensory outcome obtained / avoided *(→ automatic domain)*
- Task/activity avoided *(→ escape domain)*
- Other

**Implementation note for Phase 2 compatibility:** splitting "attention" into adult/peer subtypes is a genuine improvement (more clinically useful) but must still roll up to the single `attention` domain for the existing `FunctionHypothesis` matching logic — store the subtype for display/audit, map to the parent domain for computation. Don't let this split break the Phase 2 matching, which expects exactly four domains.

**Setting events checklist:** hunger, conflict (home or elsewhere), missed medication, illness, lack of sleep, routine change, recent failure/setback, Other

## 4. Terminology — add as in-app help text

The guide's terminology table (Antecedent, Alternative behaviour, Behaviour, Consequence, Function, Hypothesis, Reinforcement, Setting event, Summary statement) is worth adding as contextual tooltips/help text throughout the Formulation and ABC screens — plain, clear, non-jargon definitions that would help a less experienced practitioner or a support worker filling in the informant screener understand what's being asked.

## 5. New feature: auto-generated summary statement

The guide's summary statement template is a strong, concrete feature worth adding:

> *"During [activity/routine] when [antecedent], [participant] will [behaviour] because [consequence]. Therefore the function of the behaviour is to [access/avoid]. The behaviour is more likely to occur when [setting event]."*

Auto-populate this from the behaviour's most common logged antecedent, consequence, and setting event, plus the current `FunctionHypothesis` result — render it as a plain-English readout at the top of the behaviour detail view and include it in the `DocumentationExport` (Phase 3). This gives practitioners (and anyone reading the export) an immediately readable narrative on top of the structured data, not just tables and tick-box tallies.

## 6. Addition: practitioner subjective confidence rating

The guide's "Summary of Behaviour" form asks the interviewee to rate their own confidence (1–6, "not sure" to "100% sure") in the accuracy of the summary statement — a nice complement to Phase 2's computed confidence tier, not a replacement. Recommend adding this as a simple 1–6 self-rating the practitioner can optionally attach to a `FunctionHypothesis`, displayed alongside (not merged with) the computed confidence level. Two different kinds of confidence — one from the data, one from clinical judgement — both worth showing, clearly labelled as distinct.

## 7. Dashboard differentiation

Flagged: the Dashboard nav item currently shows the same thing as the Participants nav item (a participant count/list) — Dashboard isn't showing anything distinct from Participants right now, so it doesn't earn its own place in the navigation.

Fix — Dashboard becomes a cross-cutting overview that no single participant/behaviour page shows on its own:
- Any open risk flags across all participants (Phase 3), most urgent first
- Recent activity feed — latest episodes/formulations logged across everyone, not scoped to one participant
- Behaviours currently sitting at low confidence after a reasonable number of episodes (§6-style "needs more data or consider EFA" signal), surfaced here rather than only visible by opening each behaviour individually
- Backup-overdue reminder (already built in Phase 1) — belongs on Dashboard, not buried elsewhere

Participants stays exactly what it already is: the list/management screen for adding and opening individual participants. Behaviour-level detail (trend chart, formulation history, current hypothesis) stays as already built at the behaviour level — Dashboard doesn't duplicate that, it surfaces what's urgent *across* everyone so nothing needs to be manually checked one participant at a time.

## 8. Explicitly not touched by this phase

- Phase 2/3/4 logic — unaffected, aside from the attention-domain subtype note in §3
- Escalation cycle content from Phase 1.2 — this guide doesn't cover crisis-cycle phases, so that content stands as-is, sourced separately (Colvin's model)
