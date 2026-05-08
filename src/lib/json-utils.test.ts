import { describe, expect, it } from 'vitest'
import { applyJsonFormatStyle, formatJson, minifyJson, repairJsonLike, resolveJsonIndent } from '@/lib/json-utils'

describe('json-utils', () => {
  it('resolveJsonIndent uses tab when enabled', () => {
    expect(resolveJsonIndent({ indentSpaces: 2, useTabIndent: true })).toBe('\t')
    expect(resolveJsonIndent({ indentSpaces: 8, useTabIndent: false })).toBe(8)
  })

  it('formatJson formats valid JSON with indent', () => {
    const res = formatJson('{"a":1}', 2)
    expect(res.error).toBeUndefined()
    expect(res.formatted).toBe('{\n  "a": 1\n}')
  })

  it('formatJson returns error + line/col when position is present', () => {
    // Trailing comma triggers position info in most JS engines.
    const res = formatJson('{\n  "a": 1,\n}\n', 2, (k) => (k === 'errorSyntax' ? 'ERR' : 'EMPTY'))
    expect(res.error).toMatch(/^ERR:/)
    expect(res.line).toBeTypeOf('number')
    expect(res.col).toBeTypeOf('number')
    expect(res.line).toBeGreaterThanOrEqual(1)
    expect(res.col).toBeGreaterThanOrEqual(1)
  })

  it('minifyJson minifies valid JSON', () => {
    const res = minifyJson('{\n  "a": 1,\n  "b": true\n}')
    expect(res.error).toBeUndefined()
    expect(res.formatted).toBe('{"a":1,"b":true}')
  })

  it('applyJsonFormatStyle normalizes line endings + trailing newline', () => {
    const input = '{\r\n  "a": 1\r\n}\r\n'
    const lfNoTrail = applyJsonFormatStyle(input, 'lf', false)
    expect(lfNoTrail).toBe('{\n  "a": 1\n}')

    const crlfTrail = applyJsonFormatStyle('{\n}\n', 'crlf', true)
    expect(crlfTrail).toBe('{\r\n}\r\n')
  })

  it('repairJsonLike repairs common syntax issues', () => {
    const broken = `
    // comment
    {
      a: 'x',
      b: 1,
    }
    `
    const res = repairJsonLike(broken, 2)
    expect(res.error).toBeUndefined()
    expect(res.formatted).toContain('"a": "x"')
    expect(res.formatted).toContain('"b": 1')
  })
})

