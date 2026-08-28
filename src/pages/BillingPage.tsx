import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LegalLayout } from '../components/LegalLayout'
import { NO_CLOUD_SYNC_MESSAGE } from '../../shared/entitlement'
import { openBillingPortal, startCheckout } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { ProBadge } from '../components/ProGate'

export function BillingPage() {
  const { user, entitlement, loading, signOut, trialDaysLeft } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)

  async function checkout(plan: 'monthly' | 'annual') {
    setError(null)
    setPending(plan)
    try {
      const { url } = await startCheckout(plan)
      if (url) window.location.href = url
      else setError('Checkout is not available yet.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
    } finally {
      setPending(null)
    }
  }

  async function portal() {
    setError(null)
    setPending('portal')
    try {
      const { url } = await openBillingPortal()
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Portal unavailable')
    } finally {
      setPending(null)
    }
  }

  if (loading) {
    return (
      <LegalLayout title="Billing">
        <p className="text-sm text-slate-500">Loading…</p>
      </LegalLayout>
    )
  }

  if (!user) {
    return (
      <LegalLayout title="Billing">
        <p>Sign in to manage your Frame Pro trial or subscription.</p>
        <Link to="/login?redirect=/billing" className="inline-block mt-4 rounded-md bg-[#E8542E] text-white px-4 py-2 text-sm font-medium">
          Sign in
        </Link>
      </LegalLayout>
    )
  }

  return (
    <LegalLayout title="Billing & subscription">
      <div className="space-y-6 not-prose">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">{user.email}</span>
          {entitlement === 'pro' && <ProBadge />}
          {entitlement === 'trial' && (
            <span className="text-xs text-[#E8542E] font-medium">
              Pro trial · {trialDaysLeft ?? '—'} days remaining
            </span>
          )}
          {entitlement === 'free' && user.trialStartedAt && (
            <span className="text-xs text-slate-500">Frame Free</span>
          )}
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300">{NO_CLOUD_SYNC_MESSAGE}</p>

        {entitlement !== 'pro' && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Subscribe to Frame Pro</h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!!pending}
                onClick={() => checkout('monthly')}
                className="rounded-md bg-[#E8542E] text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {pending === 'monthly' ? 'Redirecting…' : 'A$29 / month'}
              </button>
              <button
                type="button"
                disabled={!!pending}
                onClick={() => checkout('annual')}
                className="rounded-md border border-[#E8542E] text-[#E8542E] px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {pending === 'annual' ? 'Redirecting…' : 'A$290 / year'}
              </button>
            </div>
          </div>
        )}

        {user.subscriptionStatus && (
          <div>
            <button
              type="button"
              disabled={!!pending}
              onClick={portal}
              className="rounded-md border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {pending === 'portal' ? 'Opening…' : 'Manage subscription (Stripe)'}
            </button>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="button" onClick={() => signOut()} className="text-sm text-slate-500 underline">
          Sign out
        </button>

        <p className="text-xs text-slate-400">
          Payments processed by Stripe. Participant clinical records are not stored on Frame servers.
        </p>
      </div>
    </LegalLayout>
  )
}
