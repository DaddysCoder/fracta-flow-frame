// Incident/ABC report QR payload codec (brief Part B, step 11).
//
// Payload-size decision: measured against a realistic worst case (a
// behaviour with the full generic antecedent/setting-event/escalation-cycle
// option pools — 48 items, ~940 bytes JSON) before committing to an
// approach, per the brief's own instruction not to discover this mid-build
// the way Phase 4 did with the screener. Encoding option (a) — the invite QR
// carrying that behaviour's full option text so the informant page can
// render the right checklist — measured to a version-22 QR (~105x105
// modules) at low error correction. That is well past what scans reliably
// on a phone camera in the field (the practically reliable ceiling is
// commonly put around version ~15-20). It does not fit comfortably, so this
// ships option (b): the /report page offers the generic starter lists
// (fbaContent.ts) plus free text, and the practitioner reconciles/re-tags
// the imported episode's FAST-domain tags afterward. The invite QR here only
// ever carries a token + role — never a behaviour's option pool — so it
// stays small regardless of how complex a behaviour's checklist has grown.
//
// The response QR (this codec) carries the informant's free-text answers
// for a single incident. Unlike the screener (24 fixed yes/no/unsure
// answers needing every byte trimmed), a single incident's free text is
// naturally short, so this uses plain JSON rather than a positional code —
// see incidentReportPayload.test.ts for a measured size against a
// realistic filled-in report.

import type { RiskFlagItem } from './types'

export interface IncidentReportPayload {
  t: string // token
  dt: string // dateTime, ISO
  dur: number | null // durationMinutes
  sev: 0 | 1 | 2 | 3 // severityRating
  se: string // settingEvent
  at: string // antecedentText
  ct: string // consequenceText
  rf: RiskFlagItem[]
  c: string // completedAt, ISO
}

export function encodeIncidentReportPayload(input: Omit<IncidentReportPayload, 'c'>): string {
  const payload: IncidentReportPayload = { ...input, c: new Date().toISOString() }
  return JSON.stringify(payload)
}

export type DecodeIncidentReportResult =
  | { ok: true; payload: IncidentReportPayload }
  | { ok: false; error: string }

export function decodeIncidentReportPayload(raw: string): DecodeIncidentReportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'This does not look like a valid incident report code.' }
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, error: 'This does not look like a valid incident report code.' }
  }
  const p = parsed as Record<string, unknown>

  if (
    typeof p.t !== 'string' ||
    typeof p.dt !== 'string' ||
    !(p.dur === null || typeof p.dur === 'number') ||
    typeof p.sev !== 'number' ||
    ![0, 1, 2, 3].includes(p.sev) ||
    typeof p.se !== 'string' ||
    typeof p.at !== 'string' ||
    typeof p.ct !== 'string' ||
    !Array.isArray(p.rf) ||
    typeof p.c !== 'string'
  ) {
    return { ok: false, error: 'This incident report code is malformed or from a different app version.' }
  }
  if (!p.t.trim()) {
    return { ok: false, error: 'This report code is missing its invite token.' }
  }

  return {
    ok: true,
    payload: {
      t: p.t,
      dt: p.dt,
      dur: p.dur as number | null,
      sev: p.sev as 0 | 1 | 2 | 3,
      se: p.se,
      at: p.at,
      ct: p.ct,
      rf: p.rf as RiskFlagItem[],
      c: p.c,
    },
  }
}

export function buildIncidentReportInviteUrl(token: string, role: string): string {
  const url = new URL('/report', window.location.origin)
  url.searchParams.set('token', token)
  url.searchParams.set('role', role)
  return url.toString()
}
