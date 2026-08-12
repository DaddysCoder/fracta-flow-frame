import { describe, expect, it } from 'vitest'
import { buildReportInviteUrl, decodeReportPayload, encodeReportPayload } from './reportPayload'
import { ANTECEDENT_ITEMS, CONSEQUENCE_ITEMS, SETTING_EVENT_ITEMS } from './scales'

function fullInput() {
  return {
    dateTime: '2026-01-01T10:00:00.000Z',
    durationMinutes: 5,
    severityRating: 2 as const,
    frequencyContext: 3 as const,
    settingEvent: 'Loud classroom',
    settingEventTags: [SETTING_EVENT_ITEMS[0], SETTING_EVENT_ITEMS[2]],
    antecedentText: 'Asked to stop',
    antecedentTags: [ANTECEDENT_ITEMS[1]],
    consequenceText: 'Given attention',
    consequenceTags: [CONSEQUENCE_ITEMS[0].label],
    riskFlags: ['injury' as const],
  }
}

describe('encodeReportPayload / decodeReportPayload', () => {
  it('round-trips a full incident report through encode then decode', () => {
    const input = fullInput()
    const encoded = encodeReportPayload('tok123', input, '2026-01-01T10:05:00.000Z')
    const decoded = decodeReportPayload(encoded)

    expect(decoded.ok).toBe(true)
    if (!decoded.ok) throw new Error('unreachable')
    expect(decoded.report.token).toBe('tok123')
    expect(decoded.report.dateTime).toBe(input.dateTime)
    expect(decoded.report.durationMinutes).toBe(5)
    expect(decoded.report.severityRating).toBe(2)
    expect(decoded.report.frequencyContext).toBe(3)
    expect(decoded.report.settingEventTags).toEqual(input.settingEventTags)
    expect(decoded.report.antecedentTags).toEqual(input.antecedentTags)
    expect(decoded.report.consequenceTags).toEqual(input.consequenceTags)
    expect(decoded.report.riskFlags).toEqual(['injury'])
    expect(decoded.report.completedAt).toBe('2026-01-01T10:05:00.000Z')
  })

  it('handles no duration and no checklist selections', () => {
    const input = { ...fullInput(), durationMinutes: null, settingEventTags: [], antecedentTags: [], consequenceTags: [], riskFlags: [] }
    const encoded = encodeReportPayload('tok', input, '2026-01-01T10:05:00.000Z')
    const decoded = decodeReportPayload(encoded)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) throw new Error('unreachable')
    expect(decoded.report.durationMinutes).toBeNull()
    expect(decoded.report.settingEventTags).toEqual([])
    expect(decoded.report.consequenceTags).toEqual([])
  })

  it('keeps the payload comfortably small even with every checklist ticked', () => {
    const input = {
      ...fullInput(),
      settingEventTags: [...SETTING_EVENT_ITEMS],
      antecedentTags: [...ANTECEDENT_ITEMS],
      consequenceTags: CONSEQUENCE_ITEMS.map((c) => c.label),
    }
    const encoded = encodeReportPayload('a-realistic-token-1234', input, new Date().toISOString())
    const byteSize = new TextEncoder().encode(encoded).length
    expect(byteSize).toBeLessThan(600)
  })

  it('rejects malformed JSON', () => {
    expect(decodeReportPayload('not json').ok).toBe(false)
  })

  it('rejects JSON missing required fields', () => {
    expect(decodeReportPayload(JSON.stringify({ t: 'tok' })).ok).toBe(false)
  })

  it('rejects an invalid severity value', () => {
    const encoded = encodeReportPayload('tok', fullInput(), '2026-01-01T10:05:00.000Z')
    const tampered = JSON.stringify({ ...JSON.parse(encoded), sv: 9 })
    expect(decodeReportPayload(tampered).ok).toBe(false)
  })

  it('drops out-of-range checklist indices rather than throwing', () => {
    const encoded = encodeReportPayload('tok', fullInput(), '2026-01-01T10:05:00.000Z')
    const tampered = JSON.stringify({ ...JSON.parse(encoded), set: [999] })
    const decoded = decodeReportPayload(tampered)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) throw new Error('unreachable')
    expect(decoded.report.settingEventTags).toEqual([])
  })
})

describe('buildReportInviteUrl', () => {
  it('embeds only the token and role, never behaviour or clinical detail', () => {
    const url = buildReportInviteUrl('abc123', 'support worker')
    expect(url).toContain('/report')
    expect(url).toContain('token=abc123')
    expect(url).not.toMatch(/behaviour/i)
  })
})
