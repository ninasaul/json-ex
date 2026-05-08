import { useRef, useCallback, useMemo, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { HighlightedTextarea } from '@/components/highlighted-textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useJsonFormatter } from '@/lib/use-json-formatter'
import { useTheme } from '@/hooks/use-theme'
import { useI18n } from '@/hooks/use-i18n'
import { useHistory, type HistoryItem } from '@/hooks/use-history'
import { useAppSettings, type CodeTheme, type HeaderBarPosition } from '@/hooks/use-app-settings'
import { useActions } from '@/hooks/use-actions'
import { useJsonLines, JsonTree, useCollapse, collectPaths } from '@/components/json-tree'
import { Panel, Group, Separator as ResizeHandle } from 'react-resizable-panels'
import { generate, type TypeMode, type JsonValue } from '@/lib/type-generator'
import {
  formatJson,
  syntaxHighlightCode,
  syntaxHighlight,
  escapeJson,
  unescapeJson,
  repairJsonLike,
  resolveJsonIndent,
  type JsonFormatLineEnding,
  type JsonFormatStyleOptions,
} from '@/lib/json-utils'
import { buildDiffRows, buildInlineParts, formatDiffRowsForCopy, summarizeDiffRows } from '@/lib/diff-utils'
import {
  jsonToYaml,
  yamlToJson,
  jsonToQueryString,
  queryStringToJson,
  jsonToFormDataText,
  formDataTextToJson,
  jsonToCsv,
  csvToJson,
  suggestCsvPathsFromJson,
  syntaxHighlightYaml,
} from '@/lib/convert-utils'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { HugeiconsIcon } from '@hugeicons/react'
import { toast } from 'sonner'
import {
  SparklesIcon,
  ArrowShrinkIcon,
  Tick02Icon,
  Copy01Icon,
  EraserIcon,
  CodeIcon,
  LeftToRightBlockQuoteIcon,
  TextIndentIcon,
  Sun01Icon,
  MoonIcon,
  LanguageCircleIcon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  AlertCircleIcon,
  FileUploadIcon,
  FileDownloadIcon,
  Clock01Icon,
  Menu01Icon,
  Delete02Icon,
  Settings01Icon,
  Wrench01Icon,
  GitCompareIcon,
  PanelTopBottomDashedIcon,
  MaximizeScreenIcon,
  JavaScriptIcon,
  JavaIcon,
  PythonIcon,
  PhpIcon,
  Typescript01Icon,
  FunctionIcon,
  ChipIcon,
  DatabaseIcon,
  SourceCodeIcon,
  AiChipIcon,
  CodeSquareIcon,
} from '@hugeicons/core-free-icons'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function syntaxHighlightQueryString(text: string): string {
  const src = escapeHtml(text)
  return src
    .split('&')
    .map((pair) => {
      const idx = pair.indexOf('=')
      if (idx < 0) return `<span class="code-keyword">${pair}</span>`
      const key = pair.slice(0, idx)
      const value = pair.slice(idx + 1)
      return `<span class="code-keyword">${key}</span>=<span class="code-string">${value}</span>`
    })
    .join('<span class="text-muted-foreground">&amp;</span>')
}

function syntaxHighlightCsv(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  return lines.map((line, idx) => {
    const escaped = escapeHtml(line)
    const cols = escaped.split(',')
    if (idx === 0) return cols.map((c) => `<span class="code-keyword">${c}</span>`).join('<span class="json-bracket">,</span>')
    return cols.map((c) => `<span class="code-string">${c}</span>`).join('<span class="json-bracket">,</span>')
  }).join('\n')
}

const HISTORY_KEY = 'jsonex-history'
const DIFF_HISTORY_KEY = 'jsonex-history-diff'
const HISTORY_LIMIT = 30
const SETTINGS_KEY = 'jsonex-settings'

function chromeExtensionWindowApiAvailable(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    typeof chrome.runtime !== 'undefined' &&
    Boolean(chrome.runtime.id) &&
    typeof chrome.windows !== 'undefined' &&
    typeof chrome.windows.create === 'function'
  )
}

