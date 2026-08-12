import Dexie, { type EntityTable } from 'dexie'
import type {
  Behaviour,
  DocumentationExport,
  Episode,
  FormulationRecord,
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
  formulations!: EntityTable<FormulationRecord, 'id'>

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

    // Phase 1.1 (brief §2): Behaviour.concernCategories, backfilled empty
    // for existing rows so older records don't crash checklist rendering.
    this.version(5).upgrade((tx) =>
      tx
        .table('behaviours')
        .toCollection()
        .modify((b) => {
          b.concernCategories ??= []
        }),
    )

    // Phase 1.1 (brief §3): structured interview / initial-assessment mode.
    this.version(6).stores({
      formulations: 'id, behaviourId, conductedAt',
    })

    // Phase 1.1 (brief §4): checklist fields on Episode, backfilled empty
    // for existing rows. consequenceTag is untouched — hypothesis.ts keeps
    // reading whatever value is already there.
    this.version(7).upgrade((tx) =>
      tx
        .table('episodes')
        .toCollection()
        .modify((e) => {
          e.settingEventTags ??= []
          e.antecedentTags ??= []
          e.consequenceTags ??= []
        }),
    )
  }
}

export const db = new FbaDatabase()

export function newId(): string {
  return crypto.randomUUID()
}
