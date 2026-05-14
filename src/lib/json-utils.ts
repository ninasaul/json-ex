import JSON5 from 'json5'

export interface JsonFormatResult {
  formatted: string
  error?: string
  line?: number
  col?: number
  repairs?: string[]
}

type ErrorFn = (key: 'errorEmpty' | 'errorSyntax') => string

/** `JSON.stringify` indent: space count or tab */
export type JsonIndent = number | '\t'

export type JsonFormatLineEnding = 'lf' | 'crlf'

export interface JsonFormatStyleOptions {
  indentSpaces: number
  useTabIndent: boolean
  lineEnding: JsonFormatLineEnding
  trailingNewline: boolean
}

export function resolveJsonIndent(opts: Pick<JsonFormatStyleOptions, 'indentSpaces' | 'useTabIndent'>): JsonIndent {
  return opts.useTabIndent ? '\t' : opts.indentSpaces
}

/** Normalizes line endings and optional trailing newline (for saved / copied JSON). */
export function applyJsonFormatStyle(
  text: string,
  lineEnding: JsonFormatLineEnding,
  trailingNewline: boolean,
): string {
  let s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (lineEnding === 'crlf') {
    s = s.split('\n').join('\r\n')
  }
  const term = lineEnding === 'crlf' ? '\r\n' : '\n'
  if (trailingNewline) {
    if (!s.endsWith(term)) s += term
  } else {
    if (lineEnding === 'crlf') {
      if (s.endsWith('\r\n')) s = s.slice(0, -2)
      else if (s.endsWith('\n')) s = s.slice(0, -1)
    } else if (s.endsWith('\n')) {
      s = s.slice(0, -1)
    }
  }
  return s
}

export function formatJson(input: string, indent: JsonIndent = 2, errFn?: ErrorFn): JsonFormatResult {
  const trimmed = input.trim()
  if (!trimmed) {
    return { formatted: '', error: errFn?.('errorEmpty') ?? 'Please enter a JSON string' }
  }

  try {
    const parsed = JSON.parse(trimmed)
    const formatted = JSON.stringify(parsed, null, indent)
    return { formatted }
  } catch (e) {
    const msg = (e as Error).message
    const prefix = errFn?.('errorSyntax') ?? 'JSON Syntax Error'
    const match = msg.match(/position\s+(\d+)/i)
    if (match) {
      const pos = parseInt(match[1])
      const before = trimmed.slice(0, pos)
      const lines = before.split('\n')
      const line = lines.length
      const col = lines[lines.length - 1].length + 1
      return {
        formatted: trimmed,
        error: `${prefix}: ${msg}`,
        line,
        col,
      }
    }
    return { formatted: trimmed, error: `${prefix}: ${msg}` }
  }
}

export function minifyJson(input: string, errFn?: ErrorFn): JsonFormatResult {
  const trimmed = input.trim()
  if (!trimmed) {
    return { formatted: '', error: errFn?.('errorEmpty') ?? 'Please enter a JSON string' }
  }

  try {
    const parsed = JSON.parse(trimmed)
    const minified = JSON.stringify(parsed)
    return { formatted: minified }
  } catch (e) {
    const msg = (e as Error).message
    const prefix = errFn?.('errorSyntax') ?? 'JSON Syntax Error'
    const match = msg.match(/position\s+(\d+)/i)
    if (match) {
      const pos = parseInt(match[1])
      const before = trimmed.slice(0, pos)
      const lines = before.split('\n')
      const line = lines.length
      const col = lines[lines.length - 1].length + 1
      return {
        formatted: trimmed,
        error: `${prefix}: ${msg}`,
        line,
        col,
      }
    }
    return { formatted: trimmed, error: `${prefix}: ${msg}` }
  }
}

export function escapeJson(input: string): string {
  return JSON.stringify(input).slice(1, -1)
}

export function unescapeJson(input: string): string {
  return input.replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r')
}

export function syntaxHighlight(json: string): string {
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /("(?:[^"\\]|\\.)*")\s*:/g,
      '<span class="json-key">$1</span>:'
    )
    .replace(
      /:\s*("(?:[^"\\]|\\.)*")/g,
      ': <span class="json-string">$1</span>'
    )
    .replace(
      /:\s*(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
      ': <span class="json-number">$1</span>'
    )
    .replace(
      /:\s*(true|false)/g,
      ': <span class="json-boolean">$1</span>'
    )
    .replace(
      /:\s*(null)/g,
      ': <span class="json-null">$1</span>'
    )
    .replace(
      /([\[\]{}])/g,
      '<span class="json-bracket">$1</span>'
    )
}

