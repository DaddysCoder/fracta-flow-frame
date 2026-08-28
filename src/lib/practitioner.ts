import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { currentLegalAcceptance, hasAcceptedCurrentLegal } from './legal'
import type { Practitioner } from './types'

const LOCAL_PRACTITIONER_ID = 'local-practitioner'

function normalizePractitioner(raw: Practitioner | undefined): Practitioner | null {
  if (!raw) return null
  return {
    ...raw,
    termsAcceptedAt: raw.termsAcceptedAt ?? null,
    termsVersion: raw.termsVersion ?? null,
    privacyAcknowledgedAt: raw.privacyAcknowledgedAt ?? null,
    privacyVersion: raw.privacyVersion ?? null,
  }
}

// useLiveQuery returns `undefined` both while the query is still loading and
// when it resolves to "no record found" — those are different states for us
// (loading vs. first-ever launch), so the querier normalizes "not found" to
// `null` and only true loading is left as `undefined`.
export function usePractitioner(): Practitioner | null | undefined {
  return useLiveQuery(
    async () => normalizePractitioner(await db.practitioners.get(LOCAL_PRACTITIONER_ID)),
    [],
  )
}

export function practitionerGateComplete(practitioner: Practitioner | null | undefined): boolean {
  if (!practitioner) return false
  return hasAcceptedCurrentLegal(practitioner)
}

export async function saveProfile(name: string, role: string) {
  const existing = await db.practitioners.get(LOCAL_PRACTITIONER_ID)
  await db.practitioners.put({
    id: LOCAL_PRACTITIONER_ID,
    name,
    role,
    disclaimerAcknowledgedAt: existing?.disclaimerAcknowledgedAt ?? null,
    termsAcceptedAt: existing?.termsAcceptedAt ?? null,
    termsVersion: existing?.termsVersion ?? null,
    privacyAcknowledgedAt: existing?.privacyAcknowledgedAt ?? null,
    privacyVersion: existing?.privacyVersion ?? null,
  })
}

export async function acknowledgeDisclaimer() {
  const existing = await db.practitioners.get(LOCAL_PRACTITIONER_ID)
  const legal = currentLegalAcceptance()
  await db.practitioners.put({
    id: LOCAL_PRACTITIONER_ID,
    name: existing?.name ?? '',
    role: existing?.role ?? '',
    disclaimerAcknowledgedAt: new Date().toISOString(),
    ...legal,
  })
}

export { LOCAL_PRACTITIONER_ID }
