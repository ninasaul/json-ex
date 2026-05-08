import yaml from 'js-yaml'

export type ConvertTarget = 'yaml' | 'json'

export interface ConvertResult {
  text: string
  target: ConvertTarget
}

export interface CsvConvertOptions {
  path?: string
}

export function suggestCsvPathsFromJson(jsonText: string): string[] {
  const trimmed = jsonText.trim()
  if (!trimmed) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed) as unknown
  } catch {
    return []
  }

  const results: string[] = []
  const visit = (value: unknown, path: string) => {
    if (Array.isArray(value)) {
      // Root array path is represented as "$".
      if (path === '$') results.push('$')
      else {
        const firstObj = value.find((item) => typeof item === 'object' && item !== null && !Array.isArray(item))
        if (firstObj) results.push(path)
      }
      // Continue exploration for nested arrays in objects.
      for (const item of value) {
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
            visit(v, `${path}.${k}`)
          }
        }
      }
      return
    }
    if (typeof value === 'object' && value !== null) {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        visit(v, path === '$' ? k : `${path}.${k}`)
      }
    }
  }

  visit(parsed, '$')
  return Array.from(new Set(results))
}

function escapeHtml(code: string): string {
  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function jsonToYaml(jsonText: string): ConvertResult {
  const trimmed = jsonText.trim()
  if (!trimmed) throw new Error('Empty input')
  const parsed = JSON.parse(trimmed) as unknown
  const text = yaml.dump(parsed, { noRefs: true, sortKeys: false })
  return { text, target: 'yaml' }
}

export function yamlToJson(yamlText: string, indent: number | '\t'): ConvertResult {
  const trimmed = yamlText.trim()
  if (!trimmed) throw new Error('Empty input')
  const parsed = yaml.load(trimmed) as unknown
  const text = JSON.stringify(parsed, null, indent)
  return { text, target: 'json' }
}

function parsePath(path: string): Array<string | number> {
  if (!path.trim()) return []
  return path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean)
    .map((seg) => (/^\d+$/.test(seg) ? Number(seg) : seg))
}

function getByPath(input: unknown, path: string): unknown {
  const segs = parsePath(path)
  let cur: unknown = input
  for (const seg of segs) {
    if (typeof seg === 'number') {
      if (!Array.isArray(cur) || seg < 0 || seg >= cur.length) throw new Error(`Invalid path: ${path}`)
      cur = cur[seg]
    } else {
      if (typeof cur !== 'object' || cur === null || !(seg in (cur as Record<string, unknown>))) throw new Error(`Invalid path: ${path}`)
      cur = (cur as Record<string, unknown>)[seg]
    }
  }
  return cur
}

function flattenObject(obj: Record<string, unknown>, prefix = '', out: Record<string, string> = {}): Record<string, string> {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[key] = String(v)
    } else if (Array.isArray(v)) {
      out[key] = JSON.stringify(v)
    } else if (typeof v === 'object') {
      flattenObject(v as Record<string, unknown>, key, out)
    } else {
      out[key] = String(v)
    }
  }
  return out
}

function toUrlEncodedPairs(
  input: unknown,
  opts: { arrayMode?: 'repeat' | 'json' } = {},
): Array<[string, string]> {
  const { arrayMode = 'repeat' } = opts
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('Root must be an object')
  }
  const pairs: Array<[string, string]> = []
  const visit = (val: unknown, key: string) => {
    if (val === null || typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
      pairs.push([key, String(val)])
      return
    }
    if (Array.isArray(val)) {
      if (arrayMode === 'repeat') {
        for (const item of val) {
          visit(item, key)
        }
      } else {
        pairs.push([key, JSON.stringify(val)])
      }
      return
    }
    if (typeof val === 'object') {
      for (const [k, child] of Object.entries(val as Record<string, unknown>)) {
        visit(child, key ? `${key}.${k}` : k)
      }
      return
    }
    pairs.push([key, String(val)])
  }
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    visit(v, k)
  }
  return pairs
}

function parseQueryLike(queryText: string): Record<string, string> {
  const trimmed = queryText.trim()
  if (!trimmed) throw new Error('Empty input')
  const src = trimmed.startsWith('?') ? trimmed.slice(1) : trimmed
  const out: Record<string, string | string[]> = {}
  for (const piece of src.split('&')) {
    if (!piece) continue
    const idx = piece.indexOf('=')
    if (idx < 0) {
      const key = decodeURIComponent(piece)
      const prev = out[key]
      if (prev === undefined) out[key] = ''
      else if (Array.isArray(prev)) prev.push('')
      else out[key] = [prev, '']
      continue
    }
    const k = decodeURIComponent(piece.slice(0, idx))
    const v = decodeURIComponent(piece.slice(idx + 1))
    const prev = out[k]
    if (prev === undefined) out[k] = v
    else if (Array.isArray(prev)) prev.push(v)
    else out[k] = [prev, v]
  }
  return out as Record<string, string>
}

function parseFormDataLike(text: string): Record<string, string> {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('Empty input')
  const out: Record<string, string | string[]> = {}
  const lines = trimmed.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  for (const line of lines) {
    const s = line.trim()
    if (!s) continue
    const idx = s.indexOf('=')
    if (idx < 0) {
      const prev = out[s]
      if (prev === undefined) out[s] = ''
      else if (Array.isArray(prev)) prev.push('')
      else out[s] = [prev, '']
      continue
    }
    const key = s.slice(0, idx).trim()
    const value = s.slice(idx + 1)
    const prev = out[key]
    if (prev === undefined) out[key] = value
    else if (Array.isArray(prev)) prev.push(value)
    else out[key] = [prev, value]
  }
  return out as Record<string, string>
}

