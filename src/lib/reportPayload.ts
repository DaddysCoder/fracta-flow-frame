import { ANTECEDENT_ITEMS, CONSEQUENCE_ITEMS, SETTING_EVENT_ITEMS } from './scales'
import type { RiskFlagItem } from './types'

// Phase 1.2 QR payload codec, extending Phase 4's mechanism to incident/ABC
// reporting (brief §4).
//
// Design decision made explicitly, per the brief's instruction not to
// silently default: this implements **option (b)** — the standalone
// /report page always offers the generic starter checklists
// (SETTING_EVENT_ITEMS / ANTECEDENT_ITEMS / CONSEQUENCE_ITEMS from
// scales.ts), not the requesting behaviour's actual per-behaviour dynamic
// checklist (checklists.ts). The practitioner reconciles/re-tags on import
// if the informant's report doesn't match what's since been added to that
// behaviour's reusable checklist.
//
// Why (b): it reuses this exact index-based compact-encoding pattern
// unchanged, ships without a second payload-size investigation, and is
// still fully functional — the practitioner already reviews every import
// before it's final (same review step Phase 4 relies on for screener
// imports). Option (a) — encoding the requesting behaviour's actual
// checklist option set into the invite QR so /report can render the exact
// per-behaviour options — is a real fidelity improvement worth building if
// practitioners report the generic list missing items they'd already
// customised. Left as a future upgrade, not built here.
//
// Payload-size discipline (same principle as qrPayload.ts): checklist
// selections are transmitted as small integer indices into the fixed
// starter lists above, not as full label text — see reportPayload.test.ts
// for the measured byte size.

export interface ReportPayload {
  t: string // token
  dt: string // dateTime, ISO
  du: number | null // durationMinutes
  sv: 0 | 1 | 2 | 3 // severityRating
  fq: 0 | 1 | 2 | 3 | 4 // frequencyContext
  se: string // settingEvent free text
  set: number[] // indices into SETTING_EVENT_ITEMS
  at: string // antecedentText free text
  ant: number[] // indices into ANTECEDENT_ITEMS
  ct: string // consequenceText free text
  con: number[] // indices into CONSEQUENCE_ITEMS
  rf: RiskFlagItem[]
  c: string // completedAt, ISO
}

export interface DecodedReport {
  token: string
  dateTime: string
  durationMinutes: number | null
  severityRating: 0 | 1 | 2 | 3
  frequencyContext: 0 | 1 | 2 | 3 | 4
  settingEvent: string
  settingEventTags: string[]
  antecedentText: string
  antecedentTags: string[]
  consequenceText: string
  consequenceTags: string[]
  riskFlags: RiskFlagItem[]
  completedAt: string
}

export function encodeReportPayload(
  token: string,
  input: {
    dateTime: string
    durationMinutes: number | null
    severityRating: 0 | 1 | 2 | 3
    frequencyContext: 0 | 1 | 2 | 3 | 4
    settingEvent: string
    settingEventTags: string[]
    antecedentText: string
    antecedentTags: string[]
    consequenceText: string
    consequenceTags: string[]
    riskFlags: RiskFlagItem[]
  },
  completedAt: string,
): string {
  const payload: ReportPayload = {
    t: token,
    dt: input.dateTime,
    du: input.durationMinutes,
    sv: input.severityRating,
    fq: input.frequencyContext,
    se: input.settingEvent,
    // Only the generic starter list is offered on /report (option b above),
    // so every selected tag is expected to resolve to an index — anything
    // that doesn't (defensive only) is silently dropped rather than
    // corrupting the payload.
    set: input.settingEventTags
      .map((label) => SETTING_EVENT_ITEMS.indexOf(label as (typeof SETTING_EVENT_ITEMS)[number]))
      .filter((i) => i >= 0),
    at: input.antecedentText,
    ant: input.antecedentTags
      .map((label) => ANTECEDENT_ITEMS.indexOf(label as (typeof ANTECEDENT_ITEMS)[number]))
      .filter((i) => i >= 0),
    ct: input.consequenceText,
    con: input.consequenceTags
      .map((label) => CONSEQUENCE_ITEMS.findIndex((c) => c.label === label))
      .filter((i) => i >= 0),
    rf: input.riskFlags,
    c: completedAt,
  }
  return JSON.stringify(payload)
}

export type DecodeReportResult = { ok: true; report: DecodedReport } | { ok: false; error: string }

export function decodeReportPayload(raw: string): DecodeReportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'This does not look like a valid incident report code.' }
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, error: 'This does not look like a valid incident report code.' }
  }
  const p = parsed as Partial<ReportPayload>
  if (
    typeof p.t !== 'string' ||
    typeof p.dt !== 'string' ||
    typeof p.sv !== 'number' ||
    typeof p.fq !== 'number' ||
    typeof p.c !== 'string' ||
    !Array.isArray(p.set) ||
    !Array.isArray(p.ant) ||
    !Array.isArray(p.con) ||
    !Array.isArray(p.rf)
  ) {
    return { ok: false, error: 'This does not look like a valid incident report code.' }
  }
  if (!p.t.trim()) {
    return { ok: false, error: 'This report code is missing its invite token.' }
  }
  if (![0, 1, 2, 3].includes(p.sv)) {
    return { ok: false, error: 'This report code has an invalid severity value.' }
  }
  if (![0, 1, 2, 3, 4].includes(p.fq)) {
    return { ok: false, error: 'This report code has an invalid frequency value.' }
  }

  const settingEventTags: string[] = p.set.map((i) => SETTING_EVENT_ITEMS[i]).filter((x) => x !== undefined)
  const antecedentTags: string[] = p.ant.map((i) => ANTECEDENT_ITEMS[i]).filter((x) => x !== undefined)
  const consequenceTags: string[] = p.con
    .map((i) => CONSEQUENCE_ITEMS[i]?.label)
    .filter((x) => x !== undefined)

  return {
    ok: true,
    report: {
      token: p.t,
      dateTime: p.dt,
      durationMinutes: typeof p.du === 'number' ? p.du : null,
      severityRating: p.sv as 0 | 1 | 2 | 3,
      frequencyContext: p.fq as 0 | 1 | 2 | 3 | 4,
      settingEvent: typeof p.se === 'string' ? p.se : '',
      settingEventTags,
      antecedentText: typeof p.at === 'string' ? p.at : '',
      antecedentTags,
      consequenceText: typeof p.ct === 'string' ? p.ct : '',
      consequenceTags,
      riskFlags: p.rf as RiskFlagItem[],
      completedAt: p.c,
    },
  }
}

export function buildReportInviteUrl(token: string, role: string): string {
  const url = new URL('/report', window.location.origin)
  url.searchParams.set('token', token)
  url.searchParams.set('role', role)
  return url.toString()
}
