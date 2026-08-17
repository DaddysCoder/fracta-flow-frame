import Dexie, { type EntityTable } from 'dexie'
import type {
  Behaviour,
  BehaviourCustomOption,
  DocumentationExport,
  Episode,
  Formulation,
  FunctionHypothesis,
  FunctionScreener,
  IncidentInvite,
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
  formulations!: EntityTable<Formulation, 'id'>
  behaviourCustomOptions!: EntityTable<BehaviourCustomOption, 'id'>
  incidentInvites!: EntityTable<IncidentInvite, 'id'>

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
      formulations: 'id, behaviourId, conductedAt',
    })
    this.version(6).stores({
      behaviourCustomOptions: 'id, behaviourId, category, createdAt',
    })
    this.version(7).stores({
      incidentInvites: 'id, behaviourId, token, status, createdAt',
    })
  }
}

export const db = new FbaDatabase()

export function newId(): string {
  return crypto.randomUUID()
}
