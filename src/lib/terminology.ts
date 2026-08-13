// Phase 1.3 (brief §3) — terminology tooltip content.
//
// Flagged for review: docs/phase-1.3-sourced-content.md lists these term
// names as the intended tooltip set, but contains no actual definition
// text to pull from — only the names themselves. The definitions below are
// therefore authored for this tool, not sourced from the Guide to
// Functional Behaviour Assessment for Schools or any other cited
// instrument, and should be reviewed by a practitioner before being
// treated as final (same "review before shipping" caveat applied to every
// other unsourced starter list in this build). Written in plain language
// deliberately — the audience includes support workers filling in the
// informant screener, not only BSPs.
export type TerminologyTerm =
  | 'antecedent'
  | 'alternativeBehaviour'
  | 'behaviour'
  | 'consequence'
  | 'function'
  | 'hypothesis'
  | 'reinforcement'
  | 'settingEvent'
  | 'summaryStatement'

export const TERMINOLOGY_DEFINITIONS: Record<TerminologyTerm, { label: string; definition: string }> = {
  antecedent: {
    label: 'Antecedent',
    definition: 'What was happening right before the behaviour — the trigger or immediate context that came first.',
  },
  alternativeBehaviour: {
    label: 'Alternative behaviour',
    definition:
      'A different, safer way for the person to get the same need met, that support could teach and encourage instead of the behaviour of concern.',
  },
  behaviour: {
    label: 'Behaviour',
    definition: 'The specific, observable action being tracked — described in terms anyone could see and agree on, not a label or a guess at intent.',
  },
  consequence: {
    label: 'Consequence',
    definition: 'What happened right after the behaviour — including anything the person gained or avoided as a result.',
  },
  function: {
    label: 'Function',
    definition: 'The need the behaviour is meeting for the person — for example getting attention, escaping a demand, gaining an item, or a sensory outcome.',
  },
  hypothesis: {
    label: 'Hypothesis',
    definition:
      "A best-current-guess about the behaviour's function, based on the data collected so far — not a confirmed diagnosis, and open to revision as more data comes in.",
  },
  reinforcement: {
    label: 'Reinforcement',
    definition: 'Anything that happens after a behaviour that makes the person more likely to do it again in future.',
  },
  settingEvent: {
    label: 'Setting event',
    definition:
      'A broader condition — like poor sleep, illness, or a stressful morning — that makes the behaviour more likely, without directly triggering it the way an antecedent does.',
  },
  summaryStatement: {
    label: 'Summary statement',
    definition:
      "A short, plain-English sentence that ties together the setting, trigger, behaviour, and likely function into one statement practitioners and support staff can act on.",
  },
}