function App() {
  const { lang, t, toggleLang } = useI18n()
  const { theme, toggleTheme } = useTheme()
  const { collapsed, toggle, collapseAll, expandAll } = useCollapse()

  const hasCollapsed = Object.keys(collapsed).length > 0

  const { settings, setSettings, derived } = useAppSettings(SETTINGS_KEY)

  const jsonFormatStyle: JsonFormatStyleOptions = useMemo(
    () => ({
      indentSpaces: settings.formatIndentSpaces,
      useTabIndent: settings.formatUseTabIndent,
      lineEnding: settings.formatLineEnding,
      trailingNewline: settings.formatTrailingNewline,
    }),
    [
      settings.formatIndentSpaces,
      settings.formatUseTabIndent,
      settings.formatLineEnding,
      settings.formatTrailingNewline,
    ],
  )

  const formatIndentUnit = useMemo(() => resolveJsonIndent(jsonFormatStyle), [jsonFormatStyle])

  const treeVisualIndent = settings.formatUseTabIndent ? 4 : settings.formatIndentSpaces

  const {
    input,
    setInput,
    output,
    error,
    parsedData,
    highlightedOutput,
    copied,
    handleFormat,
    handleMinify,
    handleCopy,
    handleEscape,
    handleUnescape,
    handleClear,
    formatMode,
  } = useJsonFormatter(lang, settings.autoFormat, jsonFormatStyle)

  const indentSettingLabel = settings.formatUseTabIndent
    ? 'Tab'
    : String(settings.formatIndentSpaces)

  const handleIndentSpacesChange = useCallback((size: 2 | 4 | 8) => {
    setSettings((prev) => ({
      ...prev,
      formatIndentSpaces: size,
      formatUseTabIndent: false,
    }))
  }, [])

  const handleIndentTabSelect = useCallback(() => {
    setSettings((prev) => ({ ...prev, formatUseTabIndent: true }))
  }, [])

  const outputRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputDiffRef = useRef<HTMLInputElement>(null)

  const showTree = formatMode === 'formatted' && parsedData !== undefined
  const lines = useJsonLines(showTree ? parsedData : undefined, collapsed)

  const allPaths = useMemo(() => {
    if (!showTree || parsedData === undefined) return []
    return collectPaths(parsedData, '$')
  }, [parsedData, showTree])

  const handleToggleCollapse = useCallback(() => {
    if (hasCollapsed) expandAll()
    else collapseAll(allPaths)
  }, [hasCollapsed, expandAll, collapseAll, allPaths])

  const [typeMode, setTypeMode] = useState<TypeMode>(derived.defaultTypeMode)
  const [historyOpen, setHistoryOpen] = useState(derived.historyDefaultOpen)
  const [workMode, setWorkMode] = useState<'format' | 'diff'>('format')
  const [diffInput, setDiffInput] = useState('')
  const [diffIgnoreWhitespace, setDiffIgnoreWhitespace] = useState(true)
  const [diffOnlyChanges, setDiffOnlyChanges] = useState(false)
  const [diffCopied, setDiffCopied] = useState(false)
  const [diffHistoryOpen, setDiffHistoryOpen] = useState(false)
  const [a11yError, setA11yError] = useState<string | null>(null)
  const [convertResult, setConvertResult] = useState<{ text: string; ext: 'yml' | 'json' | 'txt' | 'csv'; kind: 'yaml' | 'json' | 'plain' | 'csv' } | null>(null)
  const [csvPath, setCsvPath] = useState('')
  const [csvPathQuery, setCsvPathQuery] = useState('')

  const getConvertSource = useCallback((kinds?: Array<'yaml' | 'json' | 'plain' | 'csv'>) => {
    if (!convertResult) return input
    if (!kinds || kinds.includes(convertResult.kind)) return convertResult.text
    return input
  }, [convertResult, input])

  const runConvert = useCallback(
    (action: () => { text: string }, success: { ext: 'yml' | 'json' | 'txt' | 'csv'; kind: 'yaml' | 'json' | 'plain' | 'csv' }, errorMsgZh: string, errorMsgEn: string) => {
      try {
        const res = action()
        setConvertResult({ text: res.text, ext: success.ext, kind: success.kind })
        setA11yError(null)
      } catch {
        const msg = lang === 'zh' ? errorMsgZh : errorMsgEn
        setA11yError(msg)
        toast.error(msg)
      }
    },
    [lang],
  )

  const generatedType = useMemo(() => {
    if (typeMode === 'json' || parsedData === undefined) return ''
    return generate(parsedData as JsonValue, typeMode)
  }, [parsedData, typeMode])

  const highlightedGeneratedType = useMemo(() => {
    if (!generatedType || typeMode === 'json') return ''
    return syntaxHighlightCode(generatedType, typeMode)
  }, [generatedType, typeMode])

  const editorStyle = useMemo(
    () => ({ fontSize: `${settings.editorFontSize}px`, lineHeight: 1.6 }),
    [settings.editorFontSize],
  )
  const diffBaseText = useMemo(() => {
    const trimmed = input.trim()
    if (!trimmed) return ''
    const result = formatJson(input, formatIndentUnit, () => '')
    return result.error ? '' : result.formatted
  }, [input, formatIndentUnit])

  const diffTargetText = useMemo(() => {
    const trimmed = diffInput.trim()
    if (!trimmed) return ''
    const result = formatJson(diffInput, formatIndentUnit, () => '')
    return result.error ? '' : result.formatted
  }, [diffInput, formatIndentUnit])

  const formatHistory = useHistory({
    storageKey: HISTORY_KEY,
    limit: HISTORY_LIMIT,
    enabled: workMode === 'format',
    input,
    output,
    canRecord: !error,
  })

  const diffHistory = useHistory({
    storageKey: DIFF_HISTORY_KEY,
    limit: HISTORY_LIMIT,
    enabled: workMode === 'diff',
    input: diffInput,
    output: diffTargetText,
    canRecord: true,
  })

  const diffRowsAll = useMemo(
    () => buildDiffRows(diffBaseText, diffTargetText, diffIgnoreWhitespace),
    [diffBaseText, diffTargetText, diffIgnoreWhitespace],
  )

  const diffRows = useMemo(
    () => (diffOnlyChanges ? diffRowsAll.filter((row) => row.kind !== 'context') : diffRowsAll),
    [diffOnlyChanges, diffRowsAll],
  )

  const diffSummary = useMemo(() => summarizeDiffRows(diffRowsAll), [diffRowsAll])

  const actions = useActions({
    lang,
    setA11yError,
    fileInputRef,
    fileInputDiffRef,
    onUploadLeft: (text) => {
      setConvertResult(null)
      setInput(text)
    },
    onUploadRight: (text) => setDiffInput(text),
    clearLeftActiveHistory: () => formatHistory.setActiveId(null),
    clearRightActiveHistory: () => diffHistory.setActiveId(null),
  })

  const handleCopyDiff = useCallback(async () => {
    await actions.copyText(formatDiffRowsForCopy(diffRowsAll), () => {
      setDiffCopied(true)
      setTimeout(() => setDiffCopied(false), 1500)
    })
  }, [actions, diffRowsAll])

  const canShowDiff = !!diffBaseText && !!diffTargetText

  const diffLeftMeta = useMemo(() => {
    const trimmed = input.trim()
    if (!trimmed) return { state: 'empty' as const }
    if (!diffBaseText) return { state: 'invalid' as const }
    return { state: 'ok' as const, lines: diffBaseText.split('\n').length }
  }, [input, diffBaseText])

  const diffRightMeta = useMemo(() => {
    const trimmed = diffInput.trim()
    if (!trimmed) return { state: 'empty' as const }
    if (!diffTargetText) return { state: 'invalid' as const }
    return { state: 'ok' as const, lines: diffTargetText.split('\n').length }
  }, [diffInput, diffTargetText])

  const typeModes: { mode: TypeMode; label: string }[] = [
    { mode: 'json', label: t.typeJson },
    { mode: 'ts', label: t.typeTs },
    { mode: 'java', label: t.typeJava },
    { mode: 'python', label: t.typePython },
    { mode: 'go', label: t.typeGo },
    { mode: 'csharp', label: t.typeCsharp },
    { mode: 'rust', label: t.typeRust },
    { mode: 'kotlin', label: t.typeKotlin },
    { mode: 'php', label: t.typePhp },
    { mode: 'swift', label: t.typeSwift },
    { mode: 'ruby', label: t.typeRuby },
    { mode: 'cpp', label: t.typeCpp },
  ]

  const typeModeIcons: Record<TypeMode, typeof CodeIcon> = {
    json: CodeSquareIcon,
    ts: Typescript01Icon,
    java: JavaIcon,
    python: PythonIcon,
    go: FunctionIcon,
    csharp: ChipIcon,
    rust: SourceCodeIcon,
    kotlin: AiChipIcon,
    php: PhpIcon,
    swift: DatabaseIcon,
    ruby: JavaScriptIcon,
    cpp: CodeIcon,
  }

  const [typeCopied, setTypeCopied] = useState(false)

  const handleCopyOutput = useCallback(async () => {
    const text = convertResult?.text ?? (typeMode === 'json' ? output : generatedType)
    if (!text) return
    if (!convertResult && typeMode === 'json') {
      handleCopy()
      return
    }
    await actions.copyText(text, () => {
      setTypeCopied(true)
      setTimeout(() => setTypeCopied(false), 2000)
    })
  }, [typeMode, output, generatedType, handleCopy, actions, convertResult])

  const copiedNow = typeMode === 'json' ? copied : typeCopied
  const downloadableText = convertResult?.text ?? (typeMode === 'json' ? output : generatedType)

  useEffect(() => {
    setHistoryOpen(derived.historyDefaultOpen)
    setTypeMode(derived.defaultTypeMode)
  }, [derived.defaultTypeMode, derived.historyDefaultOpen])

  useEffect(() => {
    if (workMode === 'diff') setHistoryOpen(false)
    else setDiffHistoryOpen(false)
  }, [workMode])

  useEffect(() => {
    if (workMode === 'diff' && convertResult) {
      setConvertResult(null)
    }
  }, [workMode, convertResult])

  const handleUploadClick = actions.handleUploadClick
  const handleUploadFile = actions.handleUploadFile
  const handleUploadClickDiff = actions.handleUploadClickDiff
  const handleUploadFileDiff = actions.handleUploadFileDiff

  const handleDiffEscape = useCallback(() => {
    setDiffInput(escapeJson(diffInput))
  }, [diffInput])

  const handleRepairInput = useCallback(() => {
    const result = repairJsonLike(input, formatIndentUnit)
    if (result.error) {
      const msg = lang === 'zh' ? '自动修复失败，请手动调整后再试。' : 'Auto-fix failed. Please adjust JSON manually and retry.'
      setA11yError(msg)
      toast.error(msg)
      return
    }
    setInput(result.formatted)
    setConvertResult(null)
    formatHistory.setActiveId(null)
    setA11yError(null)
    const labelsZh: Record<string, string> = {
      'json5-compat': 'JSON5 兼容解析',
      'remove-comments': '移除注释',
      'remove-trailing-commas': '移除尾逗号',
      'quote-unquoted-keys': '补全 key 引号',
      'single-to-double-quotes': '单引号转双引号',
    }
    const labelsEn: Record<string, string> = {
      'json5-compat': 'JSON5 compatible parse',
      'remove-comments': 'comments removed',
      'remove-trailing-commas': 'trailing commas removed',
      'quote-unquoted-keys': 'unquoted keys fixed',
      'single-to-double-quotes': 'single quotes normalized',
    }
    const repairs = result.repairs ?? []
    const detail = repairs.length
      ? (lang === 'zh'
          ? `（${repairs.map((k) => labelsZh[k] ?? k).join('、')}）`
          : ` (${repairs.map((k) => labelsEn[k] ?? k).join(', ')})`)
      : ''
    toast.success(`${lang === 'zh' ? '已自动修复 JSON' : 'JSON auto-repaired'}${detail}`)
    window.setTimeout(() => {
      handleFormat()
    }, 0)
  }, [input, formatIndentUnit, lang, formatHistory, setInput, handleFormat])

  const handleDiffUnescape = useCallback(() => {
    setDiffInput(unescapeJson(diffInput))
  }, [diffInput])

  const handleDiffClear = useCallback(() => {
    setDiffInput('')
    diffHistory.setActiveId(null)
  }, [])

  const handleDownload = useCallback(() => {
    if (!downloadableText) return
    if (convertResult) {
      actions.downloadRaw(convertResult.text, convertResult.ext)
      return
    }
    actions.downloadText(downloadableText, typeMode)
  }, [actions, downloadableText, typeMode, convertResult])

  const handleConvertJsonToYaml = useCallback(() => {
    runConvert(
      () => jsonToYaml(getConvertSource(['json'])),
      { ext: 'yml', kind: 'yaml' },
      '转换失败：请确保左侧是有效 JSON。',
      'Convert failed: make sure the left side is valid JSON.',
    )
  }, [getConvertSource, runConvert])

  const handleConvertYamlToJson = useCallback(() => {
    runConvert(
      () => yamlToJson(getConvertSource(['yaml']), formatIndentUnit),
      { ext: 'json', kind: 'json' },
      '转换失败：请确保左侧是有效 YAML。',
      'Convert failed: make sure the left side is valid YAML.',
    )
  }, [getConvertSource, formatIndentUnit, runConvert])

  const handleConvertJsonToQueryString = useCallback(() => {
    runConvert(
      () => jsonToQueryString(getConvertSource(['json'])),
      { ext: 'txt', kind: 'plain' },
      '转换失败：请确保左侧是有效 JSON 对象。',
      'Convert failed: make sure the left side is a valid JSON object.',
    )
  }, [getConvertSource, runConvert])

  const handleConvertQueryStringToJson = useCallback(() => {
    runConvert(
      () => queryStringToJson(getConvertSource(['plain']), formatIndentUnit),
      { ext: 'json', kind: 'json' },
      '转换失败：请确保左侧是有效 QueryString。',
      'Convert failed: make sure the left side is valid query string.',
    )
  }, [getConvertSource, formatIndentUnit, runConvert])

  const handleConvertJsonToFormData = useCallback(() => {
    runConvert(
      () => jsonToFormDataText(getConvertSource(['json'])),
      { ext: 'txt', kind: 'plain' },
      '转换失败：请确保左侧是有效 JSON 对象。',
      'Convert failed: make sure the left side is a valid JSON object.',
    )
  }, [getConvertSource, runConvert])

  const handleConvertFormDataToJson = useCallback(() => {
    runConvert(
      () => formDataTextToJson(getConvertSource(['plain']), formatIndentUnit),
      { ext: 'json', kind: 'json' },
      '转换失败：请确保左侧是有效 FormData 文本。',
      'Convert failed: make sure the left side is valid form-data text.',
    )
  }, [getConvertSource, formatIndentUnit, runConvert])

  const handleConvertJsonToCsv = useCallback(() => {
    const source = getConvertSource(['json'])
    try {
      const res = jsonToCsv(source, { path: csvPath.trim() || undefined })
      setConvertResult({ text: res.text, ext: 'csv', kind: 'csv' })
      setA11yError(null)
    } catch {
      const suggestions = suggestCsvPathsFromJson(source).filter((p) => p !== '$')
      if (suggestions.length > 0 && !csvPath.trim()) {
        setCsvPath(suggestions[0])
      }
      const msg = lang === 'zh'
        ? `转换失败：请确保左侧是对象数组，或 path 指向对象数组。${suggestions[0] ? ` 可尝试：${suggestions[0]}` : ''}`
        : `Convert failed: source must be an array of objects, or path points to one.${suggestions[0] ? ` Try: ${suggestions[0]}` : ''}`
      setA11yError(msg)
      toast.error(msg)
    }
  }, [getConvertSource, csvPath, lang])

  const handleConvertCsvToJson = useCallback(() => {
    runConvert(
      () => csvToJson(getConvertSource(['csv']), formatIndentUnit),
      { ext: 'json', kind: 'json' },
      '转换失败：请确保左侧是有效 CSV。',
      'Convert failed: make sure the left side is valid CSV.',
    )
  }, [getConvertSource, formatIndentUnit, runConvert])

  const highlightedConvertResult = useMemo(() => {
    if (!convertResult) return ''
    if (convertResult.kind === 'json') return syntaxHighlight(convertResult.text)
    if (convertResult.kind === 'yaml') return syntaxHighlightYaml(convertResult.text)
    if (convertResult.kind === 'csv') return syntaxHighlightCsv(convertResult.text)
    return syntaxHighlightQueryString(convertResult.text)
  }, [convertResult])

  const csvPathSuggestions = useMemo(() => {
    return suggestCsvPathsFromJson(getConvertSource(['json']))
  }, [getConvertSource])

  const filteredCsvPathSuggestions = useMemo(() => {
    const q = csvPathQuery.trim().toLowerCase()
    if (!q) return csvPathSuggestions
    return csvPathSuggestions.filter((p) => p.toLowerCase().includes(q))
  }, [csvPathSuggestions, csvPathQuery])

  const handleUseHistory = useCallback((item: HistoryItem) => {
    formatHistory.useItem(item, (value) => setInput(value))
  }, [formatHistory, setInput])

  const handleClearHistory = useCallback(() => {
    formatHistory.clear()
  }, [formatHistory])

  const handleRemoveHistoryItem = useCallback((id: string) => {
    formatHistory.remove(id)
  }, [formatHistory])

  const handleUseDiffHistory = useCallback((item: HistoryItem) => {
    diffHistory.useItem(item, (value) => setDiffInput(value))
  }, [diffHistory])

  const handleClearDiffHistory = useCallback(() => {
    diffHistory.clear()
  }, [diffHistory])

  const handleRemoveDiffHistoryItem = useCallback((id: string) => {
    diffHistory.remove(id)
  }, [diffHistory])

  const canOpenExtensionFullscreenWindow = useMemo(() => chromeExtensionWindowApiAvailable(), [])

  const handleOpenExtensionFullscreenWindow = actions.openFullscreenWindow

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
          {(lang === 'zh' ? [
            { label: '左 · 格式化基准', meta: diffLeftMeta },
            { label: '右 · 格式化对比', meta: diffRightMeta },
          ] : [
            { label: 'Left · formatted', meta: diffLeftMeta },
            { label: 'Right · formatted', meta: diffRightMeta },
          ]).map(({ label, meta }) => (
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
                  ? (lang === 'zh' ? '未输入' : 'Empty')
                  : meta.state === 'invalid'
                    ? (lang === 'zh' ? 'JSON 无效' : 'Invalid JSON')
                    : (lang === 'zh' ? `${meta.lines} 行` : `${meta.lines} lines`)}
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

        {canShowDiff ? (
          <div className="flex min-h-0 flex-col gap-2 overflow-hidden rounded-lg border border-border/60 bg-muted/5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-muted/15 px-3 py-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                <span className="text-foreground/80">{lang === 'zh' ? '并排差异' : 'Side-by-side'}</span>
                <span aria-hidden>|</span>
                <span>
                  {lang === 'zh' ? `合计 ${diffSummary.total}` : `Total ${diffSummary.total}`}{' '}
                  <span className="normal-case text-muted-foreground">
                    ({lang === 'zh' ? '增' : 'add'} <span className="text-emerald-600/90 dark:text-emerald-400">+{diffSummary.adds}</span>
                    {' · '}{lang === 'zh' ? '删' : 'del'} <span className="text-rose-600/90 dark:text-rose-400">-{diffSummary.removes}</span>
                    {' · '}{lang === 'zh' ? '改' : 'chg'} <span className="text-amber-600/90 dark:text-amber-400">~{diffSummary.modifies}</span>)
                  </span>
                </span>
                <span className="hidden normal-case text-muted-foreground/80 md:inline">
                  {lang === 'zh'
                    ? '− / + / ~ 表示删除、插入、替换'
                    : '− / + / ~ : remove · insert · replace'}
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
            ) : diffRows.map((row, idx) => {
              const hasLeft = row.left !== undefined
              const hasRight = row.right !== undefined
              const leftNo = hasLeft ? ++leftLineNo : undefined
              const rightNo = hasRight ? ++rightLineNo : undefined
              const inlineParts = row.kind === 'modify'
                ? buildInlineParts(row.left ?? '', row.right ?? '')
                : null
              return (
                <div
                  key={idx}
                  className={cn(
                    'grid grid-cols-2 gap-2',
                  )}
                >
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
                            <span
                              key={partIdx}
                              className={part.changed ? 'rounded-[2px] bg-rose-500/20' : undefined}
                            >
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
                            <span
                              key={partIdx}
                              className={part.changed ? 'rounded-[2px] bg-emerald-500/20' : undefined}
                            >
                              {part.text}
                            </span>
                          ))
                        : (row.right ?? '')}
                    </span>
                  </div>
                </div>
              )
            })}
            </div>
          </div>
        ) : (
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
              <Button type="button" variant="outline" size="sm" className="h-8 px-2.5 text-xs" onClick={handleFormat} disabled={!input.trim()}>
                {lang === 'zh' ? '格式化左侧' : 'Format left'}
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-8 px-2.5 text-xs" onClick={() => setDiffInput(output)} disabled={!output}>
                {lang === 'zh' ? '用左侧结果填入右侧对比' : 'Fill right from left result'}
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-8 px-2.5 text-xs text-muted-foreground" onClick={() => setDiffInput('')} disabled={!diffInput}>
                {lang === 'zh' ? '清空右侧' : 'Clear right'}
              </Button>
            </EmptyContent>
          </Empty>
        )}
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
    outputInner = <JsonTree lines={lines} indentSize={treeVisualIndent} onToggle={toggle} editorStyle={editorStyle} />
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
          <EmptyTitle>{t.placeholder}</EmptyTitle>
          <EmptyDescription className="max-w-sm text-pretty">{t.shortcut}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const sourceSection = (
            <section
              className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label={workMode === 'diff' ? (lang === 'zh' ? 'Diff 左侧基准 JSON' : 'Diff left baseline JSON') : t.panelSourceAria}
            >
              <div className="flex h-10 shrink-0 items-center justify-between border-b border-border/60 bg-muted/10 px-3">
                <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  {workMode === 'diff' ? (lang === 'zh' ? '基准（左）' : 'Baseline (left)') : t.input}
                </h2>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon-sm" className="size-6 text-muted-foreground hover:text-foreground" aria-label={lang === 'zh' ? '上传' : 'Upload'} onClick={handleUploadClick}>
                        <HugeiconsIcon icon={FileUploadIcon} data-icon strokeWidth={2} className="size-3.5 shrink-0" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{lang === 'zh' ? '上传' : 'Upload'}</TooltipContent>
                  </Tooltip>
                  <ButtonGroup orientation="horizontal" className="h-6">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button type="button" variant="ghost" size="icon-sm" className="size-6 text-muted-foreground hover:text-foreground" onClick={handleRepairInput} aria-label={lang === 'zh' ? '修复 JSON' : 'Fix JSON'}>
                          <HugeiconsIcon icon={Wrench01Icon} data-icon strokeWidth={2} className="size-3.5 shrink-0" aria-hidden />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">{lang === 'zh' ? '修复 JSON' : 'Fix JSON'}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button type="button" variant="ghost" size="icon-sm" className="size-6 text-muted-foreground hover:text-foreground" onClick={handleEscape} aria-label={t.escape}>
                          <HugeiconsIcon icon={LeftToRightBlockQuoteIcon} data-icon strokeWidth={2} className="size-3.5 shrink-0" aria-hidden />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">{t.escape}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button type="button" variant="ghost" size="icon-sm" className="size-6 text-muted-foreground hover:text-foreground" onClick={handleUnescape} aria-label={t.unescape}>
                          <HugeiconsIcon icon={LeftToRightBlockQuoteIcon} data-icon strokeWidth={2} className="size-3.5 shrink-0" aria-hidden />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">{t.unescape}</TooltipContent>
                    </Tooltip>
                  </ButtonGroup>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon-sm" className="size-6 text-muted-foreground hover:text-foreground" aria-label={historyOpen ? 'Hide history' : 'Show history'} onClick={() => setHistoryOpen((prev) => !prev)}>
                        <HugeiconsIcon icon={Menu01Icon} data-icon strokeWidth={2} className="size-3.5 shrink-0" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{historyOpen ? 'Hide history' : 'Show history'}</TooltipContent>
                  </Tooltip>
                  <Button type="button" variant="ghost" size="icon-sm" className="size-6 text-muted-foreground hover:text-foreground" aria-label={t.clear} onClick={handleClear}>
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
                        <span>
                          {workMode === 'diff'
                            ? (lang === 'zh' ? '基准历史（点击回填）' : 'Baseline history')
                            : (lang === 'zh' ? '历史记录（点击回填）' : 'History')}
                        </span>
                      </div>
                      <Button type="button" variant="ghost" size="icon-sm" className="size-5 text-muted-foreground hover:text-foreground" aria-label={lang === 'zh' ? '清空历史' : 'Clear history'} onClick={handleClearHistory} disabled={formatHistory.items.length === 0}>
                        <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-3" aria-hidden />
                      </Button>
                    </div>
                    <ScrollArea className="min-h-0 flex-1">
                      <div className="flex flex-col gap-1 p-2">
                        {formatHistory.items.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground">{lang === 'zh' ? '暂无记录' : 'No history yet'}</p>
                        ) : (
                          formatHistory.items.map((item) => (
                            <div key={item.id} className="group/history-item relative">
                              <Button type="button" variant="outline" size="sm" className={cn('h-auto w-full justify-start px-2 py-1.5 text-left', formatHistory.activeId === item.id && 'border-primary/50 bg-primary/10')} onClick={() => handleUseHistory(item)}>
                                <div className="flex min-w-0 flex-1 flex-col gap-0.5 pe-4">
                                  <span className="text-[10px] text-muted-foreground">
                                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  <span className="truncate text-[11px] text-foreground/90">{item.input.replace(/\s+/g, ' ').trim() || '{}'}</span>
                                </div>
                              </Button>
                              <Button type="button" variant="ghost" size="icon-sm" className="absolute right-1 top-1.5 size-4.5 opacity-0 transition-opacity group-hover/history-item:opacity-100" aria-label={lang === 'zh' ? '删除' : 'Delete'} onClick={(e) => { e.stopPropagation(); handleRemoveHistoryItem(item.id) }}>
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
                    placeholder={workMode === 'diff' ? (lang === 'zh' ? '左侧 JSON…' : 'Left JSON…') : t.placeholder}
                    value={input}
                    onChange={(value) => {
                      setInput(value)
                        if (formatHistory.activeId) formatHistory.setActiveId(null)
                    }}
                    spellCheck={false}
                    editorStyle={editorStyle}
                  />
                </div>
              </div>
            </section>
  )

  const compareRightSection = (
    <section
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden outline-none bg-background focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={lang === 'zh' ? '对比 JSON（右）' : 'Compare JSON (right)'}
    >
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border/60 bg-muted/10 px-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{lang === 'zh' ? '对比（右）' : 'Compare (right)'}</h2>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon-sm" className="size-6 text-muted-foreground hover:text-foreground" aria-label={lang === 'zh' ? '上传' : 'Upload'} onClick={handleUploadClickDiff}>
                <HugeiconsIcon icon={FileUploadIcon} data-icon strokeWidth={2} className="size-3.5 shrink-0" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{lang === 'zh' ? '上传' : 'Upload'}</TooltipContent>
          </Tooltip>
          <ButtonGroup orientation="horizontal" className="h-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm" className="size-6 text-muted-foreground hover:text-foreground" onClick={handleDiffEscape} aria-label={t.escape}>
                  <HugeiconsIcon icon={LeftToRightBlockQuoteIcon} data-icon strokeWidth={2} className="size-3.5 shrink-0" aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t.escape}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm" className="size-6 text-muted-foreground hover:text-foreground" onClick={handleDiffUnescape} aria-label={t.unescape}>
                  <HugeiconsIcon icon={LeftToRightBlockQuoteIcon} data-icon strokeWidth={2} className="size-3.5 shrink-0" aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t.unescape}</TooltipContent>
            </Tooltip>
          </ButtonGroup>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon-sm" className="size-6 text-muted-foreground hover:text-foreground" aria-label={diffHistoryOpen ? 'Hide history' : 'Show history'} onClick={() => setDiffHistoryOpen((prev) => !prev)}>
                <HugeiconsIcon icon={Menu01Icon} data-icon strokeWidth={2} className="size-3.5 shrink-0" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{diffHistoryOpen ? 'Hide history' : 'Show history'}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-6 max-w-30 shrink-0 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => setDiffInput(output)} disabled={!output}>
                {lang === 'zh' ? '← 左侧结果' : '← Left'}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{lang === 'zh' ? '用左侧格式化结果填入右侧' : 'Fill right from left formatted output'}</TooltipContent>
          </Tooltip>
          <Button type="button" variant="ghost" size="icon-sm" className="size-6 text-muted-foreground hover:text-foreground" aria-label={t.clear} onClick={handleDiffClear}>
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
              <Button type="button" variant="ghost" size="icon-sm" className="size-5 text-muted-foreground hover:text-foreground" aria-label={lang === 'zh' ? '清空历史' : 'Clear history'} onClick={handleClearDiffHistory} disabled={diffHistory.items.length === 0}>
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-3" aria-hidden />
              </Button>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="flex flex-col gap-1 p-2">
                {diffHistory.items.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">{lang === 'zh' ? '暂无记录' : 'No history yet'}</p>
                ) : (
                  diffHistory.items.map((item) => (
                    <div key={item.id} className="group/history-item relative">
                      <Button type="button" variant="outline" size="sm" className={cn('h-auto w-full justify-start px-2 py-1.5 text-left', diffHistory.activeId === item.id && 'border-primary/50 bg-primary/10')} onClick={() => handleUseDiffHistory(item)}>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5 pe-4">
                          <span className="text-[10px] text-muted-foreground">{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="truncate text-[11px] text-foreground/90">{item.input.replace(/\s+/g, ' ').trim() || '{}'}</span>
                        </div>
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm" className="absolute right-1 top-1.5 size-4.5 opacity-0 transition-opacity group-hover/history-item:opacity-100" aria-label={lang === 'zh' ? '删除' : 'Delete'} onClick={(e) => { e.stopPropagation(); handleRemoveDiffHistoryItem(item.id) }}>
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
              setDiffInput(value)
              if (diffHistory.activeId) diffHistory.setActiveId(null)
            }}
            placeholder={lang === 'zh' ? '右侧 JSON…' : 'Right JSON…'}
            spellCheck={false}
            editorStyle={editorStyle}
          />
        </div>
      </div>
    </section>
  )

  const splitColHandleClass = cn(
    'relative z-10 w-px min-w-px shrink-0 cursor-col-resize bg-border outline-none',
    'hover:bg-muted-foreground/40 focus-visible:bg-muted-foreground/45 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  )
  const splitRowHandleClass = cn(
    'relative z-10 h-px min-h-px shrink-0 cursor-row-resize bg-border outline-none',
    'hover:bg-muted-foreground/40 focus-visible:bg-muted-foreground/45 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  )

  const resultWorkspace = (
          <Panel
            id="panel-result"
            defaultSize={48}
            minSize={22}
            className="flex min-h-0 min-w-0 flex-col overflow-hidden"
            style={{ overflow: 'hidden' }}
          >
            <section
              className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
              aria-label={workMode === 'diff' ? (lang === 'zh' ? 'Diff 比较工作台' : 'Diff comparison workspace') : t.panelResultAria}
            >
              <div className="shrink-0 border-b border-border/60 bg-muted/10 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    {workMode === 'diff' ? (lang === 'zh' ? '比对结果' : 'Diff result') : (lang === 'zh' ? '格式化结果' : 'Formatted Result')}
                  </div>
                  <div role="toolbar" aria-label={t.actionsToolbar} className="flex min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-1.5">
                    {workMode === 'format' ? (
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button type="button" variant="default" size="icon-sm" className="size-6" onClick={handleFormat} aria-label={t.format}>
                              <HugeiconsIcon icon={SparklesIcon} data-icon strokeWidth={2} className="size-3.5 shrink-0" aria-hidden />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">{t.format}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button type="button" variant="secondary" size="icon-sm" className="size-6" onClick={handleMinify} aria-label={t.minify}>
                              <HugeiconsIcon icon={ArrowShrinkIcon} data-icon strokeWidth={2} className="size-3.5 shrink-0" aria-hidden />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">{t.minify}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button type="button" variant="outline" size="icon-sm" className="size-6" onClick={handleDownload} disabled={!downloadableText} aria-label={lang === 'zh' ? '下载' : 'Download'}>
                              <HugeiconsIcon icon={FileDownloadIcon} data-icon strokeWidth={2} className="size-3.5 shrink-0 opacity-70" aria-hidden />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">{lang === 'zh' ? '下载' : 'Download'}</TooltipContent>
                        </Tooltip>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-[11px]" aria-label={lang === 'zh' ? '转换' : 'Convert'}>
                              {lang === 'zh' ? '转换' : 'Convert'}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" collisionPadding={8} className="min-w-44">
                            <DropdownMenuLabel>{lang === 'zh' ? '转换器' : 'Converter'}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-[10px] font-normal text-muted-foreground">
                              {lang === 'zh' ? 'YAML（输入需为 JSON / YAML）' : 'YAML (input: JSON / YAML)'}
                            </DropdownMenuLabel>
                            <DropdownMenuItem className="text-xs" onSelect={handleConvertJsonToYaml}>
                              {lang === 'zh' ? 'JSON → YAML' : 'JSON → YAML'}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-xs" onSelect={handleConvertYamlToJson}>
                              {lang === 'zh' ? 'YAML → JSON' : 'YAML → JSON'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-[10px] font-normal text-muted-foreground">
                              {lang === 'zh' ? 'Query（输入需为 JSON object / QueryString）' : 'Query (input: JSON object / query string)'}
                            </DropdownMenuLabel>
                            <DropdownMenuItem className="text-xs" onSelect={handleConvertJsonToQueryString}>
                              {lang === 'zh' ? 'JSON → QueryString' : 'JSON → QueryString'}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-xs" onSelect={handleConvertQueryStringToJson}>
                              {lang === 'zh' ? 'QueryString → JSON' : 'QueryString → JSON'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-[10px] font-normal text-muted-foreground">
                              {lang === 'zh' ? 'FormData（输入需为 JSON object / key=value 文本）' : 'FormData (input: JSON object / key=value text)'}
                            </DropdownMenuLabel>
                            <DropdownMenuItem className="text-xs" onSelect={handleConvertJsonToFormData}>
                              {lang === 'zh' ? 'JSON → FormData 文本' : 'JSON → FormData text'}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-xs" onSelect={handleConvertFormDataToJson}>
                              {lang === 'zh' ? 'FormData 文本 → JSON' : 'FormData text → JSON'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <div className="px-2 py-1.5">
                              <div className="mb-1 text-[10px] text-muted-foreground">
                                {lang === 'zh' ? 'CSV（输入需为对象数组；或 path 指向对象数组）' : 'CSV (input: array of objects, or path points to one)'}
                              </div>
                              <input
                                value={csvPathQuery}
                                onChange={(e) => setCsvPathQuery(e.target.value)}
                                placeholder={lang === 'zh' ? '搜索建议路径…' : 'Search suggested paths...'}
                                className="mb-1 h-7 w-full rounded border border-border bg-background px-2 text-xs outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
                              />
                              <input
                                value={csvPath}
                                onChange={(e) => setCsvPath(e.target.value)}
                                placeholder={lang === 'zh' ? '留空=根数组' : 'empty = root array'}
                                className="h-7 w-full rounded border border-border bg-background px-2 text-xs outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
                              />
                              {filteredCsvPathSuggestions.length > 0 ? (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-5 px-1.5 text-[10px]"
                                    onClick={() => setCsvPath(filteredCsvPathSuggestions[0] === '$' ? '' : filteredCsvPathSuggestions[0])}
                                  >
                                    {lang === 'zh' ? '最佳路径' : 'Best path'}
                                  </Button>
                                  {filteredCsvPathSuggestions.slice(0, 5).map((path) => (
                                    <Button
                                      key={path}
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-5 px-1.5 text-[10px]"
                                      onClick={() => setCsvPath(path === '$' ? '' : path)}
                                    >
                                      {path}
                                    </Button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                            <DropdownMenuItem className="text-xs" onSelect={handleConvertJsonToCsv}>
                              {lang === 'zh' ? 'JSON → CSV' : 'JSON → CSV'}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-xs" onSelect={handleConvertCsvToJson}>
                              {lang === 'zh' ? 'CSV → JSON' : 'CSV → JSON'}
                            </DropdownMenuItem>
                            {convertResult ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-xs" onSelect={() => setConvertResult(null)}>
                                  {lang === 'zh' ? '关闭转换结果' : 'Close converted result'}
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Separator orientation="vertical" className="hidden h-5 sm:block" />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="outline" size="icon-sm" className="size-6" aria-label={`${t.indent}, ${indentSettingLabel}`}>
                              <HugeiconsIcon icon={TextIndentIcon} data-icon strokeWidth={2} className="size-3.5 shrink-0 opacity-70" aria-hidden />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" collisionPadding={8} className="min-w-22">
                            {([2, 4, 8] as const).map((size) => (
                              <DropdownMenuItem key={size} className="gap-2 text-xs" onSelect={() => handleIndentSpacesChange(size)}>
                                <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className={`size-3.5 shrink-0 ${!settings.formatUseTabIndent && settings.formatIndentSpaces === size ? 'opacity-100' : 'opacity-0'}`} aria-hidden />
                                <span>{size}</span>
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuItem className="gap-2 text-xs" onSelect={handleIndentTabSelect}>
                              <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className={`size-3.5 shrink-0 ${settings.formatUseTabIndent ? 'opacity-100' : 'opacity-0'}`} aria-hidden />
                              <span>Tab</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Select value={typeMode} onValueChange={(v) => setTypeMode(v as TypeMode)}>
                          <SelectTrigger size="sm" className="h-6 min-w-24">
                            <SelectValue placeholder={t.types} />
                          </SelectTrigger>
                          <SelectContent align="end">
                            <SelectGroup>
                              {typeModes.map(({ mode, label }) => (
                                <SelectItem key={mode} value={mode}>
                                  <span className="inline-flex items-center gap-1.5">
                                    <HugeiconsIcon icon={typeModeIcons[mode]} data-icon strokeWidth={2} className="size-3.5 shrink-0 opacity-75" aria-hidden />
                                    <span>{label}</span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        {typeMode === 'json' && showTree && lines.length > 0 ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button type="button" variant="outline" size="icon-sm" className="size-6 shrink-0" onClick={handleToggleCollapse} aria-expanded={!hasCollapsed} aria-label={hasCollapsed ? t.expandAll : t.collapseAll}>
                                {hasCollapsed
                                  ? <HugeiconsIcon icon={ArrowDown01Icon} data-icon strokeWidth={2} className="size-3.5" aria-hidden />
                                  : <HugeiconsIcon icon={ArrowUp01Icon} data-icon strokeWidth={2} className="size-3.5" aria-hidden />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">{hasCollapsed ? t.expandAll : t.collapseAll}</TooltipContent>
                          </Tooltip>
                        ) : null}
                        <Separator orientation="vertical" className="hidden h-5 sm:block md:hidden" aria-hidden />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button type="button" variant="outline" size="icon-sm" className="size-6" disabled={!downloadableText} onClick={handleCopyOutput} aria-live="polite" aria-label={copiedNow ? t.copied : t.copy}>
                              {copiedNow ? (
                                <HugeiconsIcon icon={Tick02Icon} data-icon strokeWidth={2} className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                              ) : (
                                <HugeiconsIcon icon={Copy01Icon} data-icon strokeWidth={2} className="size-3.5 shrink-0 opacity-70" aria-hidden />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">{copiedNow ? t.copied : t.copy}</TooltipContent>
                        </Tooltip>
                        {convertResult ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-[11px]"
                              onClick={() => {
                                setInput(convertResult.text)
                                setConvertResult(null)
                                formatHistory.setActiveId(null)
                              }}
                            >
                              {lang === 'zh' ? '应用到左侧' : 'Apply to input'}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-[11px]"
                              onClick={() => setConvertResult(null)}
                            >
                              {lang === 'zh' ? '清空转换' : 'Clear convert'}
                            </Button>
                          </>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <Button type="button" variant={diffIgnoreWhitespace ? 'secondary' : 'outline'} size="sm" className="h-6 px-2 text-[11px]" onClick={() => setDiffIgnoreWhitespace((p) => !p)}>
                          {lang === 'zh' ? '忽略空白' : 'Ignore WS'}
                        </Button>
                        <Button type="button" variant={diffOnlyChanges ? 'secondary' : 'outline'} size="sm" className="h-6 px-2 text-[11px]" onClick={() => setDiffOnlyChanges((p) => !p)}>
                          {lang === 'zh' ? '仅变更' : 'Changes'}
                        </Button>
                        <Separator orientation="vertical" className="hidden h-5 sm:block" />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="outline" size="icon-sm" className="size-6" aria-label={`${t.indent}, ${indentSettingLabel}`}>
                              <HugeiconsIcon icon={TextIndentIcon} data-icon strokeWidth={2} className="size-3.5 shrink-0 opacity-70" aria-hidden />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" collisionPadding={8} className="min-w-22">
                            {([2, 4, 8] as const).map((size) => (
                              <DropdownMenuItem key={size} className="gap-2 text-xs" onSelect={() => handleIndentSpacesChange(size)}>
                                <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className={`size-3.5 shrink-0 ${!settings.formatUseTabIndent && settings.formatIndentSpaces === size ? 'opacity-100' : 'opacity-0'}`} aria-hidden />
                                <span>{size}</span>
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuItem className="gap-2 text-xs" onSelect={handleIndentTabSelect}>
                              <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className={`size-3.5 shrink-0 ${settings.formatUseTabIndent ? 'opacity-100' : 'opacity-0'}`} aria-hidden />
                              <span>Tab</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button type="button" variant="outline" size="icon-sm" className="size-6" onClick={() => setDiffInput('')} disabled={!diffInput} aria-label={lang === 'zh' ? '清空右侧对比' : 'Clear right-side diff input'}>
                              <HugeiconsIcon icon={EraserIcon} data-icon strokeWidth={2} className="size-3.5 shrink-0 opacity-70" aria-hidden />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">{lang === 'zh' ? '清空右侧' : 'Clear right'}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button type="button" variant="outline" size="icon-sm" className="size-6" onClick={handleCopyDiff} aria-live="polite" aria-label={diffCopied ? t.copied : (lang === 'zh' ? '复制 Diff' : 'Copy diff')}>
                              {diffCopied ? (
                                <HugeiconsIcon icon={Tick02Icon} data-icon strokeWidth={2} className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                              ) : (
                                <HugeiconsIcon icon={Copy01Icon} data-icon strokeWidth={2} className="size-3.5 shrink-0 opacity-70" aria-hidden />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">{diffCopied ? t.copied : (lang === 'zh' ? '复制 Diff' : 'Copy diff')}</TooltipContent>
                        </Tooltip>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <ScrollArea className="min-h-0 flex-1 bg-background">
                <div ref={outputRef} id="jsonex-output-region" className="flex min-h-full min-w-0 flex-1 flex-col" tabIndex={-1}>
                  {outputInner}
                </div>
              </ScrollArea>
            </section>
          </Panel>
  )

  const headerBorderClass =
    settings.headerBarPosition === 'top' ? 'border-b border-border/70' : 'border-t border-border/70'

  const headerBar = (
      <header className={cn('flex h-12 shrink-0 items-center gap-3 px-3', headerBorderClass)}>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
            aria-hidden
          >
            <HugeiconsIcon icon={CodeIcon} strokeWidth={2} className="size-4.25" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-[0.9375rem] font-semibold leading-none tracking-tight">{t.title}</h1>
            <p className="sr-only">{t.subtitle}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center">
          <ToggleGroup
            type="single"
            value={workMode}
            onValueChange={(value) => {
              if (value) setWorkMode(value as 'format' | 'diff')
            }}
            variant="outline"
            size="sm"
            className="h-7"
            aria-label={lang === 'zh' ? '功能模式' : 'Feature mode'}
          >
            <ToggleGroupItem value="format" className="h-7 px-2 text-xs">
              {lang === 'zh' ? '格式化' : 'Format'}
            </ToggleGroupItem>
            <ToggleGroupItem value="diff" className="h-7 gap-1 px-2 text-xs">
              <HugeiconsIcon icon={GitCompareIcon} data-icon strokeWidth={2} className="size-3.5 shrink-0" aria-hidden />
              {lang === 'zh' ? '对比' : 'Diff'}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" aria-label={t.switchLang} onClick={toggleLang}>
            <HugeiconsIcon icon={LanguageCircleIcon} data-icon strokeWidth={2} className="size-3.5 shrink-0" aria-hidden />
            {lang === 'zh' ? 'EN' : '中文'}
          </Button>
          <Button variant="outline" size="icon-sm" className="size-7" aria-label={theme === 'light' ? t.dark : t.light} onClick={toggleTheme}>
            {theme === 'light'
              ? <HugeiconsIcon icon={Sun01Icon} data-icon strokeWidth={2} className="size-3.5" />
              : <HugeiconsIcon icon={MoonIcon} data-icon strokeWidth={2} className="size-3.5" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon-sm" className="size-7" aria-label={lang === 'zh' ? '设置' : 'Settings'}>
                <HugeiconsIcon icon={Settings01Icon} data-icon strokeWidth={2} className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 min-w-56">
              <DropdownMenuLabel>{lang === 'zh' ? '设置' : 'Settings'}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={settings.autoFormat}
                onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, autoFormat: !!checked }))}
              >
                <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-3.5 opacity-70" />
                <span>{lang === 'zh' ? '自动格式化' : 'Auto format'}</span>
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={settings.historyDefaultOpen}
                onCheckedChange={(checked) => {
                  const next = !!checked
                  setSettings((prev) => ({ ...prev, historyDefaultOpen: next }))
                  setHistoryOpen(next)
                }}
              >
                <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="size-3.5 opacity-70" />
                <span>{lang === 'zh' ? '历史栏默认展开' : 'Open history by default'}</span>
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <HugeiconsIcon icon={CodeIcon} strokeWidth={2} className="size-3.5 opacity-70" />
                  <span>{lang === 'zh' ? '默认代码类型' : 'Default type mode'}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup
                    value={settings.defaultTypeMode}
                    onValueChange={(v) => {
                      const mode = v as TypeMode
                      setSettings((prev) => ({ ...prev, defaultTypeMode: mode }))
                      setTypeMode(mode)
                    }}
                  >
                    {typeModes.map(({ mode, label }) => (
                      <DropdownMenuRadioItem key={mode} value={mode}>
                        {label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <HugeiconsIcon icon={TextIndentIcon} strokeWidth={2} className="size-3.5 opacity-70" />
                  <span>{lang === 'zh' ? '编辑器字号' : 'Editor font size'}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup
                    value={String(settings.editorFontSize)}
                    onValueChange={(v) => setSettings((prev) => ({ ...prev, editorFontSize: Number(v) }))}
                  >
                    {[11, 12, 13, 14, 15, 16].map((size) => (
                      <DropdownMenuRadioItem key={size} value={String(size)}>
                        {size}px
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <HugeiconsIcon icon={CodeIcon} strokeWidth={2} className="size-3.5 opacity-70" />
                  <span>{lang === 'zh' ? '格式规则' : 'Formatting rules'}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="min-w-48">
                  <DropdownMenuLabel className="font-normal text-[10px] text-muted-foreground">{lang === 'zh' ? '缩进' : 'Indent'}</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={settings.formatUseTabIndent ? 'tab' : String(settings.formatIndentSpaces)}
                    onValueChange={(v) => {
                      if (v === 'tab') {
                        setSettings((prev) => ({ ...prev, formatUseTabIndent: true }))
                      } else {
                        const n = Number(v) as 2 | 4 | 8
                        setSettings((prev) => ({
                          ...prev,
                          formatIndentSpaces: n,
                          formatUseTabIndent: false,
                        }))
                      }
                    }}
                  >
                    <DropdownMenuRadioItem value="2">2</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="4">4</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="8">8</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="tab">Tab</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="font-normal text-[10px] text-muted-foreground">{lang === 'zh' ? '换行符' : 'Line ending'}</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={settings.formatLineEnding}
                    onValueChange={(v) =>
                      setSettings((prev) => ({ ...prev, formatLineEnding: v as JsonFormatLineEnding }))}
                  >
                    <DropdownMenuRadioItem value="lf">LF</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="crlf">CRLF</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={settings.formatTrailingNewline}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({ ...prev, formatTrailingNewline: !!checked }))}
                  >
                    {lang === 'zh' ? '文件末尾换行' : 'Final newline'}
                  </DropdownMenuCheckboxItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <HugeiconsIcon icon={CodeIcon} strokeWidth={2} className="size-3.5 opacity-70" />
                  <span>{lang === 'zh' ? '代码主题颜色' : 'Code theme colors'}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup
                    value={settings.codeTheme}
                    onValueChange={(v) => setSettings((prev) => ({ ...prev, codeTheme: v as CodeTheme }))}
                  >
                    <DropdownMenuRadioItem value="classic">{lang === 'zh' ? '经典' : 'Classic'}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="ocean">{lang === 'zh' ? '海洋' : 'Ocean'}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="mono">{lang === 'zh' ? '灰阶' : 'Mono'}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="forest">{lang === 'zh' ? '森林' : 'Forest'}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="sunset">{lang === 'zh' ? '日落' : 'Sunset'}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="neon">{lang === 'zh' ? '霓虹' : 'Neon'}</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <HugeiconsIcon icon={PanelTopBottomDashedIcon} strokeWidth={2} className="size-3.5 opacity-70" />
                  <span>{lang === 'zh' ? '顶栏位置' : 'Header bar'}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup
                    value={settings.headerBarPosition}
                    onValueChange={(v) => {
                      const pos = v as HeaderBarPosition
                      setSettings((prev) => ({ ...prev, headerBarPosition: pos }))
                    }}
                  >
                    <DropdownMenuRadioItem value="top">{lang === 'zh' ? '顶部' : 'Top'}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="bottom">{lang === 'zh' ? '底部' : 'Bottom'}</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              {canOpenExtensionFullscreenWindow ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2" onSelect={handleOpenExtensionFullscreenWindow}>
                    <HugeiconsIcon icon={MaximizeScreenIcon} strokeWidth={2} className="size-3.5 opacity-70" />
                    <span>{lang === 'zh' ? '全屏窗口打开（最大化新窗口）' : 'Open maximized window'}</span>
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
  )

  const mainWorkspace = (
      <main className="flex min-h-0 flex-1 flex-col">
        {workMode === 'diff' ? (
          <Group orientation="vertical" className="min-h-0 flex-1">
            <Panel defaultSize={52} minSize={26} className="flex min-h-0 min-w-0 flex-col overflow-hidden" style={{ overflow: 'hidden' }}>
              <Group orientation="horizontal" className="min-h-0 flex-1">
                <Panel id="panel-source" defaultSize={50} minSize={22} className="flex min-h-0 min-w-0 flex-col overflow-hidden" style={{ overflow: 'hidden' }}>
                  {sourceSection}
                </Panel>
                <ResizeHandle id="resize-diff-lr" aria-label={lang === 'zh' ? '调整左右宽度' : 'Resize columns'} className={splitColHandleClass} />
                <Panel defaultSize={50} minSize={22} className="flex min-h-0 min-w-0 flex-col overflow-hidden" style={{ overflow: 'hidden' }}>
                  {compareRightSection}
                </Panel>
              </Group>
            </Panel>
            <ResizeHandle id="resize-diff-vertical" aria-label={lang === 'zh' ? '调整上下区域' : 'Resize split'} className={splitRowHandleClass} />
            {resultWorkspace}
          </Group>
        ) : (
          <Group orientation="horizontal" className="min-h-0 flex-1">
            <Panel id="panel-source" defaultSize={52} minSize={22} className="flex min-h-0 min-w-0 flex-col overflow-hidden" style={{ overflow: 'hidden' }}>
              {sourceSection}
            </Panel>

            <ResizeHandle
              id="resize-jsonex-panels"
              aria-label={t.resizeHandleAria}
              className={cn(
                'relative z-10 w-px min-w-px shrink-0 cursor-col-resize bg-border outline-none',
                'hover:bg-muted-foreground/40',
                'focus-visible:bg-muted-foreground/45 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              )}
            />

            {resultWorkspace}
          </Group>
        )}
      </main>
  )

  return (
    <div id="jsonex-shell" data-code-theme={settings.codeTheme} className="flex h-full min-h-0 flex-col bg-background text-foreground antialiased">
      <div role="status" aria-live="polite" className="sr-only">
        {a11yError ?? ''}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json,text/plain"
        className="hidden"
        onChange={handleUploadFile}
      />
      <input
        ref={fileInputDiffRef}
        type="file"
        accept=".json,application/json,text/plain"
        className="hidden"
        onChange={handleUploadFileDiff}
      />
      {settings.headerBarPosition === 'top' ? (
        <>
          {headerBar}
          {mainWorkspace}
        </>
      ) : (
        <>
          {mainWorkspace}
          {headerBar}
        </>
      )}
    </div>
  )
}

export default App
