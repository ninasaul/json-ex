/** [start, end) of the line containing `pos` (end excludes trailing `\n`). */
export function lineBounds(source: string, pos: number): [number, number] {
  const i = Math.min(Math.max(0, pos), source.length)
  const start = source.lastIndexOf('\n', i - 1) + 1
  const endIdx = source.indexOf('\n', i)
  const end = endIdx === -1 ? source.length : endIdx
  return [start, end]
}

export function wrapSelection(
  source: string,
  selStart: number,
  selEnd: number,
  before: string,
  after: string,
  placeholderWhenEmpty: string,
): { text: string; selStart: number; selEnd: number } {
  const a = Math.min(selStart, selEnd)
  const b = Math.max(selStart, selEnd)
  const selected = source.slice(a, b)
  const inner = selected || placeholderWhenEmpty
  const text = source.slice(0, a) + before + inner + after + source.slice(b)
  const start = a + before.length
  const end = start + inner.length
  return { text, selStart: start, selEnd: end }
}

/** Prefixes the current line with `prefix` (e.g. `## `, `- `). */
export function prefixCurrentLine(
  source: string,
  pos: number,
  prefix: string,
): { text: string; selStart: number; selEnd: number } {
  const [ls, le] = lineBounds(source, pos)
  const line = source.slice(ls, le)
  const nextLine = line.startsWith(prefix) ? line : prefix + line
  const text = source.slice(0, ls) + nextLine + source.slice(le)
  const caret = Math.min(ls + nextLine.length, text.length)
  return { text, selStart: caret, selEnd: caret }
}

export function insertFence(
  source: string,
  selStart: number,
  selEnd: number,
  placeholder = 'code',
): { text: string; selStart: number; selEnd: number } {
  const a = Math.min(selStart, selEnd)
  const b = Math.max(selStart, selEnd)
  const inner = source.slice(a, b) || placeholder
  const open = '\n```\n'
  const close = '\n```\n'
  const block = open + inner + close
  const text = source.slice(0, a) + block + source.slice(b)
  const innerStart = a + open.length
  return { text, selStart: innerStart, selEnd: innerStart + inner.length }
}

export function insertHorizontalRule(source: string, pos: number): { text: string; selStart: number; selEnd: number } {
  const ins = source.length === 0 || source.endsWith('\n') ? '\n---\n' : '\n\n---\n'
  const text = source.slice(0, pos) + ins + source.slice(pos)
  const caret = pos + ins.length
  return { text, selStart: caret, selEnd: caret }
}

/** Turns the current line into a task list item (`- [ ] `), or strips a plain `- ` bullet first. */
export function prefixTaskCheckboxLine(source: string, pos: number): { text: string; selStart: number; selEnd: number } {
  const [ls, le] = lineBounds(source, pos)
  let line = source.slice(ls, le)
  if (line.startsWith('- [ ] ') || /^- \[[xX]\]\s/.test(line)) {
    return { text: source, selStart: pos, selEnd: pos }
  }
  if (line.startsWith('- ')) {
    line = line.slice(2)
  }
  const nextLine = '- [ ] ' + line
  const text = source.slice(0, ls) + nextLine + source.slice(le)
  const caret = Math.min(ls + nextLine.length, text.length)
  return { text, selStart: caret, selEnd: caret }
}

/** Inserts a GFM pipe table (3 columns); selection covers the first header cell label. */
export function insertMarkdownTable(
  source: string,
  pos: number,
  labels: { h1: string; h2: string; h3: string },
): { text: string; selStart: number; selEnd: number } {
  const { h1, h2, h3 } = labels
  const prefix = source.length === 0 || source.endsWith('\n') ? '\n' : '\n\n'
  const row1 = `| ${h1} | ${h2} | ${h3} |\n`
  const row2 = '| --- | --- | --- |\n'
  const row3 = '|  |  |  |\n'
  const block = prefix + row1 + row2 + row3
  const text = source.slice(0, pos) + block + source.slice(pos)
  const tableStart = pos + prefix.length
  const firstHeaderStart = tableStart + 2
  const firstHeaderEnd = firstHeaderStart + h1.length
  return { text, selStart: firstHeaderStart, selEnd: firstHeaderEnd }
}
