import { useCallback } from 'react'
import { toast } from 'sonner'
import { copyToClipboard } from '@/lib/json-utils'
import type { TypeMode } from '@/lib/type-generator'

const EXT_BY_MODE: Record<TypeMode, string> = {
  json: 'json',
  ts: 'ts',
  java: 'java',
  python: 'py',
  go: 'go',
  csharp: 'cs',
  rust: 'rs',
  kotlin: 'kt',
  php: 'php',
  swift: 'swift',
  ruby: 'rb',
  cpp: 'cpp',
}

function reportError(setA11yError: (value: string | null) => void, message: string) {
  setA11yError(message)
  toast.error(message)
}

export function useActions(opts: {
  lang: 'zh' | 'en'
  setA11yError: (value: string | null) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  fileInputDiffRef: React.RefObject<HTMLInputElement | null>
  onUploadLeft: (text: string) => void
  onUploadRight: (text: string) => void
  clearLeftActiveHistory: () => void
  clearRightActiveHistory: () => void
}) {
  const {
    lang,
    setA11yError,
    fileInputRef,
    fileInputDiffRef,
    onUploadLeft,
    onUploadRight,
    clearLeftActiveHistory,
    clearRightActiveHistory,
  } = opts

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [fileInputRef])

  const handleUploadClickDiff = useCallback(() => {
    fileInputDiffRef.current?.click()
  }, [fileInputDiffRef])

  const handleUploadFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const content = await file.text()
      onUploadLeft(content)
      clearLeftActiveHistory()
      setA11yError(null)
    } catch {
      reportError(setA11yError, lang === 'zh' ? '读取文件失败，请重试。' : 'Failed to read file. Please try again.')
    }
    e.target.value = ''
  }, [lang, onUploadLeft, clearLeftActiveHistory, setA11yError])

  const handleUploadFileDiff = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const content = await file.text()
      onUploadRight(content)
      clearRightActiveHistory()
      setA11yError(null)
    } catch {
      reportError(setA11yError, lang === 'zh' ? '读取文件失败，请重试。' : 'Failed to read file. Please try again.')
    }
    e.target.value = ''
  }, [lang, onUploadRight, clearRightActiveHistory, setA11yError])

  const copyText = useCallback(async (text: string, onCopied?: () => void) => {
    if (!text) return false
    const ok = await copyToClipboard(text)
    if (!ok) {
      reportError(setA11yError, lang === 'zh' ? '复制失败，请检查浏览器剪贴板权限。' : 'Failed to copy. Check clipboard permissions.')
      return false
    }
    setA11yError(null)
    onCopied?.()
    return true
  }, [lang, setA11yError])

  const downloadText = useCallback((text: string, mode: TypeMode) => {
    if (!text) return
    try {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `jsonex-output.${EXT_BY_MODE[mode]}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setA11yError(null)
    } catch {
      reportError(setA11yError, lang === 'zh' ? '下载失败，请重试。' : 'Download failed. Please try again.')
    }
  }, [lang, setA11yError])

  const downloadRaw = useCallback((text: string, ext: string) => {
    if (!text) return
    try {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `jsonex-output.${ext}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setA11yError(null)
    } catch {
      reportError(setA11yError, lang === 'zh' ? '下载失败，请重试。' : 'Download failed. Please try again.')
    }
  }, [lang, setA11yError])

  const openFullscreenWindow = useCallback(() => {
    if (
      typeof chrome === 'undefined' ||
      typeof chrome.runtime === 'undefined' ||
      !chrome.runtime.id ||
      typeof chrome.windows === 'undefined' ||
      typeof chrome.windows.create !== 'function'
    ) return

    const url = chrome.runtime.getURL('index.html')
    chrome.windows.create(
      {
        url,
        type: 'normal',
        focused: true,
        state: 'maximized',
      },
      () => {
        const lastErr = chrome.runtime.lastError
        if (lastErr) console.warn('[JsonEx] windows.create:', lastErr.message)
      },
    )
  }, [])

  return {
    handleUploadClick,
    handleUploadClickDiff,
    handleUploadFile,
    handleUploadFileDiff,
    copyText,
    downloadText,
    downloadRaw,
    openFullscreenWindow,
  }
}
