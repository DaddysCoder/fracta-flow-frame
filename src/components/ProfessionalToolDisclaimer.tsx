// Small, muted disclaimer shown on clinical/professional-use forms, assessments,
// and generated documentation. Keeps FRAME positioned as decision support that
// augments, rather than replaces, practitioner judgement and regulatory obligations.
export function ProfessionalToolDisclaimer({ className = '' }: { className?: string }) {
  return (
    <p className={`text-xs text-slate-400 dark:text-slate-500 ${className}`}>
      Professional tool only. This resource supports, but does not replace, practitioner
      judgement, appropriate assessment, organisational procedures or current regulatory
      requirements.
    </p>
  )
}
