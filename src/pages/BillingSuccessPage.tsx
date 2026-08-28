import { Link } from 'react-router-dom'
import { LegalLayout } from '../components/LegalLayout'
import { useAuth } from '../context/AuthContext'

export function BillingSuccessPage() {
  const { refresh, user } = useAuth()

  return (
    <LegalLayout title="Subscription updated">
      <p>
        Thank you. If your payment completed, Frame Pro will activate on your account shortly.
        We verify subscriptions server-side — do not rely on this page alone.
      </p>
      {user && (
        <p className="text-sm text-slate-500">
          Signed in as {user.email} · current plan: {user.entitlement}
        </p>
      )}
      <div className="flex flex-wrap gap-3 not-prose pt-2">
        <Link to="/billing" onClick={() => refresh()} className="rounded-md bg-[#E8542E] text-white px-4 py-2 text-sm font-medium">
          View billing
        </Link>
        <Link to="/" className="rounded-md border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium">
          Back to Frame
        </Link>
      </div>
    </LegalLayout>
  )
}
