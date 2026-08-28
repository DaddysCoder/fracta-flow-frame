import { Link } from 'react-router-dom'
import { TRIAL_EXPIRED_MESSAGE } from '../../shared/entitlement'
import { useAuth } from '../context/AuthContext'

export function EntitlementBanner() {
  const { user, entitlement, trialDaysLeft, trialWelcome, setTrialWelcome, trialExpiredNotice, dismissTrialExpired } =
    useAuth()

  if (trialWelcome) {
    return (
      <div className="bg-[#E8542E]/10 border-b border-[#E8542E]/20 px-4 py-2 text-sm text-[#0B0B0C] dark:text-white flex items-center justify-between gap-3">
        <span>{trialWelcome}</span>
        <button type="button" onClick={() => setTrialWelcome(null)} className="text-xs underline shrink-0">
          Dismiss
        </button>
      </div>
    )
  }

  if (trialExpiredNotice) {
    return (
      <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 flex items-center justify-between gap-3">
        <span>{TRIAL_EXPIRED_MESSAGE}</span>
        <button type="button" onClick={dismissTrialExpired} className="text-xs underline shrink-0">
          Dismiss
        </button>
      </div>
    )
  }

  if (user && entitlement === 'trial' && trialDaysLeft != null) {
    const nearExpiry = trialDaysLeft <= 3
    return (
      <div
        className={`border-b px-4 py-2 text-sm flex items-center justify-between gap-3 ${
          nearExpiry
            ? 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100'
            : 'bg-[#E8542E]/5 border-[#E8542E]/15 text-slate-700 dark:text-slate-200'
        }`}
      >
        <span>
          {nearExpiry
            ? `Your Frame Pro trial ends in ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'}. Subscribe to keep Pro features.`
            : `Pro trial · ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} remaining`}
        </span>
        <Link to="/billing" className="text-xs font-medium text-[#E8542E] hover:underline shrink-0">
          Billing
        </Link>
      </div>
    )
  }

  return null
}
