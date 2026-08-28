import type { Entitlement } from '../../shared/entitlement'

export interface SessionUser {
  id: string
  email: string
  emailVerifiedAt: string | null
  trialStartedAt: string | null
  trialEndsAt: string | null
  entitlement: Entitlement
  subscriptionStatus: string | null
  subscriptionPeriodEnd: number | null
  cancelAtPeriodEnd: boolean
}

export interface MeResponse {
  user: SessionUser | null
}

export interface VerifyResponse {
  user: SessionUser
  trialStarted?: boolean
  message?: string
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const data = (await res.json()) as T & { error?: string }
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`)
  }
  return data
}

export function fetchMe(): Promise<MeResponse> {
  return apiFetch<MeResponse>('/api/auth/me')
}

export function requestOtp(email: string): Promise<{ ok: true }> {
  return apiFetch('/api/auth/request-code', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function verifyOtp(email: string, code: string): Promise<VerifyResponse> {
  return apiFetch<VerifyResponse>('/api/auth/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  })
}

export function logout(): Promise<{ ok: true }> {
  return apiFetch('/api/auth/logout', { method: 'POST' })
}

export function fetchEntitlement(): Promise<{
  entitlement: Entitlement
  authenticated: boolean
  email?: string
  trialEndsAt?: string | null
}> {
  return apiFetch('/api/entitlement')
}

export function startCheckout(plan: 'monthly' | 'annual'): Promise<{ url: string | null }> {
  return apiFetch('/api/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ plan }),
  })
}

export function openBillingPortal(): Promise<{ url: string }> {
  return apiFetch('/api/billing/portal', { method: 'POST' })
}
