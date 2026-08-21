// Frame by WhatBit lockup: purple chevron mark + FRAME / by WhatBit.
// Light/dark icon variants toggle via Tailwind's dark: media query.
export function Wordmark({ className = '', height = 32 }: { className?: string; height?: number }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} aria-label="Frame by WhatBit">
      <img
        src="/brand/fracta-flow-icon-purple.svg"
        alt=""
        height={height}
        className="block dark:hidden shrink-0"
        style={{ height, width: 'auto' }}
      />
      <img
        src="/brand/fracta-flow-icon-white.svg"
        alt=""
        height={height}
        className="hidden dark:block shrink-0"
        style={{ height, width: 'auto' }}
      />
      <span className="leading-tight">
        <span className="block font-display font-bold tracking-[0.14em] text-[#0B0B0C] dark:text-white text-[1.05rem]">
          FRAME
        </span>
        <span className="block text-[11px] font-medium text-[#6B6B6B]">
          by What<span className="text-[#7B2FF7]">Bit</span>
        </span>
      </span>
    </span>
  )
}
