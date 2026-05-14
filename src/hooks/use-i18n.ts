import { useState, useCallback } from 'react'
import { type Lang, t as translations, resolveLangFromSystem } from '@/lib/i18n'

const LANG_STORAGE_KEY = 'sidefmt-lang'

export function useI18n() {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const stored = localStorage.getItem(LANG_STORAGE_KEY)
      if (stored === 'en' || stored === 'zh') return stored
    } catch {
      // private mode / disabled storage
    }
    return resolveLangFromSystem()
  })

  const t = translations[lang]

  const toggleLang = useCallback(() => {
    setLang((prev) => {
      const next = prev === 'zh' ? 'en' : 'zh'
      localStorage.setItem(LANG_STORAGE_KEY, next)
      return next
    })
  }, [])

  return { lang, t, toggleLang }
}
