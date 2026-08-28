import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Entitlement } from '../../shared/entitlement'
import { evaluateEntitlement, trialDaysRemaining } from '../../shared/entitlement'
import { fetchMe, logout as apiLogout, type SessionUser } from '../lib/api'

interface AuthContextValue {
  user: SessionUser | null
  entitlement: Entitlement
  loading: boolean
  trialDaysLeft: number | null
  refresh: () => Promise<void>
  signOut: () => Promise<void>
  trialWelcome: string | null
  setTrialWelcome: (message: string | null) => void
  trialExpiredNotice: boolean
  dismissTrialExpired: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const TRIAL_EXPIRED_DISMISSED_KEY = 'frame-trial-expired-dismissed'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [trialWelcome, setTrialWelcome] = useState<string | null>(null)
  const [trialExpiredDismissed, setTrialExpiredDismissed] = useState(() =>
    localStorage.getItem(TRIAL_EXPIRED_DISMISSED_KEY) === '1',
  )

  const refresh = useCallback(async () => {
    try {
      const { user: next } = await fetchMe()
      setUser(next)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const entitlement: Entitlement = user?.entitlement ?? 'free'

  const trialDaysLeft = useMemo(() => {
    if (!user?.trialEndsAt || entitlement !== 'trial') return null
    return trialDaysRemaining(user.trialEndsAt)
  }, [user?.trialEndsAt, entitlement])

  const trialExpiredNotice = Boolean(
    user &&
      user.trialStartedAt &&
      user.trialEndsAt &&
      new Date(user.trialEndsAt) <= new Date() &&
      evaluateEntitlement({
        subscriptionStatus: user.subscriptionStatus,
        subscriptionPeriodEnd: user.subscriptionPeriodEnd,
        trialEndsAt: user.trialEndsAt,
      }) === 'free' &&
      !trialExpiredDismissed,
  )

  const signOut = useCallback(async () => {
    await apiLogout()
    setUser(null)
  }, [])

  const dismissTrialExpired = useCallback(() => {
    localStorage.setItem(TRIAL_EXPIRED_DISMISSED_KEY, '1')
    setTrialExpiredDismissed(true)
  }, [])

  const value: AuthContextValue = {
    user,
    entitlement,
    loading,
    trialDaysLeft,
    refresh,
    signOut,
    trialWelcome,
    setTrialWelcome,
    trialExpiredNotice,
    dismissTrialExpired,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function useEntitlement(): Entitlement {
  return useAuth().entitlement
}
