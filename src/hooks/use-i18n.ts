import { useState, useCallback } from 'react'
import { type Lang, t as translations } from '@/lib/i18n'

export function useI18n() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('jsonex-lang')
    if (stored === 'en' || stored === 'zh') return stored
    return navigator.language.startsWith('zh') ? 'zh' : 'en'
  })

  const t = translations[lang]

  const toggleLang = useCallback(() => {
    setLang((prev) => {
      const next = prev === 'zh' ? 'en' : 'zh'
      localStorage.setItem('jsonex-lang', next)
      return next
    })
  }, [])

  return { lang, t, toggleLang }
}