function escapeHtml(code: string): string {
  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Light syntax hints for non-JSON code editors (strings and comments). */
export function syntaxHighlightPlain(code: string): string {
  let html = escapeHtml(code)
  html = html.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, '<span class="code-string">$1</span>')
  html = html.replace(/(\/\/.*$)/gm, '<span class="code-comment">$1</span>')
  html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="code-comment">$1</span>')
  return html
}

export function syntaxHighlightCode(code: string, mode: string): string {
  let html = escapeHtml(code)
  html = html.replace(/("(?:[^"\\]|\\.)*")/g, '<span class="code-string">$1</span>')
  html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="code-number">$1</span>')
  html = html.replace(/(\/\/.*$)/gm, '<span class="code-comment">$1</span>')
  html = html.replace(/(#.*$)/gm, '<span class="code-comment">$1</span>')

  const keywordMap: Record<string, string[]> = {
    ts: ['interface', 'type', 'extends'],
    java: ['public', 'class', 'private', 'import'],
    python: ['class', 'from'],
    go: ['type', 'struct', 'package'],
    csharp: ['public', 'class', 'using'],
    rust: ['pub', 'struct', 'use'],
    kotlin: ['data', 'class', 'val'],
    php: ['class', 'public'],
    swift: ['struct', 'let', 'Codable'],
    ruby: ['class', 'attr_accessor', 'end'],
    cpp: ['struct', 'include'],
  }

  const kws = keywordMap[mode] ?? []
  if (kws.length > 0) {
    const reg = new RegExp(`\\b(${kws.join('|')})\\b`, 'g')
    html = html.replace(reg, '<span class="code-keyword">$1</span>')
  }
  return html
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // 优先使用 clipboard API
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // 降级方案: 使用 textarea + execCommand
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      return true
    } catch {
      return false
    } finally {
      document.body.removeChild(textarea)
    }
  }
}

/**
 * Best-effort JSON repair for common copy/paste issues:
 * - JS comments
 * - trailing commas
 * - unquoted object keys
 * - single-quoted strings
 */
export function repairJsonLike(input: string, indent: JsonIndent = 2): JsonFormatResult {
  const trimmed = input.trim()
  if (!trimmed) return { formatted: '', error: 'Please enter a JSON string' }

  const tryParse = (text: string): JsonFormatResult | null => {
    try {
      const parsed = JSON.parse(text)
      return { formatted: JSON.stringify(parsed, null, indent) }
    } catch {
      return null
    }
  }

  const direct = tryParse(trimmed)
  if (direct) return { ...direct, repairs: [] }

  // JSON5 parser handles comments, trailing commas, single quotes, unquoted keys, etc.
  try {
    const parsed = JSON5.parse(trimmed) as unknown
    return {
      formatted: JSON.stringify(parsed, null, indent),
      repairs: ['json5-compat'],
    }
  } catch {
    // continue with regex-based best effort fallback
  }

  let candidate = trimmed
  const repairs: string[] = []
  // Remove // and /* */ comments
  {
    const next = candidate.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1')
    if (next !== candidate) repairs.push('remove-comments')
    candidate = next
  }
  // Remove trailing commas before } or ]
  {
    const next = candidate.replace(/,\s*([}\]])/g, '$1')
    if (next !== candidate) repairs.push('remove-trailing-commas')
    candidate = next
  }
  // Quote unquoted keys: { a: 1 } -> { "a": 1 }
  {
    const next = candidate.replace(/([{,]\s*)([A-Za-z_$][A-Za-z0-9_$-]*)(\s*:)/g, '$1"$2"$3')
    if (next !== candidate) repairs.push('quote-unquoted-keys')
    candidate = next
  }
  // Replace single quoted strings with double quoted strings
  {
    const next = candidate.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_, s: string) => `"${s.replace(/"/g, '\\"')}"`)
    if (next !== candidate) repairs.push('single-to-double-quotes')
    candidate = next
  }

  const repaired = tryParse(candidate)
  if (repaired) return { ...repaired, repairs }

  return { formatted: trimmed, error: 'Unable to auto-repair JSON. Please fix syntax manually.' }
}
