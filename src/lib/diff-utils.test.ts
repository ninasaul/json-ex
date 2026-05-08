import { describe, expect, it } from 'vitest'
import { buildDiffRows, formatDiffRowsForCopy, summarizeDiffRows } from '@/lib/diff-utils'

describe('diff-utils', () => {
  it('treats whitespace-only changes as context when ignoreWhitespace=true', () => {
    const rows = buildDiffRows('{\n  "a": 1\n}', '{\n"a":    1\n}', true)
    expect(rows.every((r) => r.kind === 'context')).toBe(true)
  })

  it('merges remove+add into modify', () => {
    const rows = buildDiffRows('a\nx\nc', 'a\ny\nc', false)
    expect(rows.some((r) => r.kind === 'modify')).toBe(true)
    const summary = summarizeDiffRows(rows)
    expect(summary.modifies).toBe(1)
    expect(summary.adds).toBe(0)
    expect(summary.removes).toBe(0)
  })

  it('formats diff rows for copy', () => {
    const rows = buildDiffRows('a\nb', 'a\nc', false)
    const text = formatDiffRowsForCopy(rows)
    expect(text).toContain('  a')
    expect(text).toMatch(/~\s+b\s+->\s+c/)
  })
})

