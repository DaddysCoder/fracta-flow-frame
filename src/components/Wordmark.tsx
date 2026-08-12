// Real brand asset (Fracta Flow brand kit v2, §2): chevron mark + wordmark
// lockup, supplied as SVG. Clear space equal to the icon's height is already
// built into each file's viewBox — placed flush, per the kit's own rule.
// Light/dark variants toggle via Tailwind's dark: media query rather than a
// prop, so this always tracks the active color scheme.
export function Wordmark({ className = '', height = 28 }: { className?: string; height?: number }) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <img
        src="/brand/fracta-flow-lockup-color.svg"
        alt="Fracta Flow"
        height={height}
        className="block dark:hidden"
        style={{ height }}
      />
      <img
        src="/brand/fracta-flow-lockup-white.svg"
        alt="Fracta Flow"
        height={height}
        className="hidden dark:block"
        style={{ height }}
      />
    </span>
  )
}
