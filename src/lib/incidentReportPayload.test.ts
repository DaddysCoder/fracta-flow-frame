import { describe, expect, it } from 'vitest'
import {
  buildIncidentReportInviteUrl,
  decodeIncidentReportPayload,
  encodeIncidentReportPayload,
} from './incidentReportPayload'

describe('incident report payload', () => {
  it('round-trips a realistic filled-in report', () => {
    const encoded = encodeIncidentReportPayload({
      t: 'abc12345',
      dt: '2026-08-17T10:00:00.000Z',
      dur: 5,
      sev: 2,
      se: 'Poor sleep the night before',
      at: 'Asked to stop a preferred activity and start homework',
      ct: 'Adult attention given; task removed for the rest of the session',
      rf: ['injury'],
    })

    const decoded = decodeIncidentReportPayload(encoded)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.payload.t).toBe('abc12345')
    expect(decoded.payload.sev).toBe(2)
    expect(decoded.payload.rf).toEqual(['injury'])
  })

  it('stays comfortably scannable for a realistic report (well under 500 bytes)', () => {
    // A realistic filled-in report, not the pathological worst case — the
    // worst case was measured separately against the invite QR question
    // (see incidentReportPayload.ts header) and is why this ships without
    // any behaviour-specific option pool in the invite QR at all. The
    // response QR only ever carries one incident's free text, which stays
    // small by construction.
    const encoded = encodeIncidentReportPayload({
      t: 'abc12345',
      dt: '2026-08-17T10:00:00.000Z',
      dur: 15,
      sev: 3,
      se: 'Routine change; missed medication that morning',
      at: 'Given a correction after refusing to start the task; transition to a new activity',
      ct: 'Adult attention given, then peer attention given when others reacted',
      rf: ['injury', 'property_damage'],
    })
    expect(Buffer.byteLength(encoded)).toBeLessThan(500)
  })

  it('rejects malformed payloads', () => {
    expect(decodeIncidentReportPayload('not json').ok).toBe(false)
    expect(decodeIncidentReportPayload(JSON.stringify({ t: '' })).ok).toBe(false)
    expect(decodeIncidentReportPayload(JSON.stringify({ t: 'x', sev: 9 })).ok).toBe(false)
  })

  it('builds an invite URL carrying only token + role, no option pool', () => {
    const url = buildIncidentReportInviteUrl('abc12345', 'Support worker')
    const parsed = new URL(url)
    expect(parsed.pathname).toBe('/report')
    expect(parsed.searchParams.get('token')).toBe('abc12345')
    expect(parsed.searchParams.get('role')).toBe('Support worker')
    // The whole point of the (b) decision: nothing behaviour-specific here.
    expect(url.length).toBeLessThan(120)
  })
})
