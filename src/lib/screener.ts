import type { ScreenerAnswer, ScreenerDomain, ScreenerResponse } from './types'

// FAST-structured function screener (brief §1, §4).
// Built on the published, open-access FAST item STRUCTURE (Iwata et al., 2013):
// four functional domains, yes/no/unsure indirect-assessment items. Item wording
// below is originally authored for this tool, not reproduced from FAST or any
// commercial instrument (QABF, MAS) — same approach already taken for the
// severity/frequency scale (§7.3), to keep the tool free of licensing dependency.

export interface ScreenerItem {
  id: string
  domain: ScreenerDomain
  prompt: string
}

export const SCREENER_ITEMS: ScreenerItem[] = [
  // Attention (social positive reinforcement)
  { id: 'att-1', domain: 'attention', prompt: 'The behaviour tends to occur when the person is not currently receiving attention from others in the room.' },
  { id: 'att-2', domain: 'attention', prompt: 'The behaviour usually stops soon after someone gives the person attention, comfort, or a reaction.' },
  { id: 'att-3', domain: 'attention', prompt: 'The behaviour is more likely when a support person is nearby but occupied with someone or something else.' },
  { id: 'att-4', domain: 'attention', prompt: 'The person looks toward others (checks in) during or immediately after the behaviour.' },
  { id: 'att-5', domain: 'attention', prompt: 'The behaviour rarely occurs when the person is alone with nobody else present.' },
  { id: 'att-6', domain: 'attention', prompt: 'The behaviour has, in the past, reliably brought a support person over to the person.' },

  // Escape (social negative reinforcement — avoidance of demands/activities)
  { id: 'esc-1', domain: 'escape', prompt: 'The behaviour tends to occur when a task, instruction, or demand has just been presented.' },
  { id: 'esc-2', domain: 'escape', prompt: 'The behaviour is more likely during non-preferred or effortful activities than during preferred ones.' },
  { id: 'esc-3', domain: 'escape', prompt: 'The behaviour usually results in the task, activity, or demand being removed, delayed, or reduced.' },
  { id: 'esc-4', domain: 'escape', prompt: 'The behaviour is more likely when a transition away from a preferred activity is requested.' },
  { id: 'esc-5', domain: 'escape', prompt: 'The behaviour rarely occurs during free time with no demands placed on the person.' },
  { id: 'esc-6', domain: 'escape', prompt: 'Support people have, in the past, backed off or simplified a demand once the behaviour started.' },

  // Tangible (access to preferred items/activities)
  { id: 'tan-1', domain: 'tangible', prompt: 'The behaviour tends to occur when a preferred item or activity is taken away or denied.' },
  { id: 'tan-2', domain: 'tangible', prompt: 'The behaviour is more likely while waiting for a turn, item, or activity the person wants.' },
  { id: 'tan-3', domain: 'tangible', prompt: 'The behaviour usually stops once the person is given the item or activity they wanted.' },
  { id: 'tan-4', domain: 'tangible', prompt: 'The behaviour is more likely when the person sees someone else with a preferred item.' },
  { id: 'tan-5', domain: 'tangible', prompt: 'The behaviour rarely occurs when the person already has free access to preferred items.' },
  { id: 'tan-6', domain: 'tangible', prompt: 'Support people have, in the past, given the person a wanted item or activity once the behaviour started.' },

  // Automatic (non-social / sensory reinforcement)
  { id: 'auto-1', domain: 'automatic', prompt: 'The behaviour occurs at similar rates whether or not anyone else is in the room.' },
  { id: 'auto-2', domain: 'automatic', prompt: 'The behaviour appears repetitive or rhythmic in a way that looks self-stimulatory.' },
  { id: 'auto-3', domain: 'automatic', prompt: 'The behaviour continues even when others do not react to it at all.' },
  { id: 'auto-4', domain: 'automatic', prompt: 'The behaviour is more likely during unstructured or low-stimulation periods.' },
  { id: 'auto-5', domain: 'automatic', prompt: 'The behaviour does not reliably stop when attention, items, or demands change.' },
  { id: 'auto-6', domain: 'automatic', prompt: 'The person seems to engage in the behaviour for its own sensation rather than for a reaction or outcome.' },
]

const ANSWER_SCORE: Record<ScreenerAnswer, number> = { yes: 1, unsure: 0.5, no: 0 }

export function scoreDomains(responses: ScreenerResponse[]): Record<ScreenerDomain, number> {
  const totals: Record<ScreenerDomain, number> = { attention: 0, escape: 0, tangible: 0, automatic: 0 }
  for (const r of responses) {
    totals[r.domain] += ANSWER_SCORE[r.answer]
  }
  return totals
}

export const DOMAIN_LABELS: Record<ScreenerDomain, string> = {
  attention: 'Attention',
  escape: 'Escape',
  tangible: 'Tangible',
  automatic: 'Automatic',
}
