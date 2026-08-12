import { useState } from 'react'

// Custom "Other" checklist additions (brief §4/§2) — persisted locally so
// they're offered as ordinary checkbox items next time, without needing a
// new Dexie table for what's just a UI convenience list, not clinical data.
export function useCustomChecklistItems(storageKey: string): [string[], (item: string) => void] {
  const [items, setItems] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      return raw ? (JSON.parse(raw) as string[]) : []
    } catch {
      return []
    }
  })

  function addItem(item: string) {
    setItems((prev) => {
      if (prev.includes(item)) return prev
      const next = [...prev, item]
      localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }

  return [items, addItem]
}
