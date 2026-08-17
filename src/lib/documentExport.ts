import { DOMAIN_LABELS } from './screener'
import { SEVERITY_SCALE } from './scales'
import { computeSummaryStatement } from './summaryStatement'
import type {
  Behaviour,
  DocumentationFormat,
  Episode,
  FunctionHypothesis,
  FunctionScreener,
  Participant,
  RiskFlag,
} from './types'

// Print-friendly HTML, not a bundled PDF library (brief §5) — the
// practitioner uses the browser's native print-to-PDF. Rendered once at
// generation time into a self-contained string; the caller stores that
// string verbatim as an immutable contentSnapshot.

export interface BehaviourExportData {
  behaviour: Behaviour
  episodes: Episode[]
  screeners: FunctionScreener[]
  latestHypothesis: FunctionHypothesis | null
  flags: RiskFlag[]
}

// The bundle format (brief Part B, step 8) is JSON assembled by
// fbaOutcomeBundle.ts, not HTML — this renderer only ever handles the
// other three.
export type HtmlDocumentationFormat = Exclude<DocumentationFormat, 'fba_outcome_bundle'>

export interface RenderInput {
  format: HtmlDocumentationFormat
  participant: Participant
  generatedBy: string
  generatedAt: string
  behaviours: BehaviourExportData[]
}

const EFA_CAVEAT =
  'Even a full match between screener and observed pattern is not equivalent to confirmation via experimental functional analysis. This is decision support, not a determination of function.'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString()
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString()
}

const FORMAT_TITLE: Record<HtmlDocumentationFormat, string> = {
  clinical_report: 'Clinical Report',
  plan_appendix: 'Behaviour Support Plan Appendix',
  staff_training_summary: 'Staff Training Summary',
}

function hypothesisSummary(h: FunctionHypothesis | null): string {
  if (!h) {
    return `<p><em>No hypothesis has been computed for this behaviour yet.</em></p>`
  }
  const screenerDomains = h.screenerFunctionResult.length
    ? h.screenerFunctionResult.map((d) => DOMAIN_LABELS[d]).join(', ')
    : '—'
  const episodePattern = h.episodePatternResult ? DOMAIN_LABELS[h.episodePatternResult] : 'No clear pattern'
  return `
    <table class="kv">
      <tr><th>Agreement status</th><td>${escapeHtml(h.agreementStatus.replace('_', ' '))}</td></tr>
      <tr><th>Confidence level (computed)</th><td>${escapeHtml(h.confidenceLevel)}</td></tr>
      <tr><th>Practitioner's own confidence</th><td>${h.practitionerConfidence !== null ? `${h.practitionerConfidence}/6 (1 = not sure, 6 = 100% sure) — a separate, subjective rating, not merged into the computed tier above` : 'Not rated'}</td></tr>
      <tr><th>Screener top domain(s)</th><td>${escapeHtml(screenerDomains)}</td></tr>
      <tr><th>Dominant episode pattern</th><td>${escapeHtml(episodePattern)}</td></tr>
      <tr><th>Episodes considered</th><td>${h.episodeCount} across ${h.distinctDayCount} distinct day(s)</td></tr>
      ${h.screenerDisagreement ? '<tr><th>Screener disagreement</th><td>Yes — multiple screeners did not agree on a top domain</td></tr>' : ''}
      <tr><th>Last computed</th><td>${escapeHtml(fmtDateTime(h.computedAt))}</td></tr>
    </table>
    <p class="caveat">${escapeHtml(EFA_CAVEAT)}</p>
  `
}

