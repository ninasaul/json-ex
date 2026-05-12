import { useRef, useCallback, useMemo, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useJsonFormatter } from '@/lib/use-json-formatter'
import { useTheme } from '@/hooks/use-theme'
import { useI18n } from '@/hooks/use-i18n'
import { useHistory, type HistoryItem } from '@/hooks/use-history'
import { useAppSettings, type CodeTheme, type HeaderBarPosition } from '@/hooks/use-app-settings'
import { useActions } from '@/hooks/use-actions'
import { useJsonLines, useCollapse, collectPaths } from '@/components/json-tree'
import { Panel } from 'react-resizable-panels'
import { JsonexMainLayout } from '@/components/jsonex/jsonex-main-layout'
import { FormatSourcePanel } from '@/components/jsonex/format-source-panel'
import { DiffComparePanel } from '@/components/jsonex/diff-compare-panel'
import { MarkdownWorkspace } from '@/components/jsonex/markdown-workspace'
import { JsonexOutputBody } from '@/components/jsonex/jsonex-output-body'
import {
  HISTORY_KEY,
  DIFF_HISTORY_KEY,
  HISTORY_LIMIT,
  SETTINGS_KEY,
} from '@/components/jsonex/jsonex-constants'
import { chromeExtensionWindowApiAvailable } from '@/components/jsonex/chrome-extension'
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
import { buildDiffRows, formatDiffRowsForCopy, summarizeDiffRows } from '@/lib/diff-utils'
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
import { syntaxHighlightQueryString, syntaxHighlightCsv } from '@/lib/preview-syntax'
import {
  HEAVY_DIFF_SKIP_EN,
  HEAVY_DIFF_SKIP_ZH,
  isHeavyDiffPair,
  isHeavyJsonText,
  plainEscapeMultiline,
} from '@/lib/heavy-input'
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
  TextIndentIcon,
  Sun01Icon,
  MoonIcon,
  LanguageCircleIcon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  FileDownloadIcon,
  Clock01Icon,
  Settings01Icon,
  GitCompareIcon,
  Doc01Icon,
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

  const outputTooHeavyForTree = isHeavyJsonText(output)
  const showTree =
    formatMode === 'formatted' && parsedData !== undefined && !outputTooHeavyForTree
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
  const [workMode, setWorkMode] = useState<'format' | 'diff' | 'markdown'>('format')
  const [diffInput, setDiffInput] = useState('')
  const [diffIgnoreWhitespace, setDiffIgnoreWhitespace] = useState(true)
  const [diffOnlyChanges, setDiffOnlyChanges] = useState(false)
  const [diffCopied, setDiffCopied] = useState(false)
  const [diffHistoryOpen, setDiffHistoryOpen] = useState(false)
  const [a11yError, setA11yError] = useState<string | null>(null)
  const [convertResult, setConvertResult] = useState<{
    text: string
    ext: 'yml' | 'json' | 'txt' | 'csv'
    kind: 'yaml' | 'json' | 'plain' | 'csv'
  } | null>(null)
  const [csvPath, setCsvPath] = useState('')
  const [csvPathQuery, setCsvPathQuery] = useState('')

  const getConvertSource = useCallback((kinds?: Array<'yaml' | 'json' | 'plain' | 'csv'>) => {
    if (!convertResult) return input
    if (!kinds || kinds.includes(convertResult.kind)) return convertResult.text
    return input
  }, [convertResult, input])

  const runConvert = useCallback(
    (
      action: () => { text: string },
      success: { ext: 'yml' | 'json' | 'txt' | 'csv'; kind: 'yaml' | 'json' | 'plain' | 'csv' },
      errorMsgZh: string,
      errorMsgEn: string,
    ) => {
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
    if (isHeavyJsonText(generatedType)) return plainEscapeMultiline(generatedType)
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

  const diffTooHeavy = useMemo(
    () => isHeavyDiffPair(diffBaseText, diffTargetText),
    [diffBaseText, diffTargetText],
  )

  const diffRowsAll = useMemo(() => {
    if (diffTooHeavy) return []
    return buildDiffRows(diffBaseText, diffTargetText, diffIgnoreWhitespace)
  }, [diffBaseText, diffTargetText, diffIgnoreWhitespace, diffTooHeavy])

  const diffRows = useMemo(
    () => (diffOnlyChanges ? diffRowsAll.filter((row) => row.kind !== 'context') : diffRowsAll),
    [diffOnlyChanges, diffRowsAll],
  )

  const diffSummary = useMemo(
    () => (diffTooHeavy ? { adds: 0, removes: 0, modifies: 0, total: 0 } : summarizeDiffRows(diffRowsAll)),
    [diffRowsAll, diffTooHeavy],
  )

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
    const payload = diffTooHeavy
      ? (lang === 'zh' ? HEAVY_DIFF_SKIP_ZH : HEAVY_DIFF_SKIP_EN)
      : formatDiffRowsForCopy(diffRowsAll)
    await actions.copyText(payload, () => {
      setDiffCopied(true)
      setTimeout(() => setDiffCopied(false), 1500)
    })
  }, [actions, diffRowsAll, diffTooHeavy, lang])

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
    if (workMode === 'markdown') setHistoryOpen(false)
  }, [workMode])

  useEffect(() => {
    if ((workMode === 'diff' || workMode === 'markdown') && convertResult) {
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
  }, [diffHistory])

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
    const raw = convertResult.text
    if (isHeavyJsonText(raw)) return plainEscapeMultiline(raw)
    if (convertResult.kind === 'json') return syntaxHighlight(raw)
    if (convertResult.kind === 'yaml') return syntaxHighlightYaml(raw)
    if (convertResult.kind === 'csv') return syntaxHighlightCsv(raw)
    return syntaxHighlightQueryString(raw)
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

  const outputInner = (
    <JsonexOutputBody
      lang={lang}
      workMode={workMode === 'diff' ? 'diff' : 'format'}
      editorStyle={editorStyle}
      convertResult={convertResult}
      highlightedConvertResult={highlightedConvertResult}
      diffTooHeavy={diffTooHeavy}
      diffLeftMeta={diffLeftMeta}
      diffRightMeta={diffRightMeta}
      canShowDiff={canShowDiff}
      diffSummary={diffSummary}
      diffRows={diffRows}
      onFormatLeft={handleFormat}
      onFillRightFromOutput={() => setDiffInput(output)}
      onClearRight={() => setDiffInput('')}
      formatInput={input}
      formatOutput={output}
      formatDiffRight={diffInput}
      error={error}
      typeMode={typeMode}
      generatedType={generatedType}
      highlightedGeneratedType={highlightedGeneratedType}
      showTree={showTree}
      treeLines={lines}
      treeVisualIndent={treeVisualIndent}
      toggleTree={toggle}
      highlightedOutput={highlightedOutput}
      texts={{
        placeholder: t.placeholder,
        shortcut: t.shortcut,
        expandAll: t.expandAll,
        collapseAll: t.collapseAll,
      }}
    />
  )

  const sourceSection = (
    <FormatSourcePanel
      workMode={workMode === 'diff' ? 'diff' : 'format'}
      ariaLabelDiffLeft={lang === 'zh' ? 'Diff 左侧基准 JSON' : 'Diff left baseline JSON'}
      ariaLabelFormatSource={t.panelSourceAria}
      headingDiffLeft={lang === 'zh' ? '基准（左）' : 'Baseline (left)'}
      headingFormat={t.input}
      input={input}
      onInputChange={(value) => {
        setInput(value)
        if (formatHistory.activeId) formatHistory.setActiveId(null)
      }}
      placeholderFormat={t.placeholder}
      placeholderDiffLeft={lang === 'zh' ? '左侧 JSON…' : 'Left JSON…'}
      editorStyle={editorStyle}
      historyOpen={historyOpen}
      onToggleHistory={() => setHistoryOpen((prev) => !prev)}
      historyItems={formatHistory.items}
      activeHistoryId={formatHistory.activeId}
      onUseHistory={handleUseHistory}
      onClearHistory={handleClearHistory}
      onRemoveHistoryItem={handleRemoveHistoryItem}
      historyClearDisabled={formatHistory.items.length === 0}
      historyTitleFormat={lang === 'zh' ? '历史记录（点击回填）' : 'History'}
      historyTitleDiffBaseline={lang === 'zh' ? '基准历史（点击回填）' : 'Baseline history'}
      onUploadClick={handleUploadClick}
      onRepairInput={handleRepairInput}
      onEscape={handleEscape}
      onUnescape={handleUnescape}
      onClear={handleClear}
      escapeLabel={t.escape}
      unescapeLabel={t.unescape}
      clearLabel={t.clear}
      emptyHistoryLabel={lang === 'zh' ? '暂无记录' : 'No history yet'}
      clearHistoryAria={lang === 'zh' ? '清空历史' : 'Clear history'}
      deleteHistoryAria={lang === 'zh' ? '删除' : 'Delete'}
      uploadAria={lang === 'zh' ? '上传' : 'Upload'}
      repairAria={lang === 'zh' ? '修复 JSON' : 'Fix JSON'}
    />
  )

  const compareRightSection = (
    <DiffComparePanel
      lang={lang}
      diffInput={diffInput}
      onDiffInputChange={(value) => {
        setDiffInput(value)
        if (diffHistory.activeId) diffHistory.setActiveId(null)
      }}
      editorStyle={editorStyle}
      onUploadClickDiff={handleUploadClickDiff}
      onDiffEscape={handleDiffEscape}
      onDiffUnescape={handleDiffUnescape}
      diffHistoryOpen={diffHistoryOpen}
      onToggleDiffHistory={() => setDiffHistoryOpen((prev) => !prev)}
      diffHistoryItems={diffHistory.items}
      activeDiffHistoryId={diffHistory.activeId}
      onUseDiffHistory={handleUseDiffHistory}
      onClearDiffHistory={handleClearDiffHistory}
      onRemoveDiffHistoryItem={handleRemoveDiffHistoryItem}
      diffHistoryClearDisabled={diffHistory.items.length === 0}
      onFillFromOutput={() => setDiffInput(output)}
      fillFromOutputDisabled={!output}
      onDiffClear={handleDiffClear}
      diffClearDisabled={!diffInput}
      escapeLabel={t.escape}
      unescapeLabel={t.unescape}
      clearLabel={t.clear}
      emptyHistoryLabel={lang === 'zh' ? '暂无记录' : 'No history yet'}
      clearHistoryAria={lang === 'zh' ? '清空历史' : 'Clear history'}
      deleteHistoryAria={lang === 'zh' ? '删除' : 'Delete'}
      uploadAria={lang === 'zh' ? '上传' : 'Upload'}
      heading={lang === 'zh' ? '对比（右）' : 'Compare (right)'}
      ariaLabel={lang === 'zh' ? '对比 JSON（右）' : 'Compare JSON (right)'}
      placeholder={lang === 'zh' ? '右侧 JSON…' : 'Right JSON…'}
    />
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
      <header
        className={cn(
          'flex h-12 min-h-12 shrink-0 items-center gap-2 overflow-x-auto px-3 sm:gap-3',
          headerBorderClass,
        )}
      >
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
              if (value) setWorkMode(value as 'format' | 'diff' | 'markdown')
            }}
            variant="outline"
            size="sm"
            className="h-7"
            aria-label={lang === 'zh' ? '功能模式' : 'Feature mode'}
          >
            <ToggleGroupItem value="format" className="h-7 gap-1 px-2 text-xs">
              <HugeiconsIcon icon={CodeSquareIcon} data-icon strokeWidth={2} className="size-3.5 shrink-0 opacity-80" aria-hidden />
              <span>{t.format}</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="markdown" className="h-7 gap-1 px-2 text-xs">
              <HugeiconsIcon icon={Doc01Icon} data-icon strokeWidth={2} className="size-3.5 shrink-0 opacity-80" aria-hidden />
              <span>{t.markdown}</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="diff" className="h-7 gap-1 px-2 text-xs">
              <HugeiconsIcon icon={GitCompareIcon} data-icon strokeWidth={2} className="size-3.5 shrink-0 opacity-80" aria-hidden />
              <span>{t.diff}</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs whitespace-nowrap"
            aria-label={t.switchLang}
            onClick={toggleLang}
          >
            <HugeiconsIcon icon={LanguageCircleIcon} data-icon strokeWidth={2} className="size-3.5 shrink-0 opacity-80" aria-hidden />
            <span>{lang === 'zh' ? t.chinese : t.english}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs whitespace-nowrap"
            aria-label={t.theme}
            onClick={toggleTheme}
          >
            {theme === 'light' ? (
              <HugeiconsIcon icon={Sun01Icon} data-icon strokeWidth={2} className="size-3.5 shrink-0 opacity-80" aria-hidden />
            ) : (
              <HugeiconsIcon icon={MoonIcon} data-icon strokeWidth={2} className="size-3.5 shrink-0 opacity-80" aria-hidden />
            )}
            <span>{theme === 'light' ? t.light : t.dark}</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2 text-xs whitespace-nowrap" aria-label={t.settings}>
                <HugeiconsIcon icon={Settings01Icon} data-icon strokeWidth={2} className="size-3.5 shrink-0 opacity-80" aria-hidden />
                <span>{t.settings}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 min-w-56">
              <DropdownMenuLabel>{t.settings}</DropdownMenuLabel>
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

  const mainWorkspace =
    workMode === 'markdown' ? (
      <MarkdownWorkspace
        lang={lang}
        splitHandleClass={splitColHandleClass}
        resizeAria={lang === 'zh' ? '调整编辑与预览宽度' : 'Resize editor and preview'}
        editorFontSize={settings.editorFontSize}
        setA11yError={setA11yError}
      />
    ) : (
      <JsonexMainLayout
        workMode={workMode === 'diff' ? 'diff' : 'format'}
        lang={lang}
        columnHandleClassDiff={splitColHandleClass}
        columnHandleClassFormat={splitColHandleClass}
        rowHandleClassDiff={splitRowHandleClass}
        resizePanelsBetweenSourceResultAria={t.resizeHandleAria}
        source={sourceSection}
        compareRight={compareRightSection}
        result={resultWorkspace}
      />
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