function csvEscapeCell(cell: string): string {
  if (/[",\n]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`
  return cell
}

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let i = 0
  let inQuotes = false
  while (i < line.length) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i += 2
        continue
      }
      if (ch === '"') {
        inQuotes = false
        i += 1
        continue
      }
      cur += ch
      i += 1
      continue
    }
    if (ch === '"') {
      inQuotes = true
      i += 1
      continue
    }
    if (ch === ',') {
      out.push(cur)
      cur = ''
      i += 1
      continue
    }
    cur += ch
    i += 1
  }
  out.push(cur)
  return out
}

export function jsonToQueryString(jsonText: string): ConvertResult {
  const trimmed = jsonText.trim()
  if (!trimmed) throw new Error('Empty input')
  const parsed = JSON.parse(trimmed) as unknown
  const pairs = toUrlEncodedPairs(parsed, { arrayMode: 'repeat' })
  const text = pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
  return { text, target: 'json' }
}

export function queryStringToJson(queryText: string, indent: number | '\t'): ConvertResult {
  const obj = parseQueryLike(queryText)
  const text = JSON.stringify(obj, null, indent)
  return { text, target: 'json' }
}

export function jsonToFormDataText(jsonText: string): ConvertResult {
  const trimmed = jsonText.trim()
  if (!trimmed) throw new Error('Empty input')
  const parsed = JSON.parse(trimmed) as unknown
  const pairs = toUrlEncodedPairs(parsed, { arrayMode: 'repeat' })
  const text = pairs.map(([k, v]) => `${k}=${v}`).join('\n')
  return { text, target: 'json' }
}

export function formDataTextToJson(formDataText: string, indent: number | '\t'): ConvertResult {
  const obj = parseFormDataLike(formDataText)
  const text = JSON.stringify(obj, null, indent)
  return { text, target: 'json' }
}

export function jsonToCsv(jsonText: string, options: CsvConvertOptions = {}): ConvertResult {
  const trimmed = jsonText.trim()
  if (!trimmed) throw new Error('Empty input')
  let parsed = JSON.parse(trimmed) as unknown
  const normalizedPath = options.path?.trim()
  if (normalizedPath && normalizedPath !== '$') {
    parsed = getByPath(parsed, normalizedPath)
  }
  if (!Array.isArray(parsed)) throw new Error('CSV source must be an array')
  const rows = parsed as unknown[]
  if (rows.length === 0) return { text: '', target: 'json' }

  const normalized = rows.map((row) => {
    if (typeof row !== 'object' || row === null || Array.isArray(row)) {
      throw new Error('CSV array items must be objects')
    }
    return flattenObject(row as Record<string, unknown>)
  })
  const headers = Array.from(new Set(normalized.flatMap((r) => Object.keys(r))))
  const lines: string[] = []
  lines.push(headers.map(csvEscapeCell).join(','))
  for (const row of normalized) {
    lines.push(headers.map((h) => csvEscapeCell(row[h] ?? '')).join(','))
  }
  return { text: lines.join('\n'), target: 'json' }
}

export function csvToJson(csvText: string, indent: number | '\t'): ConvertResult {
  const trimmed = csvText.trim()
  if (!trimmed) throw new Error('Empty input')
  const lines = trimmed.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  if (lines.length === 0) throw new Error('Empty input')
  const headers = parseCsvLine(lines[0])
  const toTyped = (value: string): string | number | boolean | null => {
    const v = value.trim()
    if (v === '') return ''
    if (v === 'true') return true
    if (v === 'false') return false
    if (v === 'null') return null
    if (/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(v)) return Number(v)
    return value
  }

  const items: Record<string, string | number | boolean | null>[] = []
  for (let i = 1; i < lines.length; i += 1) {
    if (!lines[i].trim()) continue
    const cells = parseCsvLine(lines[i])
    const row: Record<string, string | number | boolean | null> = {}
    headers.forEach((h, idx) => {
      row[h] = toTyped(cells[idx] ?? '')
    })
    items.push(row)
  }
  const text = JSON.stringify(items, null, indent)
  return { text, target: 'json' }
}

export function syntaxHighlightYaml(yamlText: string): string {
  const lines = yamlText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  return lines.map((line) => {
    let html = escapeHtml(line)

    // comments (keep it simple: #... not inside quotes)
    html = html.replace(/(^|\s)(#.*)$/g, '$1<span class="code-comment">$2</span>')

    // keys: "key:" at line start (after indentation). Avoid matching list items "- key:"
    html = html.replace(
      /^(\s*-?\s*)([^:#]+?)(\s*):/g,
      (_, indent, key, colonSpace) => `${indent}<span class="code-keyword">${key}</span>${colonSpace}:`,
    )

    // strings (quoted)
    html = html.replace(/("([^"\\]|\\.)*")/g, '<span class="code-string">$1</span>')
    html = html.replace(/('([^'\\]|\\.)*')/g, '<span class="code-string">$1</span>')

    // booleans/null
    html = html.replace(/\b(true|false|null|~)\b/g, '<span class="json-boolean">$1</span>')

    // numbers
    html = html.replace(/\b(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g, '<span class="code-number">$1</span>')

    // brackets/braces
    html = html.replace(/([\[\]{}])/g, '<span class="json-bracket">$1</span>')

    return html || ' '
  }).join('\n')
}

