# Participant profile import schema (Frame ⇄ PBS Tier 0 handoff)

**Status:** Frame-side import implemented (`src/lib/backup.ts`). PBS-side export is a
**spec only** — not implemented anywhere in this repo, and not implemented in the PBS
monorepo either. This document is the contract both sides build against.

**Direction:** one-way, PBS → Frame. Frame never sends anything back to PBS. Frame's
own FBA output (hypotheses, risk flags, documentation exports) reaching PBS as a BSP
input is a separate, later, unstarted piece of work — not designed here.

**Scope:** Tier 0 identity fields only (PBS's own field-registry tier system —
identity facts, never re-confirmed, never stale). Everything behavioural/clinical in
Frame (episodes, screeners, hypotheses, risk flags) stays exactly as isolated from
participant identity as before this schema existed. Importing this payload creates
one new Frame `Participant` with a `profile` — it never touches or joins to any
existing behavioural record.

---

## 1. Frame-side import contract (implemented)

A JSON file matching this shape, chosen via **Participants → Import from PBS**.
Validated and parsed by `parseParticipantImportPayload` in `src/lib/backup.ts` — that
function is the executable source of truth; this document describes the same
contract in prose so PBS doesn't have to reverse-engineer it from Frame's source.

### 1.1 Shape

```jsonc
{
  "schema": "pbs-participant-profile-import-v1",
  "exportedAt": "2026-08-17T00:00:00.000Z",       // optional, PBS's own export timestamp (ISO 8601)
  "sourceSystem": "pbs-registry",                  // optional, free text
  "participant": {
    "preferredName": "Sam",                        // required
    "legalName": "Samuel Test",                    // required
    "dob": "2005-01-01",                           // required, YYYY-MM-DD
    "ndisNumber": "4300000000",                    // required
    "location": "Toowoomba, QLD",                  // optional
    "contacts": [                                  // optional, defaults to []
      { "label": "Primary contact", "detail": "0400 000 000" },
      { "label": "Guardian/nominee", "detail": "Jane Test, mother — 0400 111 111" }
    ]
  },
  "referrer": {
    "identity": "Dr. Referrer, GP, Sunshine Medical Centre"   // required
  },
  "practitioner": {                                // optional, null/omitted if triage hasn't happened yet
    "identity": "Alex Practitioner, Behaviour Support Practitioner, reg #12345"
  },
  "provider": {                                    // optional, null/omitted if not captured
    "details": "Sunshine Behaviour Support Services, ABN 12 345 678 901"
  }
}
```

### 1.2 Validation rules

- `schema` must equal `"pbs-participant-profile-import-v1"` exactly. Any other value
  (or a missing field) is rejected with a "not a recognised participant profile
  import" error — no partial/best-effort parsing.
- `participant.preferredName`, `.legalName`, `.dob`, `.ndisNumber` are **required,
  non-empty strings**. Missing any one fails the whole import with an error naming
  the exact missing field (e.g. `participant.dob`) — nothing is silently defaulted.
- `participant.dob` must match `YYYY-MM-DD`.
- `participant.location` is optional; absent/empty → `null`.
- `participant.contacts` is optional; absent → `[]`. If present, every entry needs
  non-empty `label` and `detail` strings.
- `referrer.identity` is **required** (Form 01 always asks it — see §3).
- `practitioner` and `provider` are both optional top-level objects; when present,
  their one field (`identity` / `details`) is treated as optional too (empty → `null`).
  Omit the whole object, or pass `null`, if the source case has nothing to report yet.
- Unknown extra top-level keys are ignored (forward-compatible), not rejected.

### 1.3 What happens on import

- Always creates a **new** Frame `Participant` — this is not a merge into an existing
  one. There is exactly one PBS case → one Frame participant relationship this schema
  supports; re-importing the same case creates a second, separate participant.
- `identifyingDetails` (the pre-existing opaque field every other Frame screen reads)
  is auto-derived as `"{preferredName} ({legalName})"` — nothing else in the app needs
  to change to keep working with an imported participant.
