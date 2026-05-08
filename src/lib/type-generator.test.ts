import { describe, expect, it } from 'vitest'
import { generate, type JsonValue } from '@/lib/type-generator'

describe('type-generator', () => {
  it('generates TypeScript interface for object', () => {
    const input: JsonValue = { id: 1, name: 'a', ok: true }
    const out = generate(input, 'ts')
    expect(out).toContain('interface Root')
    expect(out).toContain('id: number;')
    expect(out).toContain('name: string;')
    expect(out).toContain('ok: boolean;')
  })

  it('marks field optional when null is present in object', () => {
    const input: JsonValue = { a: null, b: 1 }
    const out = generate(input, 'ts')
    // a: null becomes optional due to nullability handling
    expect(out).toMatch(/\ba\?: null;/)
  })

  it('generates array types for primitives', () => {
    const input: JsonValue = [1, 2, 3]
    const out = generate(input, 'ts')
    expect(out).toBe('type Root = number[];')
  })

  it('generates Rust struct with serde rename', () => {
    const input: JsonValue = { 'user-id': 1 }
    const out = generate(input, 'rust')
    expect(out).toContain('use serde::{Deserialize, Serialize};')
    expect(out).toContain('#[serde(rename = "user-id")]')
  })
})

