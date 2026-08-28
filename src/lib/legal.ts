// Legal document versions — bump when terms or privacy copy changes materially.
export const LEGAL_VERSION = '2026-08-28'
export const LEGAL_EFFECTIVE_LABEL = '28 August 2026'

export const LEGAL_OPERATOR = 'Primitive AI Labs PTY Limited'
export const LEGAL_BRAND = 'WhatBit'
export const LEGAL_CONTACT_EMAIL = 'hello@primitiveai.com.au'
export const LEGAL_JURISDICTION = 'New South Wales, Australia'

export interface LegalAcceptanceFields {
  termsAcceptedAt: string | null
  termsVersion: string | null
  privacyAcknowledgedAt: string | null
  privacyVersion: string | null
}

export function hasAcceptedCurrentLegal(fields: LegalAcceptanceFields): boolean {
  return (
    fields.termsAcceptedAt != null &&
    fields.termsVersion === LEGAL_VERSION &&
    fields.privacyAcknowledgedAt != null &&
    fields.privacyVersion === LEGAL_VERSION
  )
}

export function currentLegalAcceptance(now = new Date()): LegalAcceptanceFields {
  const iso = now.toISOString()
  return {
    termsAcceptedAt: iso,
    termsVersion: LEGAL_VERSION,
    privacyAcknowledgedAt: iso,
    privacyVersion: LEGAL_VERSION,
  }
}
