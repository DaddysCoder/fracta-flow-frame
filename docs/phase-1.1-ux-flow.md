# Coding Brief — Phase 1.1: Intake Flow, Formulation, and Checklist-Based ABC

Repo: https://github.com/DaddysCoder/fba-screener
Revises: Phase 1 shipped UX (Participant → Behaviour → Episode flow)
Status: ready to build, one open item flagged in §4

---

## 1. Navigation/flow fixes

Current friction, reported directly from using the deployed app:

- **After saving a Participant, the next step isn't obvious.** Fix: after save, either auto-navigate straight into "Add Behaviour" for that participant, or surface a clear, prominent single call-to-action — don't leave the user to figure out where to go next.
- **After creating/selecting a Behaviour, reaching episode logging takes an extra click** (having to click into the behaviour again). Fix: creating a behaviour should land the user directly in that behaviour's detail view (where Episodes/Formulation/Screener tabs live — see §3), not back at a list requiring another click to re-enter it.

## 2. Behaviours of concern — standardised dropdown + "Other"

Currently free text only. Add a dropdown of standard behaviour-of-concern categories, with an "Other" option that reveals free text — same principle as everywhere else in this build: don't invent a proprietary-sounding checklist, use openly-citable, commonly-used PBS categories rather than copying a specific paid provider's list verbatim.

Reasonable starting category set (general PBS/ABA convention, not sourced from any single licensed instrument):
- Physical aggression (toward others)
- Verbal aggression
- Self-injurious behaviour
- Property destruction
- Elopement/absconding
- Non-compliance/refusal
- Repetitive/stereotyped behaviour
- Verbal disruption
- Inappropriate sexual behaviour
- Other (free text)

Flag this list for your own review before shipping — it's assembled from general field convention, not one authoritative source, so adjust categories to match what you actually see in your caseload.

## 3. New feature: Formulation (structured interview mode)

A new tab/section on the Behaviour detail view, alongside the existing Episodes and Screener tabs — used once, early, at initial assessment, distinct from the ongoing per-incident Episode logging.

**Design principle: guided prompts, not mandatory structured fields.** Every section below should show a prompt/question to help the interviewer draw the answer out, but always resolve to a single free-text field underneath — the prompt is scaffolding for the conversation, not a form the person being asked has to fill in field-by-field.

Sections:
- **Behaviour description** — prompt cluster: *"Can you describe a recent time this happened? What did it look like? Can you describe a time it was especially intense? What happened right before it, and how did you respond?"* → free text
- **Onset** — prompt: *"When did this start?"* → free text (don't force a date picker — onset is often approximate/recalled, not a precise date)
- **Frequency** — prompt: *"How often does this happen?"* → free text (this is the interview-stage impression, separate from the actual measured frequency that accumulates from real Episode logging over time — don't conflate the two or let this field silently feed the Phase 2 confidence calculation, which should only ever use real logged episodes)
- **Risk scenarios** — two prompts: *"What does a high-risk situation look like?"* and *"What does a lower-risk/manageable situation look like?"* → free text each

## 4. ABC upgrade — checklists + free text, not free text alone

Antecedent, setting event, and consequence fields currently take free text plus a single tag. Upgrade each to a **multi-select checklist of common items, plus an "other" free-text option** — same "list, not exhaustive form" pattern as §2.

**Critical constraint carried over from Phase 2 (already shipped):** consequence checklist items must still roll up to one of the four FAST function domains (attention/escape/tangible/automatic) or "none observed" — the triangulation logic depends on that mapping. Don't add consequence checklist items that can't be cleanly categorised into one of those four, or Phase 2's matching logic breaks.

Starting checklist suggestions (general convention, review before shipping):

**Setting events:** illness/unwellness, poor sleep, hunger, change in routine, change in environment, medication change, sensory overload (noise/crowding/lighting), transition between activities, presence of unfamiliar person, Other

**Antecedents/triggers:** demand/instruction given, request denied, attention withdrawn, transition required, preferred item/activity removed, waiting required, unexpected change, sensory trigger, Other

**Consequences (must map to a function domain):**
- Attention domain: received staff/peer attention, received reprimand/reaction
- Escape domain: task/demand removed, activity ended, removed from situation
- Tangible domain: preferred item given, preferred activity allowed
- Automatic domain: no clear external consequence observed, self-soothing/sensory outcome
- None observed

**§4 open item — your message cut off at "the function of the behaviour so list of triggers, setting events, p..." — what's the fourth list you had in mind after triggers/setting events?** Common fourth category in this space is either **protective factors** (things that reduce likelihood/severity) or **maintaining consequences/reinforcers** (which the Consequences checklist above may already cover) — let me know which you meant and I'll fold it in.

## 5. Explicitly not touched by this phase

- Phase 2/3 logic (triangulation, escalation) — unaffected, just make sure new checklist items respect the domain-mapping constraint above
- Phase 4 (multi-informant QR handoff) — unaffected
- Brand/visual design — you've already flagged this will shift once naming resolves; this brief is content/flow only
