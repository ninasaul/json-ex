import { useCallback, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Panel } from 'react-resizable-panels'
import { JsonexMainLayout } from '@/components/jsonex/jsonex-main-layout'
import { HighlightedTextarea } from '@/components/highlighted-textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { HugeiconsIcon } from '@hugeicons/react'
import { SparklesIcon, Copy01Icon, Tick02Icon, EraserIcon, AlertCircleIcon } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Lang } from '@/lib/i18n'
import { isHeavyJsonText, plainEscapeMultiline } from '@/lib/heavy-input'
import {
  CODE_FORMAT_KINDS,
  type CodeFormatKind,
  formatCodeWithPrettier,
  highlightCodeOutput,
  type CodeFormatStyleOptions,
} from '@/lib/code-format-utils'

export interface CodeFormatWorkspaceProps {
  lang: Lang
  editorStyle: CSSProperties
  splitColHandleClass: string
  resizeAria: string
  style: CodeFormatStyleOptions
  setA11yError: (msg: string | null) => void
  labels: {
    input: string
    output: string
    format: string
    copy: string
    copied: string
    clear: string
    parser: string
    empty: string
    formatErrorPrefix: string
    panelSourceAria: string
    panelResultAria: string
    shortcut: string
    kindLabels: Record<CodeFormatKind, string>
  }
}

export function CodeFormatWorkspace({
  lang,
  editorStyle,
  splitColHandleClass,
  resizeAria,
  style,
  setA11yError,
  labels,
}: CodeFormatWorkspaceProps) {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [kind, setKind] = useState<CodeFormatKind>('typescript')
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  const runFormat = useCallback(async () => {
    setBusy(true)
    setA11yError(null)
    try {
      const res = await formatCodeWithPrettier(input, kind, style)
      if ('error' in res) {
        if (res.error === '__empty__') {
          const msg = labels.empty
          setError(msg)
          setOutput('')
          setA11yError(msg)
          toast.error(msg)
        } else {
          const msg = `${labels.formatErrorPrefix}: ${res.error}`
          setError(msg)
          setOutput('')
          setA11yError(msg)
          toast.error(msg)
        }
      } else {
        setError(undefined)
        setOutput(res.formatted)
        setA11yError(null)
      }
    } finally {
      setBusy(false)
    }
  }, [input, kind, style, labels, setA11yError])

  const highlighted = useMemo(() => {
    if (!output) return ''
    if (isHeavyJsonText(output)) return plainEscapeMultiline(output)
    return highlightCodeOutput(output, kind)
  }, [output, kind])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        void runFormat()
      }
    },
    [runFormat],
  )

  const handleCopy = useCallback(async () => {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      const msg = lang === 'zh' ? '复制失败' : 'Copy failed'
      toast.error(msg)
    }
  }, [output, lang])

  const source = (
    <section
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={labels.panelSourceAria}
    >
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border/60 bg-muted/10 px-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{labels.input}</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-6 text-muted-foreground hover:text-foreground"
              aria-label={labels.clear}
              onClick={() => {
                setInput('')
                setOutput('')
                setError(undefined)
              }}
            >
              <HugeiconsIcon icon={EraserIcon} data-icon strokeWidth={2} className="size-3.5 shrink-0" aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{labels.clear}</TooltipContent>
        </Tooltip>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <HighlightedTextarea
          highlight="plain"
          value={input}
          onChange={setInput}
          onKeyDown={handleKeyDown}
          placeholder={labels.shortcut}
          spellCheck={false}
          editorStyle={editorStyle}
        />
      </ScrollArea>
    </section>
  )

  const result = (
    <Panel id="panel-code-result" defaultSize={48} minSize={22} className="flex min-h-0 min-w-0 flex-col overflow-hidden" style={{ overflow: 'hidden' }}>
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" aria-label={labels.panelResultAria}>
        <div className="shrink-0 border-b border-border/60 bg-muted/10 px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{labels.output}</div>
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-1.5">
              <span className="sr-only">{labels.parser}</span>
              <Select value={kind} onValueChange={(v) => setKind(v as CodeFormatKind)}>
                <SelectTrigger size="sm" className="h-6 min-w-30 max-w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectGroup>
                    {CODE_FORMAT_KINDS.map((k) => (
                      <SelectItem key={k} value={k} className="text-xs">
                        {labels.kindLabels[k]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="default"
                    size="icon-sm"
                    className="size-6"
                    disabled={busy}
                    onClick={() => void runFormat()}
                    aria-label={labels.format}
                  >
                    <HugeiconsIcon icon={SparklesIcon} data-icon strokeWidth={2} className="size-3.5 shrink-0" aria-hidden />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{labels.format}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="size-6"
                    disabled={!output}
                    onClick={() => void handleCopy()}
                    aria-live="polite"
                    aria-label={copied ? labels.copied : labels.copy}
                  >
                    {copied ? (
                      <HugeiconsIcon icon={Tick02Icon} data-icon strokeWidth={2} className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    ) : (
                      <HugeiconsIcon icon={Copy01Icon} data-icon strokeWidth={2} className="size-3.5 shrink-0 opacity-70" aria-hidden />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{copied ? labels.copied : labels.copy}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
        <ScrollArea className="min-h-0 flex-1 bg-background">
          <div className="flex min-h-full min-w-0 flex-1 flex-col px-3 py-3 pb-8">
            {error ? (
              <Alert variant="destructive" className="mb-3 rounded-lg">
                <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} className="size-4" aria-hidden />
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            ) : null}
            {output ? (
              <div className="font-mono text-xs leading-relaxed" style={editorStyle}>
                {highlighted.split('\n').map((row, idx) => (
                  <div key={idx} className="flex min-h-5">
                    <span className="w-10 shrink-0 select-none pe-3 text-right text-muted-foreground/70">{idx + 1}</span>
                    <span
                      className={cn('min-w-0 flex-1 whitespace-pre-wrap wrap-break-word text-foreground')}
                      dangerouslySetInnerHTML={{ __html: row || ' ' }}
                    />
                  </div>
                ))}
              </div>
            ) : !error ? (
              <p className="text-xs text-muted-foreground">{labels.shortcut}</p>
            ) : null}
          </div>
        </ScrollArea>
      </section>
    </Panel>
  )

  return (
    <JsonexMainLayout
      workMode="format"
      lang={lang}
      columnHandleClassDiff={splitColHandleClass}
      columnHandleClassFormat={splitColHandleClass}
      rowHandleClassDiff={splitColHandleClass}
      resizePanelsBetweenSourceResultAria={resizeAria}
      source={source}
      compareRight={null}
      result={result}
    />
  )
}
