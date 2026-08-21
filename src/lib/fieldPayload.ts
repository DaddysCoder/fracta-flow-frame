import type { AntecedentTag, ConsequenceTag, RiskFlagItem } from './types'

export const FIELD_CAPTURE_FORMAT = 'whatbit-field-capture-v1'
const TEXT_LIMIT = 240

const ANTECEDENT_TAGS = new Set<AntecedentTag>(['demand', 'transition', 'sensory', 'social', 'unknown'])
const CONSEQUENCE_TAGS = new Set<ConsequenceTag>([
  'attention',
  'escape',
  'tangible',
  'automatic',
  'none_observed',
])
const RISK_FLAGS = new Set<RiskFlagItem>(['injury', 'property_damage', 'elopement', 'self_injury', 'other'])

export interface FieldEpisodeFields {
  dateTime: string
  durationMinutes: number | null
  severityRating: 0 | 1 | 2 | 3
  frequencyContext: 0 | 1 | 2 | 3 | 4
  settingEvent: string
  antecedentText: string
  antecedentTag: AntecedentTag
  consequenceText: string
  consequenceTag: ConsequenceTag
  riskFlags: RiskFlagItem[]
}

export interface FieldCapturePayload {
  format: typeof FIELD_CAPTURE_FORMAT
  product: 'field'
  t: string
  cid: string
  e: FieldEpisodeFields
}

export type DecodeFieldResult =
  | { ok: true; token: string; captureId: string; episode: FieldEpisodeFields }
  | { ok: false; error: string }

function clip(text: string): string {
  const trimmed = text.trim()
  return trimmed.length > TEXT_LIMIT ? trimmed.slice(0, TEXT_LIMIT) : trimmed
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function isSeverity(value: unknown): value is 0 | 1 | 2 | 3 {
  return value === 0 || value === 1 || value === 2 || value === 3
}

function isFrequency(value: unknown): value is 0 | 1 | 2 | 3 | 4 {
  return value === 0 || value === 1 || value === 2 || value === 3 || value === 4
}

export function encodeFieldCapture(input: {
  token: string
  captureId: string
  episode: FieldEpisodeFields
}): string {
  const payload: FieldCapturePayload = {
    format: FIELD_CAPTURE_FORMAT,
    product: 'field',
    t: input.token,
    cid: input.captureId,
    e: {
      ...input.episode,
      settingEvent: clip(input.episode.settingEvent),
      antecedentText: clip(input.episode.antecedentText),
      consequenceText: clip(input.episode.consequenceText),
    },
  }
  return JSON.stringify(payload)
}

export function decodeFieldCapture(raw: string): DecodeFieldResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'This does not look like a Field capture code.' }
  }
  return parseFieldCapture(parsed)
}

export function parseFieldCapture(raw: unknown): DecodeFieldResult {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'This does not look like a Field capture code.' }
  }
  const obj = raw as Record<string, unknown>
  if (obj.format === 'whatbit-vector-instrument-v1') {
    return { ok: false, error: 'This is a Vector instrument. Import it in Settings, not as a Field capture.' }
  }
  if (typeof obj.r === 'string' && typeof obj.t === 'string' && !obj.format) {
    return { ok: false, error: 'This is a screener response. Import it under Multi-informant.' }
  }
  if (obj.format !== FIELD_CAPTURE_FORMAT || obj.product !== 'field') {
    return { ok: false, error: 'This is not a whatbit-field-capture-v1 file.' }
  }
  if (typeof obj.t !== 'string' || !obj.t.trim()) {
    return { ok: false, error: 'This capture is missing its invite token.' }
  }
  if (typeof obj.cid !== 'string' || !obj.cid.trim()) {
    return { ok: false, error: 'This capture is missing an id.' }
  }
  const e = obj.e
  if (typeof e !== 'object' || e === null) {
    return { ok: false, error: 'This capture is missing episode fields.' }
  }
  const ep = e as Record<string, unknown>
  if (!isIsoDate(ep.dateTime)) {
    return { ok: false, error: 'The episode date is not valid.' }
  }
  if (ep.durationMinutes != null && (typeof ep.durationMinutes !== 'number' || ep.durationMinutes < 0)) {
    return { ok: false, error: 'Duration must be empty or a number of minutes.' }
  }
  if (!isSeverity(ep.severityRating) || !isFrequency(ep.frequencyContext)) {
    return { ok: false, error: 'Severity or frequency rating is not valid.' }
  }
  if (typeof ep.antecedentText !== 'string' || !ep.antecedentText.trim()) {
    return { ok: false, error: 'Antecedent text is required.' }
  }
  if (typeof ep.consequenceText !== 'string' || !ep.consequenceText.trim()) {
    return { ok: false, error: 'Consequence text is required.' }
  }
  if (typeof ep.antecedentTag !== 'string' || !ANTECEDENT_TAGS.has(ep.antecedentTag as AntecedentTag)) {
    return { ok: false, error: 'Antecedent tag is not valid.' }
  }
  if (typeof ep.consequenceTag !== 'string' || !CONSEQUENCE_TAGS.has(ep.consequenceTag as ConsequenceTag)) {
    return { ok: false, error: 'Consequence tag is not valid.' }
  }
  const riskFlags = Array.isArray(ep.riskFlags)
    ? ep.riskFlags.filter((flag): flag is RiskFlagItem => typeof flag === 'string' && RISK_FLAGS.has(flag as RiskFlagItem))
    : []

  return {
    ok: true,
    token: obj.t.trim(),
    captureId: obj.cid.trim(),
    episode: {
      dateTime: new Date(ep.dateTime).toISOString(),
      durationMinutes: typeof ep.durationMinutes === 'number' ? ep.durationMinutes : null,
      severityRating: ep.severityRating,
      frequencyContext: ep.frequencyContext,
      settingEvent: clip(typeof ep.settingEvent === 'string' ? ep.settingEvent : ''),
      antecedentText: clip(ep.antecedentText),
      antecedentTag: ep.antecedentTag as AntecedentTag,
      consequenceText: clip(ep.consequenceText),
      consequenceTag: ep.consequenceTag as ConsequenceTag,
      riskFlags,
    },
  }
}

export function buildFieldInviteUrl(token: string, role: string): string {
  const url = new URL('/field', window.location.origin)
  url.searchParams.set('token', token)
  url.searchParams.set('role', role)
  return url.toString()
}

export function newCaptureId(): string {
  return Math.random().toString(36).slice(2, 10)
}
