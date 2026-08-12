# Coding Brief — Phase 4: Multi-Informant Handoff (QR only)

Repo: https://github.com/DaddysCoder/fba-screener
Builds on: Phase 1 (shipped) + Phase 2 (triangulation) + Phase 3 (escalation/docs)
Status: ready to build
Scope: **QR handoff only** — the email relay stays deferred until this validates demand (per earlier decision)

---

## 1. What this phase adds

A way for someone other than the practitioner (a support worker, a parent) to complete the FAST screener for a behaviour, without needing an account, without needing the full app installed, and without any server involved.

## 2. Design: two lightweight QR codes, not an app-to-app handoff

Reconsidering the original "informant opens the PWA on their phone" framing: requiring an informant to install a PWA just to fill in one form is real friction for a one-off contributor (a parent, a casual support worker). Better version:

**Step 1 — Practitioner generates an invite QR.** This QR encodes a plain URL, scannable by any phone's native camera (no app needed):
```
https://[app-domain]/screener?token=<short-random-token>&role=<informant-role>
```
This opens a **minimal, standalone screener page** — same FAST item set, but a lightweight route that doesn't touch IndexedDB or any local participant/behaviour data. It has no idea who the participant is and doesn't need to; the informant already knows which behaviour they're rating because the practitioner tells them directly (verbally, or a note) — no behaviour name or clinical detail needs to travel through the QR/URL at all. This keeps the payload trivial and keeps zero identifying/clinical content in transit.

**Step 2 — Informant completes the screener in their mobile browser.** On submit, the page renders a second QR **on-screen**, generated entirely client-side, encoding the completed response:
```json
{ "token": "<same token from step 1>", "domainScores": {...}, "rawResponses": [...], "completedAt": "..." }
```
Nothing is sent anywhere. The informant shows this QR to the practitioner.

**Step 3 — Practitioner scans the response QR with their main app.** The app matches on `token` to the correct pending invite (created in step 1, stored locally on the practitioner's device only), and imports the response as a new `FunctionScreener` record against the right behaviour — automatically, no manual re-selection needed, because the token round-trips through both QR codes.

This is the whole mechanism. No backend, no accounts, no email, and the informant never needs to install anything.

## 3. Data model additions

```ts
interface ScreenerInvite {
  id: string;
  behaviourId: string;        // local only — never transmitted
  token: string;               // short random string, embedded in both QR codes
  informantRole: string;        // e.g. "support worker", "parent", "sibling"
  createdAt: Date;
  status: 'pending' | 'completed' | 'cancelled';
}
```

No new persistent entity is needed for the response itself — a successfully scanned response QR is imported directly as a `FunctionScreener` (already defined in Phase 2), with `informantId` set to a locally-created lightweight informant record (role + optional name, entered by the practitioner at import time if they want to label who it was — not required).

## 4. UI requirements

- **Pending invites list** — shown on the behaviour's screen: token, role, created date, status. Practitioner can cancel/delete a pending invite manually (no auto-expiry logic needed for MVP — this is low-stakes local state, not worth the complexity).
- **Generate invite** — pick informant role, generates and displays the invite QR (and the raw URL as text/copy option, for cases where scanning isn't convenient — e.g. sending the link a different way if the practitioner and informant aren't in the same room but can share a link through their own existing channels).
- **Standalone screener page** — the informant-facing route. No navigation chrome tying it visibly to clinical records; just the screener itself and a clear one-line explanation of what it's for. On submit: render the response QR full-screen, large, easy to hold up to a camera, with a plain confirmation message.
- **Scan-to-import** — practitioner's main app needs camera access to scan the response QR. Handle the "token not found / already used / cancelled" cases explicitly with a clear error, not a silent failure.

## 5. Payload size discipline

Keep the response payload numeric/compact — domain scores as numbers, raw responses as short codes rather than any free text — to comfortably fit a single QR frame that scans reliably on a typical phone camera. Test with the full 16-domain-item FAST structure at realistic response length before assuming it fits; if it's tight, drop `rawResponses` detail from the QR itself and store only `domainScores`, accepting a smaller audit trail for QR-sourced responses specifically (worth flagging to the practitioner in the UI if this trade-off is made, since Phase 2's audit-trail principle expects full response detail where possible).

## 6. Test cases to cover

- Full round trip: generate invite → complete on a second device/browser → scan response → confirm it lands against the correct behaviour with correct role attribution
- Scan a response QR with a token that doesn't match any pending invite (typo, wrong practitioner's QR, expired/cancelled) → clear error, not a crash or silent no-op
- Scan the same response QR twice → second scan is rejected or clearly flagged as a duplicate, not silently creating two `FunctionScreener` records
- Two pending invites open at once for the same behaviour (two different informants) → both track and import independently without collision
- QR payload size at realistic response length → confirm reliable scan on an actual phone camera, not just in a simulator
- Standalone screener page opened with no token / malformed URL → clear message, not a broken blank page (echo of the Phase 1 `useLiveQuery` bug class — handle the "nothing to show yet" state explicitly)

## 7. Explicitly out of scope for this phase

- Email relay / async non-same-session handoff (deferred — build this only if QR-only usage shows real demand for it)
- BYO-storage sync for ongoing multi-person episode logging (separate, larger piece of work, not part of this phase)
- Any account/identity system for informants — role + optional name only, no login
