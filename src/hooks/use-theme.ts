import { useCallback } from 'react'
import { useTheme as useNextTheme } from 'next-themes'

export function useTheme() {
  const { resolvedTheme, setTheme } = useNextTheme()
  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light')
  }, [resolvedTheme, setTheme])

  return {
    theme: (resolvedTheme ?? (prefersDark ? 'dark' : 'light')) as 'light' | 'dark',
    toggleTheme,
  }
}
