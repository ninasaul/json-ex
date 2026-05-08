export interface DiffRow {
  kind: 'context' | 'add' | 'remove' | 'modify'
  left?: string
  right?: string
}

export interface InlinePart {
  text: string
  changed: boolean
}

export function buildInlineParts(base: string, next: string): { left: InlinePart[]; right: InlinePart[] } {
  const a = Array.from(base)
  const b = Array.from(next)
  const n = a.length
  const m = b.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const left: InlinePart[] = []
  const right: InlinePart[] = []
  const pushPart = (parts: InlinePart[], text: string, changed: boolean) => {
    if (!text) return
    const last = parts[parts.length - 1]
    if (last && last.changed === changed) {
      last.text += text
      return
    }
    parts.push({ text, changed })
  }

  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      pushPart(left, a[i], false)
      pushPart(right, b[j], false)
      i += 1
      j += 1
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      pushPart(left, a[i], true)
      i += 1
    } else {
      pushPart(right, b[j], true)
      j += 1
    }
  }
  while (i < n) {
    pushPart(left, a[i], true)
    i += 1
  }
  while (j < m) {
    pushPart(right, b[j], true)
    j += 1
  }

  return { left, right }
}

export function buildDiffRows(sourceText: string, targetText: string, ignoreWhitespace: boolean): DiffRow[] {
  const source = sourceText.split('\n')
  const target = targetText.split('\n')
  const normalize = (value: string) => (ignoreWhitespace ? value.replace(/\s+/g, ' ').trim() : value)

  const n = source.length
  const m = target.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = normalize(source[i]) === normalize(target[j])
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const rows: DiffRow[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (normalize(source[i]) === normalize(target[j])) {
      rows.push({ kind: 'context', left: source[i], right: target[j] })
      i += 1
      j += 1
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({ kind: 'remove', left: source[i] })
      i += 1
    } else {
      rows.push({ kind: 'add', right: target[j] })
      j += 1
    }
  }
  while (i < n) {
    rows.push({ kind: 'remove', left: source[i] })
    i += 1
  }
  while (j < m) {
    rows.push({ kind: 'add', right: target[j] })
    j += 1
  }

  const merged: DiffRow[] = []
  for (let k = 0; k < rows.length; k += 1) {
    const cur = rows[k]
    const next = rows[k + 1]
    if (cur.kind === 'remove' && next?.kind === 'add') {
      merged.push({ kind: 'modify', left: cur.left, right: next.right })
      k += 1
    } else {
      merged.push(cur)
    }
  }
  return merged
}

export function summarizeDiffRows(rows: DiffRow[]): { adds: number; removes: number; modifies: number; total: number } {
  let adds = 0
  let removes = 0
  let modifies = 0
  for (const row of rows) {
    if (row.kind === 'add') adds += 1
    else if (row.kind === 'remove') removes += 1
    else if (row.kind === 'modify') modifies += 1
  }
  return { adds, removes, modifies, total: adds + removes + modifies }
}

export function formatDiffRowsForCopy(rows: DiffRow[]): string {
  return rows.map((row) => {
    if (row.kind === 'context') return `  ${row.left ?? row.right ?? ''}`
    if (row.kind === 'add') return `+ ${row.right ?? ''}`
    if (row.kind === 'remove') return `- ${row.left ?? ''}`
    return `~ ${row.left ?? ''} -> ${row.right ?? ''}`
  }).join('\n')
}

