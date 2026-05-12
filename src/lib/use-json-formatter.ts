import { useMemo, useState, useCallback, useEffect } from 'react'
import {
  formatJson,
  minifyJson,
  syntaxHighlight,
  copyToClipboard,
  escapeJson,
  unescapeJson,
  applyJsonFormatStyle,
  resolveJsonIndent,
  type JsonFormatStyleOptions,
} from './json-utils'
import { isHeavyJsonText, plainEscapeMultiline } from './heavy-input'
import { type Lang } from './i18n'

export type FormatMode = 'formatted' | 'minified'

const errFns = {
  zh: {
    errorEmpty: '请输入 JSON 字符串',
    errorSyntax: 'JSON 语法错误',
  },
  en: {
    errorEmpty: 'Please enter a JSON string',
    errorSyntax: 'JSON Syntax Error',
  },
}

export function useJsonFormatter(
  lang: Lang,
  autoFormat: boolean,
  formatStyle: JsonFormatStyleOptions,
) {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [parsedData, setParsedData] = useState<unknown | undefined>()
  const [highlightedOutput, setHighlightedOutput] = useState('')
  const [copied, setCopied] = useState(false)
  const [formatMode, setFormatMode] = useState<FormatMode>('formatted')

  const errFn = errFns[lang]
  const indentUnit = useMemo(() => resolveJsonIndent(formatStyle), [formatStyle.indentSpaces, formatStyle.useTabIndent])

  const styleOutput = useCallback(
    (raw: string) =>
      applyJsonFormatStyle(raw, formatStyle.lineEnding, formatStyle.trailingNewline),
    [formatStyle.lineEnding, formatStyle.trailingNewline],
  )

  useEffect(() => {
    if (!autoFormat) return
    const trimmed = input.trim()
    if (!trimmed) {
      setOutput('')
      setError(undefined)
      setParsedData(undefined)
      setHighlightedOutput('')
      setFormatMode('formatted')
      return
    }

    const result = formatMode === 'minified'
      ? minifyJson(input, () => errFn.errorEmpty)
      : formatJson(input, indentUnit, () => errFn.errorEmpty)
    setError(result.error)
    if (!result.error) {
      const parsed = JSON.parse(trimmed)
      setParsedData(parsed)
      const styled = formatMode === 'minified'
        ? result.formatted
        : styleOutput(result.formatted)
      setOutput(styled)
      setHighlightedOutput(
        isHeavyJsonText(trimmed) || isHeavyJsonText(styled)
          ? plainEscapeMultiline(styled)
          : syntaxHighlight(styled),
      )
    } else {
      setParsedData(undefined)
      setOutput('')
      setHighlightedOutput('')
    }
  }, [input, indentUnit, errFn, autoFormat, styleOutput, formatMode])

  const handleFormat = useCallback(() => {
    if (!input.trim()) return
    const result = formatJson(input, indentUnit, () => errFn.errorEmpty)
    setError(result.error)
    if (!result.error) {
      const parsed = JSON.parse(input.trim())
      setParsedData(parsed)
      const styled = styleOutput(result.formatted)
      const highlighted =
        isHeavyJsonText(input.trim()) || isHeavyJsonText(styled)
          ? plainEscapeMultiline(styled)
          : syntaxHighlight(styled)
      setOutput(styled)
      setHighlightedOutput(highlighted)
      setFormatMode('formatted')
    }
  }, [input, indentUnit, errFn, styleOutput])

  const handleMinify = useCallback(() => {
    if (!input.trim()) return
    const result = minifyJson(input, () => errFn.errorEmpty)
    setError(result.error)
    if (!result.error) {
      const parsed = JSON.parse(input.trim())
      setParsedData(parsed)
      const highlighted =
        isHeavyJsonText(input.trim()) || isHeavyJsonText(result.formatted)
          ? plainEscapeMultiline(result.formatted)
          : syntaxHighlight(result.formatted)
      setOutput(result.formatted)
      setHighlightedOutput(highlighted)
      setFormatMode('minified')
    }
  }, [input, errFn])

  const handleCopy = useCallback(async () => {
    const success = await copyToClipboard(output)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [output])

  const handleEscape = useCallback(() => {
    setInput(escapeJson(input))
  }, [input])

  const handleUnescape = useCallback(() => {
    setInput(unescapeJson(input))
  }, [input])

  const handleClear = useCallback(() => {
    setInput('')
    setOutput('')
    setError(undefined)
    setParsedData(undefined)
    setHighlightedOutput('')
  }, [])

  return {
    input,
    setInput,
    output,
    error,
    parsedData,
    highlightedOutput,
    copied,
    formatMode,
    handleFormat,
    handleMinify,
    handleCopy,
    handleEscape,
    handleUnescape,
    handleClear,
  }
}