function flagsTable(flags: RiskFlag[], includeResolved: boolean): string {
  const rows = includeResolved ? flags : flags.filter((f) => f.status !== 'resolved')
  if (rows.length === 0) return '<p><em>No flags to report.</em></p>'
  return `
    <table class="kv">
      <thead><tr><th>Trigger</th><th>Detail</th><th>Status</th><th>Triggered</th><th>Resolution</th></tr></thead>
      <tbody>
        ${rows
          .map(
            (f) => `
          <tr>
            <td>${escapeHtml(f.triggerType.replace(/_/g, ' '))}</td>
            <td>${escapeHtml(f.triggerDetail)}</td>
            <td>${escapeHtml(f.status.replace(/_/g, ' '))}</td>
            <td>${escapeHtml(fmtDateTime(f.triggeredAt))}</td>
            <td>${f.resolutionNote ? escapeHtml(f.resolutionNote) : '—'}</td>
          </tr>`,
          )
          .join('')}
      </tbody>
    </table>
  `
}

function episodesTable(episodes: Episode[]): string {
  if (episodes.length === 0) return '<p><em>No episodes logged.</em></p>'
  return `
    <table class="kv">
      <thead><tr><th>Date</th><th>Severity</th><th>Antecedent</th><th>Consequence</th><th>Risk flags</th></tr></thead>
      <tbody>
        ${episodes
          .map(
            (e) => `
          <tr>
            <td>${escapeHtml(fmtDateTime(e.dateTime))}</td>
            <td>${e.severityRating} — ${escapeHtml(SEVERITY_SCALE[e.severityRating].label)}</td>
            <td>${escapeHtml(e.antecedentText)} <em>(${escapeHtml(e.antecedentTag)})</em></td>
            <td>${escapeHtml(e.consequenceText)} <em>(${escapeHtml(e.consequenceTag)})</em></td>
            <td>${e.riskFlags.length ? escapeHtml(e.riskFlags.join(', ')) : '—'}</td>
          </tr>`,
          )
          .join('')}
      </tbody>
    </table>
  `
}

function screenersSection(screeners: FunctionScreener[]): string {
  if (screeners.length === 0) return '<p><em>No screeners completed.</em></p>'
  return screeners
    .map(
      (s) => `
    <table class="kv">
      <tr><th>Completed</th><td>${escapeHtml(fmtDateTime(s.dateCompleted))}</td></tr>
      <tr><th>Informant</th><td>${escapeHtml(s.informantRole)}</td></tr>
      <tr><th>Domain scores</th><td>${(['attention', 'escape', 'tangible', 'automatic'] as const)
        .map((d) => `${DOMAIN_LABELS[d]}: ${s.domainScores[d]}/6`)
        .join(', ')}</td></tr>
    </table>
  `,
    )
    .join('')
}

