import { Link } from 'react-router-dom'

export function EmptyCard({
  title,
  body,
  actionTo,
  actionLabel,
}: {
  title: string
  body: string
  actionTo?: string
  actionLabel?: string
}) {
  return (
    <div className="rounded-2xl border border-[#E5E5E5] dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-8 space-y-3">
      <h2 className="text-lg font-display font-bold text-[#0B0B0C] dark:text-white">{title}</h2>
      <p className="text-sm text-[#6B6B6B] max-w-md">{body}</p>
      {actionTo && actionLabel && (
        <Link
          to={actionTo}
          className="inline-flex rounded-full bg-[#0B0B0C] dark:bg-white text-white dark:text-[#0B0B0C] px-4 py-2 text-sm font-semibold"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
