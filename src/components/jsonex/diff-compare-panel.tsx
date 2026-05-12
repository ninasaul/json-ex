import { HighlightedTextarea } from '@/components/highlighted-textarea'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { CSSProperties } from 'react'
import type { HistoryItem } from '@/hooks/use-history'
import type { Lang } from '@/lib/i18n'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Clock01Icon,
  Delete02Icon,
  EraserIcon,
  FileUploadIcon,
  LeftToRightBlockQuoteIcon,
  Menu01Icon,
} from '@hugeicons/core-free-icons'

export interface DiffComparePanelProps {
  lang: Lang
  diffInput: string
  onDiffInputChange: (value: string) => void
  editorStyle: CSSProperties

  onUploadClickDiff: () => void

  onDiffEscape: () => void
  onDiffUnescape: () => void

  diffHistoryOpen: boolean
  onToggleDiffHistory: () => void
  diffHistoryItems: HistoryItem[]
  activeDiffHistoryId: string | null
  onUseDiffHistory: (item: HistoryItem) => void
  onClearDiffHistory: () => void
  onRemoveDiffHistoryItem: (id: string) => void
  diffHistoryClearDisabled: boolean

  onFillFromOutput: () => void
  fillFromOutputDisabled: boolean

  onDiffClear: () => void
  diffClearDisabled: boolean

  escapeLabel: string
  unescapeLabel: string
  clearLabel: string
  emptyHistoryLabel: string
  clearHistoryAria: string
  deleteHistoryAria: string
  uploadAria: string

  heading: string
  ariaLabel: string
  placeholder: string
}

export function DiffComparePanel(props: DiffComparePanelProps) {
  const {
    lang,
    diffInput,
    onDiffInputChange,
    editorStyle,
    onUploadClickDiff,
    onDiffEscape,
    onDiffUnescape,
    diffHistoryOpen,
    onToggleDiffHistory,
    diffHistoryItems,
    activeDiffHistoryId,
    onUseDiffHistory,
    onClearDiffHistory,
    onRemoveDiffHistoryItem,
    diffHistoryClearDisabled,
    onFillFromOutput,
    fillFromOutputDisabled,
    onDiffClear,
    diffClearDisabled,
    escapeLabel,
    unescapeLabel,
    clearLabel,
    emptyHistoryLabel,
    clearHistoryAria,
    deleteHistoryAria,
    uploadAria,
    heading,
    ariaLabel,
    placeholder,
  } = props

  return (
    <section
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden outline-none bg-background focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={ariaLabel}
    >
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border/60 bg-muted/10 px-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{heading}</h2>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon-sm" className="size-6 text-muted-foreground hover:text-foreground" aria-label={uploadAria} onClick={onUploadClickDiff}>
                <HugeiconsIcon icon={FileUploadIcon} data-icon strokeWidth={2} className="size-3.5 shrink-0" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{uploadAria}</TooltipContent>
          </Tooltip>
          <ButtonGroup orientation="horizontal" className="h-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm" className="size-6 text-muted-foreground hover:text-foreground" onClick={onDiffEscape} aria-label={escapeLabel}>
                  <HugeiconsIcon icon={LeftToRightBlockQuoteIcon} data-icon strokeWidth={2} className="size-3.5 shrink-0" aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{escapeLabel}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm" className="size-6 text-muted-foreground hover:text-foreground" onClick={onDiffUnescape} aria-label={unescapeLabel}>
                  <HugeiconsIcon icon={LeftToRightBlockQuoteIcon} data-icon strokeWidth={2} className="size-3.5 shrink-0" aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{unescapeLabel}</TooltipContent>
            </Tooltip>
          </ButtonGroup>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon-sm" className="size-6 text-muted-foreground hover:text-foreground" aria-label={diffHistoryOpen ? 'Hide history' : 'Show history'} onClick={onToggleDiffHistory}>
                <HugeiconsIcon icon={Menu01Icon} data-icon strokeWidth={2} className="size-3.5 shrink-0" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{diffHistoryOpen ? 'Hide history' : 'Show history'}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-6 max-w-30 shrink-0 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={onFillFromOutput} disabled={fillFromOutputDisabled}>
                {lang === 'zh' ? '← 左侧结果' : '← Left'}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{lang === 'zh' ? '用左侧格式化结果填入右侧' : 'Fill right from left formatted output'}</TooltipContent>
          </Tooltip>
          <Button type="button" variant="ghost" size="icon-sm" className="size-6 text-muted-foreground hover:text-foreground" aria-label={clearLabel} onClick={onDiffClear} disabled={diffClearDisabled}>
            <HugeiconsIcon icon={EraserIcon} data-icon strokeWidth={2} className="size-3.5 shrink-0" aria-hidden />
          </Button>
        </div>
      </div>
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-row bg-background">
        {diffHistoryOpen ? (
          <aside className="flex min-h-0 w-48 shrink-0 flex-col border-r border-border/60 bg-muted/10">
            <div className="flex h-8 items-center justify-between px-2">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="size-3" aria-hidden />
                <span>{lang === 'zh' ? '对比历史（点击回填）' : 'Compare history'}</span>
              </div>
              <Button type="button" variant="ghost" size="icon-sm" className="size-5 text-muted-foreground hover:text-foreground" aria-label={clearHistoryAria} onClick={onClearDiffHistory} disabled={diffHistoryClearDisabled}>
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-3" aria-hidden />
              </Button>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="flex flex-col gap-1 p-2">
                {diffHistoryItems.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">{emptyHistoryLabel}</p>
                ) : (
                  diffHistoryItems.map((item) => (
                    <div key={item.id} className="group/history-item relative">
                      <Button type="button" variant="outline" size="sm" className={cn('h-auto w-full justify-start px-2 py-1.5 text-left', activeDiffHistoryId === item.id && 'border-primary/50 bg-primary/10')} onClick={() => onUseDiffHistory(item)}>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5 pe-4">
                          <span className="text-[10px] text-muted-foreground">{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="truncate text-[11px] text-foreground/90">{item.input.replace(/\s+/g, ' ').trim() || '{}'}</span>
                        </div>
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm" className="absolute right-1 top-1.5 size-4.5 opacity-0 transition-opacity group-hover/history-item:opacity-100" aria-label={deleteHistoryAria} onClick={(e) => { e.stopPropagation(); onRemoveDiffHistoryItem(item.id) }}>
                        <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-3" aria-hidden />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </aside>
        ) : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <HighlightedTextarea
            value={diffInput}
            onChange={(value) => {
              onDiffInputChange(value)
            }}
            placeholder={placeholder}
            spellCheck={false}
            editorStyle={editorStyle}
          />
        </div>
      </div>
    </section>
  )
}
