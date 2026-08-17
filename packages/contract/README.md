# @fracta/contract

The versioned, repo-neutral contract between Frame (`fba-screener`) and
Vector. It defines the shape of everything that crosses the boundary
between the two repos, and it is the only thing that crosses.

Neither repo imports the other. Both import this package.

## Direction of flow

```
Vector ──ParticipantContext──▶ Frame ──FbaOutcomeBundle──▶ Vector (Form 07)
```

Vector is upstream for identity and mints `linkId`. Frame stores it and
never generates one — a bundle with no `linkId` fails validation, with no
fallback ID minting.

## Identity

Participant identifying details never cross this boundary — only the
opaque `linkId` and a practitioner-chosen `displayLabel` (initials or
alias). `PII_KEY_DENYLIST` and `findDenylistedKeys` exist so both sides can
defensively check a payload for identifying keys before it crosses.

## Usage

```ts
import {
  validateParticipantContext,
  validateFbaOutcomeBundle,
  findDenylistedKeys,
  CONTRACT_VERSION,
} from '@fracta/contract'

const result = validateFbaOutcomeBundle(candidate)
if (!result.ok) {
  // result.errors — blocking; result.warnings — non-blocking (e.g. >6 outcomes)
}
```

## Transport

`FbaOutcomeBundle` is transmitted as a JSON file export/import, not a QR
code — the full `episodeIds`/`screenerIds` audit trail across up to several
behaviours does not fit in a QR payload. QR remains in scope only for the
much smaller incident/informant handoff payloads, which are unrelated to
this contract.

## Versioning

This package currently defines contract version `"1.0"` only. A future
breaking change to any type here should bump `CONTRACT_VERSION` and either
add a new validator alongside the old one, or make the validators accept
both versions during a migration window — never silently reinterpret an old
payload under new rules.

## For Vector (not built here)

1. Depend on this package the same way Frame does.
2. Emit `ParticipantContext` from the existing registry data.
3. Consume `FbaOutcomeBundle` into Form 07 — `summaryStatement`,
   `hypothesis`, `evidenceBase`, and `escalationCycle` are the FBA inputs a
   BSP needs. `hypothesis.caveat` is required and non-empty by construction
   (see `validateFbaOutcomeBundle`) — render it, don't assume it.