- Frame's own consent attestation (`consentAttested`/`consentAttestedAt`/`consentAttestedBy`)
  is **not** implied by the import. The practitioner doing the import ticks the same
  consent checkbox used for manual participant creation; unchecked, the participant is
  created with `consentAttested: false`, same as creating one by hand without consent.
  Receiving identity data from PBS is not, by itself, Frame's own consent record.
- `profile.importedAt` is stamped with Frame's own import timestamp (not
  `exportedAt`, which is preserved separately as PBS's own record of when it was
  produced — useful later for staleness questions, not used for anything yet).

---

## 2. Frame's internal `ParticipantProfile` shape

For reference — this is what the import above is parsed into (`src/lib/types.ts`),
and what a hand-edited profile in the Participant Profile tab produces too (with
`sourceSystem`/`exportedAt`/`importedAt` all `null` in the hand-edited case):

```ts
interface ParticipantContact {
  label: string
  detail: string
}

interface ParticipantProfile {
  preferredName: string
  legalName: string
  dob: string // ISO date
  ndisNumber: string
  location: string | null
  contacts: ParticipantContact[]
  referrerIdentity: string
  practitionerIdentity: string | null
  providerDetails: string | null
  sourceSystem: string | null
  exportedAt: string | null
  importedAt: string | null
}
```

---

## 3. PBS-side export — design sketch (NOT implemented)

This section is a spec for whoever builds the PBS-side export function next. It is
deliberately not code, and nothing in the PBS monorepo (`fracta-flow-vector`) has been
touched to produce it — this exists so both sides are designed against the same
contract in one pass, rather than Frame guessing and PBS reverse-engineering it later.

### 3.1 Where the data comes from

PBS's field registry (`packages/registry/src/fields.json`) already tags every field
with a `tier`. Tier 0 is exactly "identity, captured once, never re-confirmed" — the
same guarantee this schema depends on. The fields below are the real, current Tier 0
registry entries this export should read, not invented ones:

