# Coding Brief — Phase 1.2: Escalation Cycle, Multi-Formulation & Dynamic Checklists

Repo: https://github.com/DaddysCoder/fba-screener
Revises: Phase 1.1's Formulation section (single record → multiple), extends Phase 4's QR mechanism
Status: ready to build

---

## 1. Escalation cycle — part of Formulation

What you're describing is the standard **behaviour escalation cycle** used widely in PBS and crisis-prevention training (commonly known from Colvin's Acting-Out Behaviour Cycle) — general field convention, not a licensed instrument, safe to build on directly.

Six phases, each a **checklist of observable behaviours + "add your own"**:

1. **Baseline** — calm/typical presentation
2. **Early warning** — first signs, triggers
3. **Escalation** — agitation building
4. **Peak/crisis** — highest-intensity presentation
5. **De-escalation** — intensity reducing
6. **Recovery** — settling, aftermath

Starting checklist items per phase (general convention — review before shipping, adjust to your caseload):
- **Baseline:** calm, engaged, typical communication, settled posture
- **Early warning:** pacing, fidgeting, withdrawing, muttering, tense posture, avoiding eye contact
- **Escalation:** raised voice, swearing, breathing loudly/heavily, clenched fists, refusing instructions, pushing items
- **Peak/crisis:** kicking, screaming, hitting, throwing items, self-injury, absconding
- **De-escalation:** breathing slowing, voice lowering, compliance returning, seeking space
- **Recovery:** quiet, tired, apologetic, seeking reassurance, wanting to sleep

This lives inside Formulation (§2), captured/updated during the interview, not something re-entered per incident.

## 2. Formulation — supports multiple records per behaviour

Revising Phase 1.1: Formulation is not a single section but a **collection** — a behaviour can have more than one formulation interview over time (different informants, revisited understanding as things change).

```ts
interface FormulationRecord {
  id: string;
  behaviourId: string;
  informantName: string;       // who was interviewed
  informantRole: string;
  conductedBy: string;          // practitioner
  conductedAt: Date;

  descriptionPrompts: { recentExample: string; intenseEpisode: string; antecedentAndResponse: string };
  onset: string;
  frequencyImpression: string;   // interview-stage impression only — NOT used in Phase 2's confidence calc, which relies on actual logged episodes
  riskScenarios: { highRisk: string; lowRisk: string };
  escalationCycle: Record<EscalationPhase, { checkedItems: string[]; customItems: string[] }>;
}
```

Behaviour detail view shows a list of formulations (dated, by informant) rather than one fixed section — same "audit trail, not silent overwrite" principle used everywhere else in this build.

## 3. ABC/incident logging becomes dynamic and dropdown-driven

The ABC form (your "incident report") should pull its checklist options **from that behaviour's formulation data**, not a fixed global list:

- Antecedent/trigger, setting event, and escalation-phase-behaviour checklists offered when logging an episode = the **union of checked + custom items across all of that behaviour's formulations**
- If no formulation exists yet for a behaviour, fall back to the generic starter lists (§1, and the trigger/setting-event lists from Phase 1.1)
- **Always allow "add your own" at the point of logging a real incident** — and any custom item entered here should be saved back into that behaviour's reusable checklist, so it's offered as an option next time rather than re-typed

## 4. Extend the QR handoff (Phase 4) to incident/ABC reporting, not just the screener

Support workers witnessing an actual incident should be able to log it the same no-backend way the screener already works — same two-QR mechanism, new content.

**Design wrinkle worth solving deliberately:** the screener's QR payload works because its item set is fixed and identical for everyone. The ABC checklist is now per-behaviour and dynamic (§3), which the informant's standalone page can't know about without local data. Two workable approaches:
- **(a)** Invite QR encodes a compact list of that behaviour's current checklist option IDs (not full text — short codes, same payload-discipline principle as the screener) alongside the token/role, so the standalone `/report` page can render the right options
- **(b)** Standalone `/report` page always offers a generic, non-behaviour-specific checklist (same starter lists from §1/§3) plus free text, and the practitioner reconciles/re-tags on import if needed

(a) is more faithful to what you're describing; (b) is less work and still fully functional. Worth deciding which before building rather than discovering the payload-size question mid-build the way Phase 4 did with the screener.

## 5. Response delivery — the "photo isn't ideal" problem

Good instinct to flag — and it's already half-solved: Phase 4 shipped **manual paste as a fallback to camera scanning specifically because in-person QR scanning isn't always practical.** Two things worth doing to make this land properly rather than assuming it's covered:

- **Make the copy-paste path equally prominent, not a buried fallback** — add a clear "Copy code" button on the informant's response screen (alongside the QR), so they can text/email/message the code directly through their own existing channels. That solves your "practitioner often can't get the data" concern directly — the code becomes just a short string that travels through whatever channel the informant and practitioner already use, no camera required at all.
- Same applies to the incident-report version in §4 — build copy-paste in from the start, not as an afterthought once QR is working.

## 6. Explicitly not touched by this phase

- Phase 2/3 logic — unaffected, but note §3's dynamic checklist means new consequence-adjacent items must still be classifiable into one of the four FAST function domains or "none observed" (same constraint as Phase 1.1)
- Brand/visual design — unrelated to this brief
