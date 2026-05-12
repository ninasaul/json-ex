import { HighlightedTextarea } from '@/components/highlighted-textarea'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { HistoryItem } from '@/hooks/use-history'
import type { CSSProperties } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Clock01Icon,
  Delete02Icon,
  EraserIcon,
  FileUploadIcon,
  LeftToRightBlockQuoteIcon,
  Menu01Icon,
  Wrench01Icon,
} from '@hugeicons/core-free-icons'

export interface FormatSourcePanelProps {
  workMode: 'format' | 'diff'

  ariaLabelDiffLeft: string
  ariaLabelFormatSource: string
  headingDiffLeft: string
  headingFormat: string

  input: string
  onInputChange: (value: string) => void
  placeholderFormat: string
  placeholderDiffLeft: string

  editorStyle: CSSProperties

  historyOpen: boolean
  onToggleHistory: () => void
  historyItems: HistoryItem[]
  activeHistoryId: string | null
  onUseHistory: (item: HistoryItem) => void
  onClearHistory: () => void
  onRemoveHistoryItem: (id: string) => void
  historyClearDisabled: boolean
  historyTitleFormat: string
  historyTitleDiffBaseline: string

  onUploadClick: () => void
  onRepairInput: () => void
  onEscape: () => void
  onUnescape: () => void
  onClear: () => void

  escapeLabel: string
  unescapeLabel: string
  clearLabel: string
  emptyHistoryLabel: string
  clearHistoryAria: string
  deleteHistoryAria: string
  uploadAria: string
  repairAria: string
}

export function FormatSourcePanel(props: FormatSourcePanelProps) {
  const {
    workMode,
    ariaLabelDiffLeft,
    ariaLabelFormatSource,
    headingDiffLeft,
    headingFormat,
    input,
    onInputChange,
    placeholderFormat,
    placeholderDiffLeft,
    editorStyle,
    historyOpen,
    onToggleHistory,
    historyItems,
    activeHistoryId,
    onUseHistory,
    onClearHistory,
    onRemoveHistoryItem,
    historyClearDisabled,
    historyTitleFormat,
    historyTitleDiffBaseline,
    onUploadClick,
    onRepairInput,
    onEscape,
    onUnescape,
    onClear,
    escapeLabel,
    unescapeLabel,
    clearLabel,
    emptyHistoryLabel,
    clearHistoryAria,
    deleteHistoryAria,
    uploadAria,
    repairAria,
  } = props

  return (
    <section
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={workMode === 'diff' ? ariaLabelDiffLeft : ariaLabelFormatSource}
    >
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border/60 bg-muted/10 px-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {workMode === 'diff' ? headingDiffLeft : headingFormat}
        </h2>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon-sm" className="size-6 text-muted-foreground hover:text-foreground" aria-label={uploadAria} onClick={onUploadClick}>
                <HugeiconsIcon icon={FileUploadIcon} data-icon strokeWidth={2} className="size-3.5 shrink-0" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{uploadAria}</TooltipContent>
          </Tooltip>
          <ButtonGroup orientation="horizontal" className="h-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm" className="size-6 text-muted-foreground hover:text-foreground" onClick={onRepairInput} aria-label={repairAria}>
                  <HugeiconsIcon icon={Wrench01Icon} data-icon strokeWidth={2} className="size-3.5 shrink-0" aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{repairAria}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm" className="size-6 text-muted-foreground hover:text-foreground" onClick={onEscape} aria-label={escapeLabel}>
                  <HugeiconsIcon icon={LeftToRightBlockQuoteIcon} data-icon strokeWidth={2} className="size-3.5 shrink-0" aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{escapeLabel}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm" className="size-6 text-muted-foreground hover:text-foreground" onClick={onUnescape} aria-label={unescapeLabel}>
                  <HugeiconsIcon icon={LeftToRightBlockQuoteIcon} data-icon strokeWidth={2} className="size-3.5 shrink-0" aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{unescapeLabel}</TooltipContent>
            </Tooltip>
          </ButtonGroup>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon-sm" className="size-6 text-muted-foreground hover:text-foreground" aria-label={historyOpen ? 'Hide history' : 'Show history'} onClick={onToggleHistory}>
                <HugeiconsIcon icon={Menu01Icon} data-icon strokeWidth={2} className="size-3.5 shrink-0" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{historyOpen ? 'Hide history' : 'Show history'}</TooltipContent>
          </Tooltip>
          <Button type="button" variant="ghost" size="icon-sm" className="size-6 text-muted-foreground hover:text-foreground" aria-label={clearLabel} onClick={onClear}>
            <HugeiconsIcon icon={EraserIcon} data-icon strokeWidth={2} className="size-3.5 shrink-0" aria-hidden />
          </Button>
        </div>
      </div>
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-row bg-background">
        {historyOpen ? (
          <aside className="flex min-h-0 w-48 shrink-0 flex-col border-r border-border/60 bg-muted/10">
            <div className="flex h-8 items-center justify-between px-2">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="size-3" aria-hidden />
                <span>{workMode === 'diff' ? historyTitleDiffBaseline : historyTitleFormat}</span>
              </div>
              <Button type="button" variant="ghost" size="icon-sm" className="size-5 text-muted-foreground hover:text-foreground" aria-label={clearHistoryAria} onClick={onClearHistory} disabled={historyClearDisabled}>
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-3" aria-hidden />
              </Button>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="flex flex-col gap-1 p-2">
                {historyItems.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">{emptyHistoryLabel}</p>
                ) : (
                  historyItems.map((item) => (
                    <div key={item.id} className="group/history-item relative">
                      <Button type="button" variant="outline" size="sm" className={cn('h-auto w-full justify-start px-2 py-1.5 text-left', activeHistoryId === item.id && 'border-primary/50 bg-primary/10')} onClick={() => onUseHistory(item)}>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5 pe-4">
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="truncate text-[11px] text-foreground/90">{item.input.replace(/\s+/g, ' ').trim() || '{}'}</span>
                        </div>
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm" className="absolute right-1 top-1.5 size-4.5 opacity-0 transition-opacity group-hover/history-item:opacity-100" aria-label={deleteHistoryAria} onClick={(e) => { e.stopPropagation(); onRemoveHistoryItem(item.id) }}>
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
            placeholder={workMode === 'diff' ? placeholderDiffLeft : placeholderFormat}
            value={input}
            onChange={(value) => {
              onInputChange(value)
            }}
            spellCheck={false}
            editorStyle={editorStyle}
          />
        </div>
      </div>
    </section>
  )
}
