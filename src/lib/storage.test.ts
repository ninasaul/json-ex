import { describe, expect, it, vi } from 'vitest'
import { readStorageJson, writeStorageJson } from '@/lib/storage'

function createMockStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => (data.has(key) ? data.get(key)! : null),
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
    removeItem: (key: string) => {
      data.delete(key)
    },
    clear: () => {
      data.clear()
    },
  }
}

describe('storage', () => {
  it('returns null when key missing', () => {
    vi.stubGlobal('localStorage', createMockStorage())
    expect(readStorageJson('missing')).toBeNull()
  })

  it('returns null on invalid JSON', () => {
    const s = createMockStorage()
    s.setItem('k', '{bad json')
    vi.stubGlobal('localStorage', s)
    expect(readStorageJson('k')).toBeNull()
  })

  it('writes and reads JSON values', () => {
    vi.stubGlobal('localStorage', createMockStorage())
    expect(writeStorageJson('k', { a: 1 })).toBe(true)
    expect(readStorageJson<{ a: number }>('k')).toEqual({ a: 1 })
  })

  it('returns false when setItem throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota')
      },
    })
    expect(writeStorageJson('k', { a: 1 })).toBe(false)
  })
})

