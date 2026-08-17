import './testSetup'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, newId } from './db'
import { importData } from './backup'

// exportAllData/importData drive the DOM (anchor click / URL.createObjectURL)
// which isn't meaningful under jsdom+fake-indexeddb, so these tests exercise
// the table-derivation and round-trip logic directly rather than through the
// browser-only entry points.

async function currentBackupPayload() {
  const tableNames = db.tables.map((t) => t.name)
  const data: Record<string, unknown[]> = {}
  for (const name of tableNames) {
    data[name] = await db.table(name).toArray()
  }
  return { format: 'fba-screener-backup-v2', tables: tableNames, data }
}

beforeEach(async () => {
  for (const table of db.tables) await table.clear()
})

describe('backup table coverage', () => {
  it('covers every table currently defined on the schema', () => {
    const tableNames = db.tables.map((t) => t.name)
    expect(tableNames).toEqual(
      expect.arrayContaining([
        'practitioners',
        'participants',
        'behaviours',
        'episodes',
        'screeners',
        'hypotheses',
        'riskFlags',
        'documentationExports',
        'screenerInvites',
      ]),
    )
    // No hand-written allowlist to fall out of sync with — the payload's
    // table list must be exactly db.tables, so a new table is included by
    // construction rather than needing a matching edit here.
  })

  it('round-trips one seeded row per table through backup and restore', async () => {
    const behaviourId = newId()
    const participantId = newId()

    await db.practitioners.add({ id: 'local-practitioner', name: 'Jo', role: 'OT', disclaimerAcknowledgedAt: null })
    await db.participants.add({
      id: participantId,
      identifyingDetails: 'J.D.',
      consentAttested: true,
      consentAttestedAt: new Date().toISOString(),
      consentAttestedBy: 'Jo',
      createdAt: new Date().toISOString(),
    })
    await db.behaviours.add({
      id: behaviourId,
      participantId,
      name: 'Hitting',
      operationalDefinition: 'Open palm contact with another person',
      status: 'active',
      createdBy: 'Jo',
      createdAt: new Date().toISOString(),
    })
    await db.episodes.add({
      id: newId(),
      behaviourId,
      dateTime: new Date().toISOString(),
      durationMinutes: 5,
      severityRating: 1,
      frequencyContext: 1,
      settingEvent: '',
      antecedentText: 'demand',
      antecedentTag: 'demand',
      consequenceText: 'removed',
      consequenceTag: 'escape',
      loggedBy: 'Jo',
      riskFlags: [],
      createdAt: new Date().toISOString(),
    })
    await db.screeners.add({
      id: newId(),
      behaviourId,
      informantId: 'local-practitioner',
      informantRole: 'OT',
      dateCompleted: new Date().toISOString(),
      rawResponses: [],
      domainScores: { attention: 0, escape: 0, tangible: 0, automatic: 0 },
      createdAt: new Date().toISOString(),
    })
    await db.hypotheses.add({
      id: newId(),
      behaviourId,
      computedAt: new Date().toISOString(),
      screenerFunctionResult: [],
      episodePatternResult: null,
      episodeCount: 0,
      distinctDayCount: 0,
      agreementStatus: 'insufficient_data',
      confidenceLevel: 'low',
      screenerDisagreement: false,
      contributingEpisodeIds: [],
      contributingScreenerIds: [],
      practitionerConfidence: null,
    })
    await db.riskFlags.add({
      id: newId(),
      behaviourId,
      triggerType: 'severity_threshold',
      triggerDetail: 'x',
      triggeredAt: new Date().toISOString(),
      status: 'open',
      acknowledgedBy: null,
      acknowledgedAt: null,
      resolutionNote: null,
    })
    await db.documentationExports.add({
      id: newId(),
      participantId,
      behaviourIds: [behaviourId],
      generatedAt: new Date().toISOString(),
      generatedBy: 'Jo',
      format: 'clinical_report',
      contentSnapshot: '<html></html>',
    })
    await db.screenerInvites.add({
      id: newId(),
      behaviourId,
      token: 'abc123',
      informantRole: 'parent',
      createdAt: new Date().toISOString(),
      status: 'pending',
    })

    const before: Record<string, unknown[]> = {}
    for (const table of db.tables) before[table.name] = await table.toArray()

    const payload = await currentBackupPayload()
    const file = new File([JSON.stringify(payload)], 'backup.json', { type: 'application/json' })

    for (const table of db.tables) await table.clear()
    for (const table of db.tables) expect(await table.count()).toBe(0)

    await importData(file)

    for (const table of db.tables) {
      const after = await table.toArray()
      expect(after).toEqual(before[table.name])
    }
  })

  it('accepts a v1 backup missing later tables, restoring them as empty', async () => {
    const v1Payload = {
      format: 'fba-screener-backup-v1',
      data: {
        practitioners: [{ id: 'local-practitioner', name: 'Jo', role: 'OT', disclaimerAcknowledgedAt: null }],
        participants: [],
        behaviours: [],
        episodes: [],
        screeners: [],
        // no hypotheses / riskFlags / documentationExports / screenerInvites keys at all
      },
    }
    const file = new File([JSON.stringify(v1Payload)], 'old-backup.json', { type: 'application/json' })

    await importData(file)

    expect(await db.practitioners.count()).toBe(1)
    expect(await db.hypotheses.count()).toBe(0)
    expect(await db.riskFlags.count()).toBe(0)
    expect(await db.documentationExports.count()).toBe(0)
    expect(await db.screenerInvites.count()).toBe(0)
  })

  it('rejects a file with an unrecognised format', async () => {
    const file = new File([JSON.stringify({ format: 'something-else', data: {} })], 'bad.json', {
      type: 'application/json',
    })
    await expect(importData(file)).rejects.toThrow(/not a recognised/)
  })
})
