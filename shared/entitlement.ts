/** Frame commercial entitlement — shared by Worker (source of truth) and client UI. */

export type Entitlement = 'free' | 'trial' | 'pro'

export const FREE_PARTICIPANT_LIMIT = 2
export const TRIAL_DAYS = 14

export type ProFeature =
  | 'multi_informant_qr'
  | 'multi_informant_comparison'
  | 'clinical_report'
  | 'plan_appendix'
  | 'staff_training_summary'
  | 'vector_import'

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'past_due'])

export interface EntitlementInput {
  now?: Date
  subscriptionStatus?: string | null
  /** Unix seconds — Stripe current_period_end */
  subscriptionPeriodEnd?: number | null
  trialEndsAt?: string | null
}

export function evaluateEntitlement(input: EntitlementInput): Entitlement {
  const now = input.now ?? new Date()
  const status = input.subscriptionStatus ?? null
  const periodEnd = input.subscriptionPeriodEnd ?? null
  const trialEndsAt = input.trialEndsAt ?? null

  if (status && ACTIVE_SUBSCRIPTION_STATUSES.has(status)) {
    if (periodEnd == null || periodEnd * 1000 > now.getTime()) {
      return 'pro'
    }
  }

  if (trialEndsAt && new Date(trialEndsAt) > now) {
    return 'trial'
  }

  return 'free'
}

export function hasProAccess(entitlement: Entitlement): boolean {
  return entitlement === 'pro' || entitlement === 'trial'
}

export function canCreateParticipant(participantCount: number, entitlement: Entitlement): boolean {
  if (hasProAccess(entitlement)) return true
  return participantCount < FREE_PARTICIPANT_LIMIT
}

export function canUseProFeature(_feature: ProFeature, entitlement: Entitlement): boolean {
  return hasProAccess(entitlement)
}

export function trialDaysRemaining(trialEndsAt: string | null, now = new Date()): number | null {
  if (!trialEndsAt) return null
  const end = new Date(trialEndsAt)
  if (end <= now) return 0
  return Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
}

export const PARTICIPANT_LIMIT_MESSAGE =
  'Frame Free supports up to 2 active participants. Your existing records remain available.'

export const TRIAL_EXPIRED_MESSAGE =
  "Your Frame records are still here. You've moved to Frame Free."

export const NO_CLOUD_SYNC_MESSAGE =
  'Your Frame Pro plan follows your account. Participant records do not automatically sync between devices. Use Frame Backup to move records between browsers or devices.'
