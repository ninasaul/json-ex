import { describe, expect, it } from 'vitest'
import {
  lineBounds,
  wrapSelection,
  prefixCurrentLine,
  insertFence,
  insertMarkdownTable,
  prefixTaskCheckboxLine,
} from '@/lib/markdown-editor-insert'

describe('markdown-editor-insert', () => {
  it('lineBounds finds current line', () => {
    const s = 'a\nbc\nd'
    expect(lineBounds(s, 3)).toEqual([2, 4])
  })

  it('wrapSelection wraps empty with placeholder', () => {
    const r = wrapSelection('hello', 2, 2, '**', '**', 'x')
    expect(r.text).toBe('he**x**llo')
    expect(r.selStart).toBe(4)
    expect(r.selEnd).toBe(5)
  })

  it('prefixCurrentLine adds bullet once', () => {
    const r = prefixCurrentLine('foo\nbar', 5, '- ')
    expect(r.text).toBe('foo\n- bar')
  })

  it('insertFence uses selection or placeholder as body', () => {
    const r = insertFence('ab', 1, 1, 'z')
    expect(r.text).toContain('```')
    expect(r.text).toContain('z')
  })

  it('insertMarkdownTable inserts pipe table and selects first header', () => {
    const r = insertMarkdownTable('', 0, { h1: 'A', h2: 'B', h3: 'C' })
    expect(r.text).toContain('| A | B | C |')
    expect(r.text).toContain('| --- | --- | --- |')
    expect(r.selStart).toBeGreaterThan(0)
    expect(r.text.slice(r.selStart, r.selEnd)).toBe('A')
  })

  it('prefixTaskCheckboxLine replaces bullet with task', () => {
    const r = prefixTaskCheckboxLine('- item', 2)
    expect(r.text).toBe('- [ ] item')
  })
})
