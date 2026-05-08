import { useCallback, useEffect, useMemo, useState } from 'react'
import { readStorageJson, writeStorageJson } from '@/lib/storage'

export interface HistoryItem {
  id: string
  input: string
  output: string
  createdAt: number
}

interface UseHistoryOptions {
  storageKey: string
  limit: number
  enabled: boolean
  debounceMs?: number
  input: string
  output: string
  canRecord: boolean
}

export function useHistory(opts: UseHistoryOptions) {
  const { storageKey, limit, enabled, debounceMs = 500, input, output, canRecord } = opts

  const [items, setItems] = useState<HistoryItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  const trimmedInput = useMemo(() => input.trim(), [input])
  const trimmedOutput = useMemo(() => output.trim(), [output])

  useEffect(() => {
    const parsed = readStorageJson<HistoryItem[]>(storageKey)
    if (Array.isArray(parsed)) setItems(parsed.slice(0, limit))
  }, [storageKey, limit])

  useEffect(() => {
    writeStorageJson(storageKey, items.slice(0, limit))
  }, [storageKey, items, limit])

  useEffect(() => {
    if (!enabled) return
    if (!canRecord) return
    if (!trimmedInput || !trimmedOutput) return
    const timer = window.setTimeout(() => {
      setItems((prev) => {
        const top = prev[0]
        if (top && top.input === input && top.output === output) return prev
        const next: HistoryItem = {
          id: `${Date.now()}`,
          input,
          output,
          createdAt: Date.now(),
        }
        return [next, ...prev].slice(0, limit)
      })
    }, debounceMs)
    return () => window.clearTimeout(timer)
  }, [enabled, canRecord, trimmedInput, trimmedOutput, input, output, limit, debounceMs])

  const clear = useCallback(() => {
    setItems([])
    setActiveId(null)
  }, [])

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
    setActiveId((prev) => (prev === id ? null : prev))
  }, [])

  const useItem = useCallback((item: HistoryItem, applyInput: (value: string) => void) => {
    applyInput(item.input)
    setActiveId(item.id)
  }, [])

  return {
    items,
    setItems,
    activeId,
    setActiveId,
    useItem,
    clear,
    remove,
  }
}

