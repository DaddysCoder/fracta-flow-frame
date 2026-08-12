// Typographic reproduction of the Primitive AI wordmark (brand guidelines
// §1: neo-grotesque "Primitiv", serif-italic "e" as Euler's number, "AI" as
// its exponent). No actual SVG logo asset was supplied to this build — the
// guidelines' own rule ("don't rebuild the wordmark by typing it, use the
// SVG") can't be followed literally without one, so this is a deliberate,
// documented fallback built to the same spec. Replace with the real SVG
// (primitive-ai-primary.svg etc.) if it becomes available.
//
// Per §3: deep magenta (#9D1D5B) goes muddy on dark, so it lifts to #D8579A
// there — the guideline's own reversed-lockup rule. Per the same section,
// magenta belongs to the fractal and appears on exactly this one letter,
// never as a heading, rule, or button color anywhere else in this app.
const SERIF_ITALIC = { fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic' as const }

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-sans ${className}`}>
      Primitiv
      <i style={{ ...SERIF_ITALIC, color: '#9D1D5B' }} className="dark:hidden">
        e
      </i>
      <i style={{ ...SERIF_ITALIC, color: '#D8579A' }} className="hidden dark:inline">
        e
      </i>
      <sup className="text-[0.6em]">AI</sup>
    </span>
  )
}
