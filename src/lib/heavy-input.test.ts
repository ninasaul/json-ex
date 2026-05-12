import { describe, expect, it } from 'vitest'
import {
  HEAVY_DIFF_COMBINED_CHAR_THRESHOLD,
  HEAVY_JSON_CHAR_THRESHOLD,
  isHeavyDiffPair,
  isHeavyJsonText,
} from '@/lib/heavy-input'

describe('heavy-input', () => {
  it('detects heavy JSON by character count', () => {
    expect(isHeavyJsonText('a'.repeat(HEAVY_JSON_CHAR_THRESHOLD))).toBe(false)
    expect(isHeavyJsonText('a'.repeat(HEAVY_JSON_CHAR_THRESHOLD + 1))).toBe(true)
  })

  it('detects heavy diff pair by sides or combined size', () => {
    const half = Math.floor(HEAVY_DIFF_COMBINED_CHAR_THRESHOLD / 2) + 2
    expect(isHeavyDiffPair('a'.repeat(half), 'b'.repeat(half))).toBe(true)
    expect(isHeavyDiffPair('x', 'y')).toBe(false)
  })
})
