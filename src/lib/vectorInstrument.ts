import { interleaveByDomain, type ScreenerItem } from './screener'
import type { ScreenerDomain, VectorInstrumentRecord } from './types'

export const VECTOR_INSTRUMENT_FORMAT = 'whatbit-vector-instrument-v1'

const DOMAINS = new Set<ScreenerDomain>(['attention', 'escape', 'tangible', 'automatic'])

export interface VectorInstrumentPayload {
  format: typeof VECTOR_INSTRUMENT_FORMAT
  product: 'vector'
  instrument: {
    id: string
    name: string
    version: number
    kind: 'function_screener'
    items: ScreenerItem[]
  }
}

export type ParseVectorResult =
  | { ok: true; payload: VectorInstrumentPayload }
  | { ok: false; error: string }

function isDomain(value: unknown): value is ScreenerDomain {
  return typeof value === 'string' && DOMAINS.has(value as ScreenerDomain)
}

export function parseVectorInstrument(raw: unknown): ParseVectorResult {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'This file is not a Vector instrument.' }
  }
  const obj = raw as Record<string, unknown>
  if (obj.format !== VECTOR_INSTRUMENT_FORMAT) {
    return { ok: false, error: 'This is not a whatbit-vector-instrument-v1 file.' }
  }
  if (obj.product !== 'vector') {
    return { ok: false, error: 'This instrument is not marked as a Vector product file.' }
  }
  const instrument = obj.instrument
  if (typeof instrument !== 'object' || instrument === null) {
    return { ok: false, error: 'This file is missing an instrument.' }
  }
  const inst = instrument as Record<string, unknown>
  if (typeof inst.id !== 'string' || !inst.id.trim()) {
    return { ok: false, error: 'The instrument needs an id.' }
  }
  if (typeof inst.name !== 'string' || !inst.name.trim()) {
    return { ok: false, error: 'The instrument needs a name.' }
  }
  if (typeof inst.version !== 'number' || !Number.isInteger(inst.version) || inst.version < 1) {
    return { ok: false, error: 'The instrument version must be a whole number.' }
  }
  if (inst.kind !== 'function_screener') {
    return { ok: false, error: 'Frame can only run Vector function_screener instruments in this step.' }
  }
  if (!Array.isArray(inst.items) || inst.items.length < 4 || inst.items.length > 48) {
    return { ok: false, error: 'A function screener needs between 4 and 48 items.' }
  }

  const items: ScreenerItem[] = []
  const ids = new Set<string>()
  for (const entry of inst.items) {
    if (typeof entry !== 'object' || entry === null) {
      return { ok: false, error: 'An item in this instrument is not valid.' }
    }
    const item = entry as Record<string, unknown>
    if (typeof item.id !== 'string' || !item.id.trim()) {
      return { ok: false, error: 'Every item needs an id.' }
    }
    if (ids.has(item.id)) {
      return { ok: false, error: `Duplicate item id: ${item.id}` }
    }
    if (!isDomain(item.domain)) {
      return { ok: false, error: `Item ${item.id} must map to attention, escape, tangible, or automatic.` }
    }
    if (typeof item.prompt !== 'string' || !item.prompt.trim()) {
      return { ok: false, error: `Item ${item.id} is missing a prompt.` }
    }
    ids.add(item.id)
    items.push({ id: item.id.trim(), domain: item.domain, prompt: item.prompt.trim() })
  }

  const domainsPresent = new Set(items.map((item) => item.domain))
  if (domainsPresent.size < 2) {
    return { ok: false, error: 'Items must cover more than one function domain.' }
  }

  return {
    ok: true,
    payload: {
      format: VECTOR_INSTRUMENT_FORMAT,
      product: 'vector',
      instrument: {
        id: inst.id.trim(),
        name: inst.name.trim(),
        version: inst.version,
        kind: 'function_screener',
        items,
      },
    },
  }
}

export function displayItemsForInstrument(items: ScreenerItem[]): ScreenerItem[] {
  return interleaveByDomain(items)
}

export function exampleVectorInstrument(): VectorInstrumentPayload {
  return {
    format: VECTOR_INSTRUMENT_FORMAT,
    product: 'vector',
    instrument: {
      id: 'vector-example-function-screener',
      name: 'Example Vector function screener',
      version: 1,
      kind: 'function_screener',
      items: [
        { id: 'v-att-1', domain: 'attention', prompt: 'The behaviour is more likely when nobody is currently engaging with the person.' },
        { id: 'v-esc-1', domain: 'escape', prompt: 'The behaviour often starts just after a demand or instruction.' },
        { id: 'v-tan-1', domain: 'tangible', prompt: 'The behaviour often starts when a preferred item is refused or removed.' },
        { id: 'v-auto-1', domain: 'automatic', prompt: 'The behaviour continues at a similar rate when nobody else is present.' },
        { id: 'v-att-2', domain: 'attention', prompt: 'Someone typically comes over or comments after the behaviour.' },
        { id: 'v-esc-2', domain: 'escape', prompt: 'The demand is often delayed, reduced, or dropped after the behaviour.' },
        { id: 'v-tan-2', domain: 'tangible', prompt: 'The person often gets the wanted item or activity after the behaviour.' },
        { id: 'v-auto-2', domain: 'automatic', prompt: 'The behaviour looks self-directed rather than aimed at other people.' },
      ],
    },
  }
}

export function toInstrumentRecord(
  payload: VectorInstrumentPayload,
  localId: string,
  importedAt: string,
): VectorInstrumentRecord {
  return {
    id: localId,
    sourceId: payload.instrument.id,
    name: payload.instrument.name,
    version: payload.instrument.version,
    kind: payload.instrument.kind,
    items: payload.instrument.items,
    importedAt,
  }
}
