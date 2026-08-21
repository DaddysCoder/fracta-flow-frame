export function WorkModeBar<T extends string>({
  items,
  value,
  onChange,
  labelledBy,
}: {
  items: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
  labelledBy?: string
}) {
  return (
    <div
      role="tablist"
      aria-labelledby={labelledBy}
      className="inline-flex flex-wrap items-center gap-1 rounded-full bg-[#E8E8E8] dark:bg-slate-800 p-1.5"
    >
      {items.map((item) => {
        const selected = item.id === value
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(item.id)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              selected
                ? 'bg-[#0B0B0C] text-white dark:bg-white dark:text-[#0B0B0C]'
                : 'bg-transparent text-[#0B0B0C] dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
