import type { ComponentProps, CSSProperties, ReactNode } from 'react'
import { JsonTree } from '@/components/json-tree'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { buildInlineParts, type DiffRow } from '@/lib/diff-utils'
import type { TypeMode } from '@/lib/type-generator'
import type { Lang } from '@/lib/i18n'
import { HugeiconsIcon } from '@hugeicons/react'

type JsonTreeLines = ComponentProps<typeof JsonTree>['lines']
import {
  AlertCircleIcon,
  CodeIcon,
  GitCompareIcon,
} from '@hugeicons/core-free-icons'
import { HEAVY_DIFF_SKIP_EN, HEAVY_DIFF_SKIP_ZH } from '@/lib/heavy-input'

type DiffSideMeta =
  | { state: 'empty' }
  | { state: 'invalid' }
  | { state: 'ok'; lines: number }

type ConvertKind = 'yaml' | 'json' | 'plain' | 'csv'

export interface JsonexOutputStrings {
  placeholder: string
  shortcut: string
  expandAll: string
  collapseAll: string
}

export interface JsonexOutputBodyProps {
  lang: Lang
  workMode: 'format' | 'diff'
  editorStyle: CSSProperties

  convertResult: { text: string; kind: ConvertKind } | null
  highlightedConvertResult: string

  diffTooHeavy: boolean
  diffLeftMeta: DiffSideMeta
  diffRightMeta: DiffSideMeta
  canShowDiff: boolean
  diffSummary: { total: number; adds: number; removes: number; modifies: number }
  diffRows: DiffRow[]
  onFormatLeft: () => void
  onFillRightFromOutput: () => void
  onClearRight: () => void

  formatInput: string
  formatOutput: string
  formatDiffRight: string

  error?: string

  typeMode: TypeMode
  generatedType: string
  highlightedGeneratedType: string

  showTree: boolean
  treeLines: JsonTreeLines
  treeVisualIndent: number
  toggleTree: (path: string) => void

  highlightedOutput: string

  texts: JsonexOutputStrings
}

