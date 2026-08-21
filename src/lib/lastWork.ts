import { parseBehaviourTab, type BehaviourTab } from './workModes'

const KEY = 'frame-last-work'

export interface LastWork {
  behaviourId: string
  tab: BehaviourTab
}

export function rememberLastWork(behaviourId: string, tab: BehaviourTab) {
  sessionStorage.setItem(KEY, JSON.stringify({ behaviourId, tab }))
}

export function readLastWork(): LastWork | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { behaviourId?: unknown; tab?: unknown }
    if (typeof parsed.behaviourId !== 'string' || !parsed.behaviourId) return null
    return { behaviourId: parsed.behaviourId, tab: parseBehaviourTab(typeof parsed.tab === 'string' ? parsed.tab : null) }
  } catch {
    return null
  }
}
