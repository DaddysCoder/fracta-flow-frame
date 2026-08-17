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
    // Adds Participant.profile (Tier 0 identity fields — see types.ts and
    // docs/participant-import-schema.md). No new index: nothing queries by
    // a profile field yet. Bumped anyway, on the same participants index
    // set as version 1, to mark the schema-shape change explicitly rather
    // than relying on Dexie's schema-less tolerance of new object
    // properties — existing records simply have no `profile` until
    // imported or hand-entered.
    this.version(5).stores({
      participants: 'id, createdAt',
    })
  }
}

export const db = new FbaDatabase()

export function newId(): string {
  return crypto.randomUUID()
}