export function JsonexOutputBody(props: JsonexOutputBodyProps): ReactNode {
  const {
    lang,
    workMode,
    editorStyle,
    convertResult,
    highlightedConvertResult,
    diffTooHeavy,
    diffLeftMeta,
    diffRightMeta,
    canShowDiff,
    diffSummary,
    diffRows,
    onFormatLeft,
    onFillRightFromOutput,
    onClearRight,
    formatInput,
    formatOutput,
    formatDiffRight,
    error,
    typeMode,
    generatedType,
    highlightedGeneratedType,
    showTree,
    treeLines,
    treeVisualIndent,
    toggleTree,
    highlightedOutput,
    texts,
  } = props

  let outputInner: React.ReactNode
  if (workMode === 'format' && convertResult) {
    const rows = highlightedConvertResult.split('\n')
    outputInner = (
      <div className="px-3 py-3 pb-8 font-mono text-xs leading-relaxed" style={editorStyle}>
        {rows.map((row, idx) => (
          <div key={idx} className="flex min-h-5">
            <span className="w-10 shrink-0 select-none pe-3 text-right text-muted-foreground/70">{idx + 1}</span>
            <span
              className="min-w-0 flex-1 whitespace-pre-wrap wrap-break-word text-foreground"
              dangerouslySetInnerHTML={{ __html: row || ' ' }}
            />
          </div>
        ))}
      </div>
    )
  } else if (workMode === 'diff') {
    let leftLineNo = 0
    let rightLineNo = 0
    outputInner = (
      <div className="flex min-h-full min-w-0 flex-1 flex-col gap-3 px-3 py-3 pb-8">
        <div className="flex flex-wrap items-center gap-2">
          {(lang === 'zh'
            ? [
                { label: '左 · 格式化基准', meta: diffLeftMeta },
                { label: '右 · 格式化对比', meta: diffRightMeta },
              ]
            : [
                { label: 'Left · formatted', meta: diffLeftMeta },
                { label: 'Right · formatted', meta: diffRightMeta },
              ]
          ).map(({ label, meta }) => (
            <div
              key={label}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px]',
                meta.state === 'ok' && 'border-border/70 bg-muted/20 text-foreground/90',
                meta.state === 'empty' && 'border-dashed border-border/60 bg-background text-muted-foreground',
                meta.state === 'invalid' && 'border-destructive/40 bg-destructive/10 text-destructive',
              )}
            >
              <span className="font-medium uppercase tracking-wide">{label}</span>
              <span className="text-muted-foreground">
                {meta.state === 'empty'
                  ? lang === 'zh'
                    ? '未输入'
                    : 'Empty'
                  : meta.state === 'invalid'
                    ? lang === 'zh'
                      ? 'JSON 无效'
                      : 'Invalid JSON'
                    : lang === 'zh'
                      ? `${meta.lines} 行`
                      : `${meta.lines} lines`}
              </span>
            </div>
          ))}
          {diffLeftMeta.state === 'invalid' || diffRightMeta.state === 'invalid' ? (
            <span className="text-[11px] text-muted-foreground">
              {lang === 'zh'
                ? '无效的一侧不会参与比对，请先修正后再比较。'
                : 'Fix invalid JSON on that side before it can be compared.'}
            </span>
          ) : null}
        </div>

        {diffTooHeavy ? (
          <Alert className="rounded-lg border-amber-500/35 bg-amber-500/5">
            <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />
            <AlertDescription className="text-sm text-foreground/90">
              {lang === 'zh' ? HEAVY_DIFF_SKIP_ZH : HEAVY_DIFF_SKIP_EN}
            </AlertDescription>
          </Alert>
        ) : null}

        {!diffTooHeavy && canShowDiff ? (
          <div className="flex min-h-0 flex-col gap-2 overflow-hidden rounded-lg border border-border/60 bg-muted/5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-muted/15 px-3 py-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                <span className="text-foreground/80">{lang === 'zh' ? '并排差异' : 'Side-by-side'}</span>
                <span aria-hidden>|</span>
                <span>
                  {lang === 'zh' ? `合计 ${diffSummary.total}` : `Total ${diffSummary.total}`}{' '}
                  <span className="normal-case text-muted-foreground">
                    ({lang === 'zh' ? '增' : 'add'}{' '}
                    <span className="text-emerald-600/90 dark:text-emerald-400">+{diffSummary.adds}</span>
                    {' · '}
                    {lang === 'zh' ? '删' : 'del'}{' '}
                    <span className="text-rose-600/90 dark:text-rose-400">-{diffSummary.removes}</span>
                    {' · '}
                    {lang === 'zh' ? '改' : 'chg'}{' '}
                    <span className="text-amber-600/90 dark:text-amber-400">~{diffSummary.modifies}</span>)
                  </span>
                </span>
                <span className="hidden normal-case text-muted-foreground/80 md:inline">
                  {lang === 'zh' ? '− / + / ~ 表示删除、插入、替换' : '− / + / ~ : remove · insert · replace'}
                </span>
              </div>
            </div>
            <div className="min-h-48 px-2 pb-2 font-mono text-xs leading-relaxed" style={editorStyle}>
              <div className="sticky top-0 z-1 mb-px grid grid-cols-2 gap-0 rounded-t border-b border-border/60 bg-background/95 text-[10px] font-medium uppercase tracking-wide text-muted-foreground backdrop-blur-sm supports-backdrop-filter:bg-muted/75">
                <div className="border-r border-border/50 px-2 py-1.5">{lang === 'zh' ? '左侧 · 格式化' : 'Left · formatted'}</div>
                <div className="px-2 py-1.5">{lang === 'zh' ? '右侧 · 格式化' : 'Right · formatted'}</div>
              </div>
              {diffRows.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                  {lang === 'zh' ? '两边格式化后内容一致。' : 'No differences after formatting.'}
                </div>
              ) : (
                diffRows.map((row, idx) => {
                  const hasLeft = row.left !== undefined
                  const hasRight = row.right !== undefined
                  const leftNo = hasLeft ? ++leftLineNo : undefined
                  const rightNo = hasRight ? ++rightLineNo : undefined
                  const inlineParts = row.kind === 'modify' ? buildInlineParts(row.left ?? '', row.right ?? '') : null
                  return (
                    <div key={idx} className="grid grid-cols-2 gap-2">
                      <div
                        className={cn(
                          'flex min-h-5 rounded-sm px-1.5',
                          (row.kind === 'remove' || row.kind === 'modify') && 'bg-rose-500/10',
                        )}
                      >
                        <span className="w-8 shrink-0 select-none pe-2 text-right text-muted-foreground/70">{leftNo ?? ''}</span>
                        <span className="w-4 shrink-0 text-center text-muted-foreground/80">
                          {row.kind === 'remove' ? '-' : row.kind === 'modify' ? '~' : ' '}
                        </span>
                        <span className="min-w-0 flex-1 whitespace-pre-wrap wrap-break-word text-foreground">
                          {row.kind === 'modify' && inlineParts
                            ? inlineParts.left.map((part, partIdx) => (
                                <span key={partIdx} className={part.changed ? 'rounded-[2px] bg-rose-500/20' : undefined}>
                                  {part.text}
                                </span>
                              ))
                            : (row.left ?? '')}
                        </span>
                      </div>
                      <div
                        className={cn(
                          'flex min-h-5 rounded-sm px-1.5',
                          (row.kind === 'add' || row.kind === 'modify') && 'bg-emerald-500/10',
                        )}
                      >
                        <span className="w-8 shrink-0 select-none pe-2 text-right text-muted-foreground/70">{rightNo ?? ''}</span>
                        <span className="w-4 shrink-0 text-center text-muted-foreground/80">
                          {row.kind === 'add' ? '+' : row.kind === 'modify' ? '~' : ' '}
                        </span>
                        <span className="min-w-0 flex-1 whitespace-pre-wrap wrap-break-word text-foreground">
                          {row.kind === 'modify' && inlineParts
                            ? inlineParts.right.map((part, partIdx) => (
                                <span key={partIdx} className={part.changed ? 'rounded-[2px] bg-emerald-500/20' : undefined}>
                                  {part.text}
                                </span>
                              ))
                            : (row.right ?? '')}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        ) : null}

        {!diffTooHeavy && !canShowDiff ? (
          <Empty className="min-h-0 flex-1 justify-center rounded-lg bg-muted/5 py-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={GitCompareIcon} strokeWidth={2} aria-hidden />
              </EmptyMedia>
              <EmptyTitle>{lang === 'zh' ? '等待两侧有效 JSON' : 'Waiting for valid JSON on both sides'}</EmptyTitle>
              <EmptyDescription className="max-w-md text-pretty">
                {lang === 'zh'
                  ? '两侧都需为可解析的 JSON。在上方并排区域编辑左、右两侧的 JSON；两侧都会按当前缩进格式化后再对比。'
                  : 'Both sides need valid JSON. Edit the baseline (left) and compare (right) in the stacked split above; both are formatted with the current indent before diff.'}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="flex max-w-none flex-row flex-wrap justify-center gap-2">
              <Button type="button" variant="outline" size="sm" className="h-8 px-2.5 text-xs" onClick={onFormatLeft} disabled={!formatInput.trim()}>
                {lang === 'zh' ? '格式化左侧' : 'Format left'}
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-8 px-2.5 text-xs" onClick={onFillRightFromOutput} disabled={!formatOutput}>
                {lang === 'zh' ? '用左侧结果填入右侧对比' : 'Fill right from left result'}
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-8 px-2.5 text-xs text-muted-foreground" onClick={onClearRight} disabled={!formatDiffRight}>
                {lang === 'zh' ? '清空右侧' : 'Clear right'}
              </Button>
            </EmptyContent>
          </Empty>
        ) : null}
      </div>
    )
  } else if (error) {
    outputInner = (
      <Alert variant="destructive" className="mx-3 my-4 rounded-lg">
        <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} className="size-4" aria-hidden />
        <AlertDescription className="text-sm">{error}</AlertDescription>
      </Alert>
    )
  } else if (typeMode !== 'json' && generatedType) {
    const rows = highlightedGeneratedType.split('\n')
    outputInner = (
      <div className="px-3 py-3 pb-8 font-mono text-xs leading-relaxed" style={editorStyle}>
        {rows.map((row, idx) => (
          <div key={idx} className="flex min-h-5">
            <span className="w-10 shrink-0 select-none pe-3 text-right text-muted-foreground/70">{idx + 1}</span>
            <span
              className="min-w-0 flex-1 whitespace-pre-wrap wrap-break-word text-foreground"
              dangerouslySetInnerHTML={{ __html: row || ' ' }}
            />
          </div>
        ))}
      </div>
    )
  } else if (showTree) {
    outputInner = (
      <JsonTree lines={treeLines} indentSize={treeVisualIndent} onToggle={toggleTree} editorStyle={editorStyle} />
    )
  } else if (highlightedOutput) {
    const rows = highlightedOutput.split('\n')
    outputInner = (
      <div className="px-3 py-3 pb-8 font-mono text-xs leading-relaxed" style={editorStyle}>
        {rows.map((row, idx) => (
          <div key={idx} className="flex min-h-5">
            <span className="w-10 shrink-0 select-none pe-3 text-right text-muted-foreground/70">{idx + 1}</span>
            <span
              className="min-w-0 flex-1 whitespace-pre-wrap wrap-break-word text-foreground"
              dangerouslySetInnerHTML={{ __html: row || ' ' }}
            />
          </div>
        ))}
      </div>
    )
  } else {
    outputInner = (
      <Empty className="min-h-0 flex-1 justify-center rounded-lg bg-muted/5 py-6">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={CodeIcon} strokeWidth={2} aria-hidden />
          </EmptyMedia>
          <EmptyTitle>{texts.placeholder}</EmptyTitle>
          <EmptyDescription className="max-w-sm text-pretty">{texts.shortcut}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return outputInner
}