function topSettingEvents(episodes: Episode[]): string {
  const counts = new Map<string, number>()
  for (const e of episodes) {
    const key = e.settingEvent.trim() || e.antecedentTag
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  if (sorted.length === 0) return '<p><em>No episode data yet.</em></p>'
  return `<ul>${sorted.map(([k, v]) => `<li>${escapeHtml(k)} (${v}x)</li>`).join('')}</ul>`
}

function summaryStatementSection(b: BehaviourExportData): string {
  const summary = computeSummaryStatement(b.behaviour.name, b.episodes, b.latestHypothesis)
  const badge = summary.completeness === 'full' ? 'Complete' : 'Partial — gaps remain'
  return `
    <h3>Summary statement <span class="stub-note">(${escapeHtml(badge)})</span></h3>
    <p>${escapeHtml(summary.rendered)}</p>
  `
}

function renderClinicalReport(b: BehaviourExportData): string {
  return `
    <section class="behaviour">
      <h2>${escapeHtml(b.behaviour.name)}</h2>
      <p><strong>Operational definition:</strong> ${escapeHtml(b.behaviour.operationalDefinition)}</p>
      ${summaryStatementSection(b)}
      <h3>Function hypothesis</h3>
      ${hypothesisSummary(b.latestHypothesis)}
      <h3>Function screener(s)</h3>
      ${screenersSection(b.screeners)}
      <h3>Episodes (${b.episodes.length})</h3>
      ${episodesTable(b.episodes)}
      <h3>Flags (open and resolved)</h3>
      ${flagsTable(b.flags, true)}
    </section>
  `
}

function renderPlanAppendix(b: BehaviourExportData): string {
  const dateRange =
    b.episodes.length > 0
      ? `${fmtDate(b.episodes[0].dateTime)} – ${fmtDate(b.episodes[b.episodes.length - 1].dateTime)}`
      : 'No episodes logged'
  return `
    <section class="behaviour">
      <h2>${escapeHtml(b.behaviour.name)}</h2>
      <p><strong>Operational definition:</strong> ${escapeHtml(b.behaviour.operationalDefinition)}</p>
      ${summaryStatementSection(b)}
      <h3>Current hypothesis</h3>
      ${hypothesisSummary(b.latestHypothesis)}
      <p><strong>Evidence basis:</strong> ${b.episodes.length} episode(s) logged, ${escapeHtml(dateRange)}.</p>
      <h3>Unresolved flags</h3>
      ${flagsTable(b.flags, false)}
    </section>
  `
}

function renderStaffTrainingSummary(b: BehaviourExportData): string {
  const openFlags = b.flags.filter((f) => f.status === 'open' || f.status === 'acknowledged')
  return `
    <section class="behaviour">
      <h2>${escapeHtml(b.behaviour.name)}</h2>
      <p><strong>What this looks like:</strong> ${escapeHtml(b.behaviour.operationalDefinition)}</p>
      <h3>Known triggers / setting events</h3>
      ${topSettingEvents(b.episodes)}
      <h3>Current status</h3>
      <p>
        ${
          b.latestHypothesis
            ? `${escapeHtml(b.latestHypothesis.agreementStatus.replace('_', ' '))} (${escapeHtml(b.latestHypothesis.confidenceLevel)} confidence)`
            : 'No hypothesis computed yet.'
        }
        ${openFlags.length ? ` — ${openFlags.length} open flag(s) practitioners should be aware of.` : ''}
      </p>
      <p class="stub-note">
        <em>This is a basic summary. Matched support strategies are not included here — that
        depends on separate strategy-library work that does not yet exist.</em>
      </p>
    </section>
  `
}

export function renderDocumentationExport(input: RenderInput): string {
  const sectionRenderer =
    input.format === 'clinical_report'
      ? renderClinicalReport
      : input.format === 'plan_appendix'
        ? renderPlanAppendix
        : renderStaffTrainingSummary

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(FORMAT_TITLE[input.format])} — ${escapeHtml(input.participant.identifyingDetails)}</title>
<style>
  body { font-family: system-ui, sans-serif; color: #0f172a; max-width: 840px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
  h1 { font-size: 1.5rem; }
  h2 { font-size: 1.2rem; margin-top: 2rem; border-bottom: 1px solid #cbd5e1; padding-bottom: 0.25rem; }
  h3 { font-size: 1rem; margin-top: 1.25rem; }
  table.kv { border-collapse: collapse; width: 100%; margin: 0.5rem 0; font-size: 0.9rem; }
  table.kv th, table.kv td { border: 1px solid #cbd5e1; padding: 0.4rem 0.6rem; text-align: left; vertical-align: top; }
  table.kv th { background: #f1f5f9; width: 220px; }
  .caveat { font-size: 0.85rem; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; padding: 0.5rem; border-radius: 4px; }
  .stub-note { font-size: 0.85rem; color: #64748b; }
  .meta { font-size: 0.85rem; color: #64748b; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
  <h1>${escapeHtml(FORMAT_TITLE[input.format])}</h1>
  <p class="meta">
    Participant: ${escapeHtml(input.participant.identifyingDetails)}<br />
    Generated by ${escapeHtml(input.generatedBy)} on ${escapeHtml(fmtDateTime(input.generatedAt))}<br />
    This document is decision support, not a diagnostic determination. It reflects data as of the
    generation time above — later changes to underlying records are not reflected here; generate a
    new export to capture them.
  </p>
  ${input.behaviours.map(sectionRenderer).join('')}
</body>
</html>`
}
