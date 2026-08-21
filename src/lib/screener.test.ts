import { describe, expect, it } from 'vitest'
import { SCREENER_DISPLAY_ITEMS, SCREENER_ITEMS } from './screener'

describe('screener item order', () => {
  it('keeps canonical SCREENER_ITEMS grouped (QR encode order)', () => {
    expect(SCREENER_ITEMS.map((item) => item.id)).toEqual([
      'att-1', 'att-2', 'att-3', 'att-4', 'att-5', 'att-6',
      'esc-1', 'esc-2', 'esc-3', 'esc-4', 'esc-5', 'esc-6',
      'tan-1', 'tan-2', 'tan-3', 'tan-4', 'tan-5', 'tan-6',
      'auto-1', 'auto-2', 'auto-3', 'auto-4', 'auto-5', 'auto-6',
    ])
  })

  it('interleaves display items so consecutive questions are different domains', () => {
    expect(SCREENER_DISPLAY_ITEMS).toHaveLength(SCREENER_ITEMS.length)
    expect(new Set(SCREENER_DISPLAY_ITEMS.map((item) => item.id))).toEqual(
      new Set(SCREENER_ITEMS.map((item) => item.id)),
    )
    for (let i = 1; i < SCREENER_DISPLAY_ITEMS.length; i++) {
      expect(SCREENER_DISPLAY_ITEMS[i].domain).not.toBe(SCREENER_DISPLAY_ITEMS[i - 1].domain)
    }
  })
})
