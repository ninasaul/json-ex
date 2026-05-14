import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useHistory } from '@/hooks/use-history'

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

describe('useHistory', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('localStorage', createMockStorage())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('records a new item after debounce when enabled', () => {
    const { result } = renderHook(() =>
      useHistory({
        storageKey: 'sidefmt-test-history',
        limit: 5,
        enabled: true,
        debounceMs: 40,
        input: '{"a":1}',
        output: '{\n  "a": 1\n}',
        canRecord: true,
      }),
    )

    expect(result.current.items).toEqual([])

    act(() => {
      vi.advanceTimersByTime(50)
    })

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].input).toBe('{"a":1}')
  })

  it('clear removes items', () => {
    const { result } = renderHook(() =>
      useHistory({
        storageKey: 'sidefmt-test-history-2',
        limit: 5,
        enabled: true,
        debounceMs: 10,
        input: '1',
        output: '2',
        canRecord: true,
      }),
    )

    act(() => {
      vi.advanceTimersByTime(20)
    })
    expect(result.current.items.length).toBeGreaterThan(0)

    act(() => {
      result.current.clear()
    })
    expect(result.current.items).toEqual([])
  })
})
