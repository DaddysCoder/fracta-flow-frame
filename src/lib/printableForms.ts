// Paper parity — recovered from claude/frame-phase-1-contract-qxzs36 and
// adapted to phase-1.5's actual starter lists (scales.ts) instead of the
// deleted fbaContent.ts/escalationContent.ts it shipped against. Blank,
// printable renderings of the formulation interview and the ABC/episode
// form — same content and same starter option pools as the on-screen forms,
// with no interactive-only affordances (checkboxes become printed boxes,
// "add your own" becomes blank ruled lines). A practitioner can print
// these, fill them out away from a device, and transcribe the answers back
// in later.

import {
  ANTECEDENT_ITEMS,
  CONSEQUENCE_ITEMS,
  ESCALATION_PHASE_ITEMS,
  ESCALATION_PHASE_LABELS,
  ESCALATION_PHASE_ORDER,
  FREQUENCY_SCALE,
  RISK_FLAG_OPTIONS,
  SETTING_EVENT_ITEMS,
  SEVERITY_SCALE,
} from './scales'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const PRINT_STYLE = `
  body { font-family: system-ui, sans-serif; color: #0f172a; max-width: 780px; margin: 1.5rem auto; padding: 0 1rem; line-height: 1.5; font-size: 13px; }
  h1 { font-size: 1.3rem; margin-bottom: 0.25rem; }
  h2 { font-size: 1rem; margin-top: 1.5rem; border-bottom: 1px solid #94a3b8; padding-bottom: 0.2rem; }
  h3 { font-size: 0.9rem; margin: 0.9rem 0 0.3rem; }
  .meta { color: #475569; font-size: 0.85rem; margin-bottom: 1rem; }
  .field-line { display: flex; align-items: baseline; gap: 0.5rem; margin: 0.5rem 0; }
  .field-line label { font-weight: 600; white-space: nowrap; }
  .field-line .fill { flex: 1; border-bottom: 1px solid #64748b; min-height: 1.1em; }
  .box { border: 1px solid #94a3b8; border-radius: 4px; padding: 0.5rem; min-height: 3.2em; margin: 0.3rem 0 0.8rem; }
  .checklist { display: flex; flex-wrap: wrap; gap: 0.4rem 1.1rem; margin: 0.3rem 0; }
  .checklist .item { display: flex; align-items: center; gap: 0.3rem; white-space: nowrap; }
  .checkbox { display: inline-block; width: 0.85em; height: 0.85em; border: 1px solid #334155; flex-shrink: 0; }
  .blank-lines { margin: 0.4rem 0 0.8rem; }
  .blank-lines .rule { border-bottom: 1px solid #94a3b8; height: 1.3em; }
  .phase-block { border: 1px solid #cbd5e1; border-radius: 4px; padding: 0.5rem; margin-bottom: 0.5rem; }
  @media print { body { margin: 0; } .phase-block, .box { break-inside: avoid; } }
`

function fieldLine(label: string): string {
  return `<div class="field-line"><label>${escapeHtml(label)}</label><span class="fill"></span></div>`
}

function box(label: string): string {
  return `<h3>${escapeHtml(label)}</h3><div class="box"></div>`
}

function checklist(labels: string[]): string {
  return `<div class="checklist">${labels
    .map((label) => `<span class="item"><span class="checkbox"></span>${escapeHtml(label)}</span>`)
    .join('')}</div>`
}

function blankLines(count: number): string {
  return `<div class="blank-lines">${'<div class="rule"></div>'.repeat(count)}</div>`
}

function documentShell(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(title)}</title>
<style>${PRINT_STYLE}</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">Blank template — print and fill in by hand, or use the on-screen form instead. Same starter options either way; every "Other" line becomes a real checklist option once entered on-screen.</p>
  ${body}
</body>
</html>`
}

export function renderBlankFormulationForm(): string {
  const body = `
    ${fieldLine('Behaviour')}
    ${fieldLine('Informant name')}
    ${fieldLine('Informant role')}
    ${fieldLine('Conducted by')}
    ${fieldLine('Date')}
    ${fieldLine('Onset')}
    ${fieldLine('Frequency impression')}

    ${box('Describe a recent example')}
    ${box('Describe the most intense episode')}
    ${box('What typically comes before and after')}
    ${box('Highest-risk scenario')}
    ${box('Lowest-risk / most manageable scenario')}

    <h2>Antecedents that apply to this behaviour</h2>
    ${checklist([...ANTECEDENT_ITEMS])}
    <p>Other (write in):</p>
    ${blankLines(2)}

    <h2>Consequences that apply to this behaviour</h2>
    ${checklist(CONSEQUENCE_ITEMS.map((c) => c.label))}
    <p>Other (write in):</p>
    ${blankLines(2)}

    <h2>Setting events that apply to this behaviour</h2>
    ${checklist([...SETTING_EVENT_ITEMS])}
    <p>Other (write in):</p>
    ${blankLines(2)}

    <h2>Escalation cycle</h2>
    ${ESCALATION_PHASE_ORDER.map(
      (phase) => `
      <div class="phase-block">
        <h3>${escapeHtml(ESCALATION_PHASE_LABELS[phase])}</h3>
        ${checklist(ESCALATION_PHASE_ITEMS[phase])}
        <p>Other (write in):</p>
        ${blankLines(1)}
      </div>`,
    ).join('')}
  `
  return documentShell('Formulation Interview (blank)', body)
}

export function renderBlankAbcForm(): string {
  const body = `
    ${fieldLine('Behaviour')}
    ${fieldLine('Date & time')}
    ${fieldLine('Duration (minutes)')}
    ${fieldLine('Logged by')}

    <h2>Setting event</h2>
    ${checklist([...SETTING_EVENT_ITEMS])}
    <p>Other (write in):</p>
    ${blankLines(2)}

    <h2>Antecedent — what happened immediately before</h2>
    ${checklist([...ANTECEDENT_ITEMS])}
    <p>Other (write in):</p>
    ${blankLines(2)}

    <h2>Consequence — what happened immediately after</h2>
    ${checklist(CONSEQUENCE_ITEMS.map((c) => c.label))}
    <p>Other (write in):</p>
    ${blankLines(2)}

    <h2>Severity (practical rating, not a validated measure)</h2>
    ${checklist(SEVERITY_SCALE.map((s) => `${s.value} — ${s.label}`))}

    <h2>Frequency / context rating</h2>
    ${checklist(FREQUENCY_SCALE.map((f) => `${f.value} — ${f.label}`))}

    <h2>Risk flags</h2>
    ${checklist(RISK_FLAG_OPTIONS.map((r) => r.label))}
  `
  return documentShell('ABC / Episode Log (blank)', body)
}
