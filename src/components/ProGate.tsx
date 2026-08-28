import { Link } from 'react-router-dom'

export function ProBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-[#E8542E]/10 text-[#E8542E] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${className}`}
    >
      Frame Pro
    </span>
  )
}

export function ProGate({
  allowed,
  feature,
  children,
}: {
  allowed: boolean
  feature: string
  children: React.ReactNode
}) {
  if (allowed) return <>{children}</>

  return (
    <div className="relative rounded-lg border border-[#E5E5E5] dark:border-slate-800 overflow-hidden">
      <div className="opacity-40 pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/85 p-4">
        <div className="text-center max-w-sm space-y-2">
          <ProBadge className="mx-auto" />
          <p className="text-sm font-medium text-[#0B0B0C] dark:text-white">{feature}</p>
          <p className="text-xs text-slate-500">
            Available on Frame Pro — start a free 14-day trial or subscribe. Your existing records stay on this device.
          </p>
          <Link
            to="/pricing"
            className="inline-block rounded-md bg-[#E8542E] text-white px-3 py-1.5 text-sm font-medium hover:bg-[#F07655]"
          >
            View Frame Pro
          </Link>
        </div>
      </div>
    </div>
  )
}