| PBS registry field id | Asked in | Always required in that form? | → Frame JSON path |
|---|---|---|---|
| `participant.preferred_name` | 01.A (Referral) | Yes | `participant.preferredName` |
| `participant.legal_name` | 01.A | Yes | `participant.legalName` |
| `participant.dob` | 01.A | Yes | `participant.dob` |
| `participant.ndis_number` | 01.A | Yes | `participant.ndisNumber` |
| `participant.location` | 01.A | No | `participant.location` |
| `participant.primary_contact` | 01.A | No | `participant.contacts[]` with `label: "Primary contact"` |
| `guardian.contact` | 01.A | No (shown only once `guardian.name_role` is entered — that field is tier 1, not exported) | `participant.contacts[]` with `label: "Guardian/nominee"` |
| `referrer.identity` | 01.B (Referral) | Yes | `referrer.identity` |
| `practitioner.identity` | 02.A (Practitioner Triage) | Yes, but only once Form 02 exists for the case | `practitioner.identity` (omit/null if Form 02 hasn't happened yet) |
| `provider.details` | 01.C | No | `provider.details` |

Notes for whoever builds this:

- **`referrer.identity` and `practitioner.identity` are already single combined
  strings** in PBS ("name, role and organisation" / "name, role and registration") —
  the export does **not** need to split them into separate name/role/org fields, and
  shouldn't invent a split PBS doesn't capture. Pass them straight through.
- A case that has only completed Form 01 (referral submitted, triage not yet done)
  can still export — `practitioner` should be omitted or `null` in that case, per
  §1.2. Don't block export on triage being complete.
- `document.date` (tier 0, `askedIn: "system"`) is deliberately **not** included —
  it's PBS's own per-document timestamp, not a participant identity fact. Use the
  real wall-clock export time for `exportedAt` instead.
- This pulls from whatever case-field store PBS ends up using to hold a case's
  accumulated `FieldEntry[]` after Form 01 (+ Form 02, if done) — e.g. the same
  `caseFields` shape `TriageResult` already carries in `packages/ui/src/TriageForm.tsx`,
  or the `ReferralForm`'s own submitted fields if only Form 01 exists yet. The export
  function is a straightforward "look up the latest value per field id, map into the
  Frame JSON shape" pass — no new resolution logic, no tier2/tier3 handling, since
  every field here is tier 0 (always render, never prompt, never stale, per
  `packages/core/src/resolve.ts`'s own tier semantics).

### 3.2 Sketch of the function's shape (pseudocode, not real code)

```
function exportParticipantProfileForFrame(caseFields: FieldEntry[]): ParticipantImportPayload {
  latestValueOf(fieldId) // same "most recent entry by sourceDate" rule resolve.ts already uses

  return {
    schema: "pbs-participant-profile-import-v1",
    exportedAt: now().toISOString(),
    sourceSystem: "pbs-registry",
    participant: {
      preferredName: latestValueOf("participant.preferred_name"),
      legalName: latestValueOf("participant.legal_name"),
      dob: latestValueOf("participant.dob"),
      ndisNumber: latestValueOf("participant.ndis_number"),
      location: latestValueOf("participant.location") ?? null,
      contacts: [
        ...(latestValueOf("participant.primary_contact")
          ? [{ label: "Primary contact", detail: latestValueOf("participant.primary_contact") }]
          : []),
        ...(latestValueOf("guardian.contact")
          ? [{ label: "Guardian/nominee", detail: latestValueOf("guardian.contact") }]
          : []),
      ],
    },
    referrer: { identity: latestValueOf("referrer.identity") },
    practitioner: latestValueOf("practitioner.identity")
      ? { identity: latestValueOf("practitioner.identity") }
      : null,
    provider: latestValueOf("provider.details")
      ? { details: latestValueOf("provider.details") }
      : null,
  }
}
```

### 3.3 Exact example JSON this should emit

For a case where Form 01 and Form 02 are both complete, this is the literal file
Frame's importer expects (this is the same fixture used in Frame's own tests —
`src/lib/participantImport.test.ts`):

```json
{
  "schema": "pbs-participant-profile-import-v1",
  "exportedAt": "2026-08-17T00:00:00.000Z",
  "sourceSystem": "pbs-registry",
  "participant": {
    "preferredName": "Sam",
    "legalName": "Samuel Test",
    "dob": "2005-01-01",
    "ndisNumber": "4300000000",
    "location": "Toowoomba, QLD",
    "contacts": [
      { "label": "Primary contact", "detail": "0400 000 000" },
      { "label": "Guardian/nominee", "detail": "Jane Test, mother — 0400 111 111" }
    ]
  },
  "referrer": { "identity": "Dr. Referrer, GP, Sunshine Medical Centre" },
  "practitioner": { "identity": "Alex Practitioner, Behaviour Support Practitioner, reg #12345" },
  "provider": { "details": "Sunshine Behaviour Support Services, ABN 12 345 678 901" }
}
```

For a case where only Form 01 is complete, `practitioner` is simply omitted (or `null`):

```json
{
  "schema": "pbs-participant-profile-import-v1",
  "exportedAt": "2026-08-17T00:00:00.000Z",
  "sourceSystem": "pbs-registry",
  "participant": {
    "preferredName": "Sam",
    "legalName": "Samuel Test",
    "dob": "2005-01-01",
    "ndisNumber": "4300000000",
    "contacts": []
  },
  "referrer": { "identity": "Dr. Referrer, GP, Sunshine Medical Centre" },
  "practitioner": null,
  "provider": null
}
```

---

## 4. Explicitly out of scope (this document and this task)

- Implementing the PBS-side export function — §3 is a spec, not a PR.
- Any export direction from Frame back to PBS (Frame FBA output → PBS BSP input is a
  separate, later task, sequenced after Frame's Phase 1.2/1.3 exist).
- Merge/de-duplication logic for re-importing the same PBS case twice — each import
  creates a new participant; detecting or reconciling duplicates is not designed here.
- Any change to how Frame's episode/screener/hypothesis data is isolated from
  participant identity — that boundary is untouched by this schema.
