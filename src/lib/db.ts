import Dexie, { type EntityTable } from 'dexie'
import type {
  Behaviour,
  DocumentationExport,
  Episode,
  FunctionHypothesis,
  FunctionScreener,
  Participant,
  Practitioner,
  RiskFlag,
  ScreenerInvite,
  VectorInstrumentRecord,
  FieldInvite,
} from './types'

class FbaDatabase extends Dexie {
  practitioners!: EntityTable<Practitioner, 'id'>
  participants!: EntityTable<Participant, 'id'>
  behaviours!: EntityTable<Behaviour, 'id'>
  episodes!: EntityTable<Episode, 'id'>
  screeners!: EntityTable<FunctionScreener, 'id'>
  hypotheses!: EntityTable<FunctionHypothesis, 'id'>
  riskFlags!: EntityTable<RiskFlag, 'id'>
  documentationExports!: EntityTable<DocumentationExport, 'id'>
  screenerInvites!: EntityTable<ScreenerInvite, 'id'>
  vectorInstruments!: EntityTable<VectorInstrumentRecord, 'id'>
  fieldInvites!: EntityTable<FieldInvite, 'id'>

  constructor() {
    super('fba-screener')
    this.version(1).stores({
      practitioners: 'id',
      participants: 'id, createdAt',
      behaviours: 'id, participantId, status, createdAt',
      episodes: 'id, behaviourId, dateTime',
      screeners: 'id, behaviourId, dateCompleted',
    })
    this.version(2).stores({
      hypotheses: 'id, behaviourId, computedAt',
    })
    this.version(3).stores({
      riskFlags: 'id, behaviourId, status, triggerType, triggeredAt',
      documentationExports: 'id, participantId, generatedAt',
    })
    this.version(4).stores({
      screenerInvites: 'id, behaviourId, token, status, createdAt',
    })
    this.version(5).stores({
      vectorInstruments: 'id, sourceId, importedAt',
    })
    this.version(6).stores({
      fieldInvites: 'id, behaviourId, token, status, createdAt',
    })
    // v7: practitioner legal acceptance fields (termsAcceptedAt, termsVersion,
    // privacyAcknowledgedAt, privacyVersion) — stored on the object, no index
    // change. Existing records keep prior disclaimer only; gate re-shows once.
    this.version(7).stores({})
  }
}

export const db = new FbaDatabase()

export function newId(): string {
  return crypto.randomUUID()
}
