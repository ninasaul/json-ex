import { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons'

interface CollapsedState {
  [path: string]: boolean
}

export function useCollapse() {
  const [collapsed, setCollapsed] = useState<CollapsedState>({})

  const toggle = useCallback((path: string) => {
    setCollapsed((prev) => {
      const next = { ...prev }
      if (next[path]) {
        delete next[path]
      } else {
        next[path] = true
      }
      return next
    })
  }, [])

  const collapseAll = useCallback((paths: string[]) => {
    setCollapsed(Object.fromEntries(paths.map((p) => [p, true])))
  }, [])

  const expandAll = useCallback(() => {
    setCollapsed({})
  }, [])

  return { collapsed, toggle, collapseAll, expandAll }
}

type Segment = { text: string; cls?: string }

interface LineData {
  indent: number
  path: string | null   // non-null for collapsible nodes
  isCollapsed: boolean
  segments: Segment[]
}

function jsonSegments(value: unknown, keyName?: string): Segment[] {
  const segs: Segment[] = []
  if (keyName !== undefined) {
    segs.push({ text: JSON.stringify(keyName), cls: 'json-key' })
    segs.push({ text: ': ' })
  }
  if (value === null) {
    segs.push({ text: 'null', cls: 'json-null' })
  } else if (typeof value === 'string') {
    segs.push({ text: JSON.stringify(value), cls: 'json-string' })
  } else if (typeof value === 'boolean') {
    segs.push({ text: String(value), cls: 'json-boolean' })
  } else if (typeof value === 'number') {
    segs.push({ text: String(value), cls: 'json-number' })
  }
  return segs
}

function summaryText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.length === 0 ? 'empty' : `${value.length} item${value.length !== 1 ? 's' : ''}`
  }
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value)
    return keys.length === 0 ? 'empty' : `${keys.length} key${keys.length !== 1 ? 's' : ''}`
  }
  return ''
}

function buildLines(
  value: unknown,
  path: string,
  indent: number,
  collapsed: CollapsedState,
  keyName?: string,
): LineData[] {
  // Primitive values
  if (value === null || typeof value !== 'object') {
    return [{
      indent,
      path: null,
      isCollapsed: false,
      segments: jsonSegments(value, keyName),
    }]
  }

  const isArray = Array.isArray(value)
  const open = isArray ? '[' : '{'
  const close = isArray ? ']' : '}'
  const isCollapsed = collapsed[path] === true
  const isEmpty = isArray ? (value as unknown[]).length === 0 : Object.keys(value as object).length === 0

  const openSegments: Segment[] = []
  if (keyName !== undefined) {
    openSegments.push({ text: JSON.stringify(keyName), cls: 'json-key' })
    openSegments.push({ text: ': ' })
  }
  openSegments.push({ text: open, cls: 'json-bracket' })

  // Empty object/array — render on one line
  if (isEmpty) {
    openSegments.push({ text: close, cls: 'json-bracket' })
    return [{
      indent,
      path: null,
      isCollapsed: false,
      segments: openSegments,
    }]
  }

  const lines: LineData[] = []

  // Opening line
  lines.push({
    indent,
    path,
    isCollapsed,
    segments: openSegments,
  })

  // Collapsed: summary on same line
  if (isCollapsed) {
    const last = lines[lines.length - 1]
    last.segments = [
      ...last.segments,
      { text: ` ${summaryText(value)} ` },
      { text: close, cls: 'json-bracket' },
    ]
    last.path = path
    last.isCollapsed = true
    return lines
  }

  // Children
  if (isArray) {
    const arr = value as unknown[]
    arr.forEach((item, i) => {
      const childLines = buildLines(item, `${path}[${i}]`, indent + 1, collapsed)
      lines.push(...childLines)
      // Mark last child line with trailing comma
      if (i < arr.length - 1 && childLines.length > 0) {
        const lastChild = lines[lines.length - 1]
        lastChild.segments = [...lastChild.segments, { text: ',', cls: 'json-bracket' }]
      }
    })
  } else {
    const entries = Object.entries(value as Record<string, unknown>)
    entries.forEach(([k, v], i) => {
      const childLines = buildLines(v, `${path}.${k}`, indent + 1, collapsed, k)
      lines.push(...childLines)
      if (i < entries.length - 1 && childLines.length > 0) {
        const lastChild = lines[lines.length - 1]
        lastChild.segments = [...lastChild.segments, { text: ',', cls: 'json-bracket' }]
      }
    })
  }

  // Closing line
  lines.push({
    indent,
    path: null,
    isCollapsed: false,
    segments: [{ text: close, cls: 'json-bracket' }],
  })

  return lines
}

export function collectPaths(obj: unknown, parentPath: string): string[] {
  const paths: string[] = [parentPath]
  if (obj !== null && typeof obj === 'object') {
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => {
        paths.push(...collectPaths(item, `${parentPath}[${i}]`))
      })
    } else {
      Object.entries(obj as Record<string, unknown>).forEach(([k, v]) => {
        paths.push(...collectPaths(v, `${parentPath}.${k}`))
      })
    }
  }
  return paths
}

export function useJsonLines(
  data: unknown | undefined,
  collapsed: CollapsedState,
): LineData[] {
  return useMemo(() => {
    if (data === undefined) return []

    // Fast path: if collapsed hasn't changed for a path, reuse cache
    // For simplicity, just rebuild (fast enough for typical JSON sizes)
    return buildLines(data, '$', 0, collapsed)
  }, [data, collapsed])
}

// ---- Render component ----

interface JsonTreeProps {
  lines: LineData[]
  indentSize: number
  onToggle: (path: string) => void
  editorStyle?: React.CSSProperties
}

export function JsonTree({ lines, indentSize, onToggle, editorStyle }: JsonTreeProps) {
  return (
    <div className="py-3 pb-6 pe-3 ps-3 font-mono text-xs leading-relaxed" style={editorStyle}>
      {lines.map((line, i) => {
        const hasToggle = line.path !== null
        const indentPad = line.indent * indentSize * 8

        return (
          <div
            key={i}
            className="flex min-h-5.5 transition-colors hover:bg-muted/15"
          >
            <span className="w-10 shrink-0 select-none pe-3 pt-px text-right text-muted-foreground/70">
              {i + 1}
            </span>
            <div className="flex shrink-0 items-start pt-px">
              <div className="flex w-4 shrink-0 justify-center">
                {hasToggle ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-4 h-5.5 min-h-0 min-w-4 shrink-0 rounded-sm p-0"
                    onClick={() => onToggle(line.path!)}
                    aria-label={line.isCollapsed ? 'Expand' : 'Collapse'}
                  >
                    {line.isCollapsed ? (
                      <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} className="h-3 w-3 text-muted-foreground" />
                    )}
                  </Button>
                ) : null}
              </div>
            </div>

            <span
              className="flex-1 min-w-0 leading-relaxed pr-2 whitespace-pre"
              style={{ paddingLeft: `${indentPad}px` }}
            >
              {line.segments.map((seg, j) => (
                <span key={j} className={seg.cls}>{seg.text}</span>
              ))}
            </span>
          </div>
        )
      })}
    </div>
  )
}
