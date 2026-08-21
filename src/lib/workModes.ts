export const BEHAVIOUR_TABS = [
  { id: 'episodes', label: 'Episode log', short: 'Log' },
  { id: 'screener', label: 'Function screener', short: 'Screener' },
  { id: 'triangulation', label: 'Triangulation', short: 'Triangulation' },
  { id: 'flags', label: 'Flags', short: 'Flags' },
  { id: 'handoff', label: 'Multi-informant', short: 'Handoff' },
] as const

export type BehaviourTab = (typeof BEHAVIOUR_TABS)[number]['id']

const TAB_IDS = new Set<string>(BEHAVIOUR_TABS.map((t) => t.id))

export function parseBehaviourTab(raw: string | null): BehaviourTab {
  if (raw && TAB_IDS.has(raw)) return raw as BehaviourTab
  return 'episodes'
}
