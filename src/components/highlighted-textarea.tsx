import { useRef, useCallback, useEffect } from 'react'
import { syntaxHighlight } from '@/lib/json-utils'

interface Props {
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  placeholder?: string
  spellCheck?: boolean
  editorStyle?: React.CSSProperties
}

export function HighlightedTextarea({ value, onChange, onKeyDown, placeholder, spellCheck, editorStyle }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)

  const syncScroll = useCallback(() => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop
      preRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
  }, [])

  // Keep scroll in sync
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.addEventListener('scroll', syncScroll, { passive: true })
    return () => ta.removeEventListener('scroll', syncScroll)
  }, [syncScroll])

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <pre
        ref={preRef}
        aria-hidden="true"
        className="absolute inset-0 overflow-hidden font-mono text-xs leading-relaxed
          bg-transparent m-0 px-3 py-3 pb-14 whitespace-pre-wrap break-all
          pointer-events-none"
        style={editorStyle}
        dangerouslySetInnerHTML={{
          __html: value ? syntaxHighlight(value) + '\n' : '',
        }}
      />
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        spellCheck={spellCheck}
        className="relative w-full h-full resize-none border-0 rounded-none font-mono text-xs leading-relaxed
          bg-transparent text-transparent caret-foreground
          placeholder:text-muted-foreground/55
          focus:outline-none focus-visible:outline-none
          px-3 py-3 pb-14"
        style={editorStyle}
      />
    </div>
  )
}
