import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { Practitioner } from './types'

const LOCAL_PRACTITIONER_ID = 'local-practitioner'

// useLiveQuery returns `undefined` both while the query is still loading and
// when it resolves to "no record found" — those are different states for us
// (loading vs. first-ever launch), so the querier normalizes "not found" to
// `null` and only true loading is left as `undefined`.
export function usePractitioner(): Practitioner | null | undefined {
  return useLiveQuery(async () => (await db.practitioners.get(LOCAL_PRACTITIONER_ID)) ?? null, [])
}

export async function saveProfile(name: string, role: string) {
  const existing = await db.practitioners.get(LOCAL_PRACTITIONER_ID)
  await db.practitioners.put({
    id: LOCAL_PRACTITIONER_ID,
    name,
    role,
    disclaimerAcknowledgedAt: existing?.disclaimerAcknowledgedAt ?? null,
  })
}

export async function acknowledgeDisclaimer() {
  const existing = await db.practitioners.get(LOCAL_PRACTITIONER_ID)
  await db.practitioners.put({
    id: LOCAL_PRACTITIONER_ID,
    name: existing?.name ?? '',
    role: existing?.role ?? '',
    disclaimerAcknowledgedAt: new Date().toISOString(),
  })
}

export { LOCAL_PRACTITIONER_ID }
