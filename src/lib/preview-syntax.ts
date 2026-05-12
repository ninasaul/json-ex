import { escapeHtml } from '@/lib/html-escape'

export function syntaxHighlightQueryString(text: string): string {
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

export function syntaxHighlightCsv(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  return lines
    .map((line, idx) => {
      const escaped = escapeHtml(line)
      const cols = escaped.split(',')
      if (idx === 0) {
        return cols.map((c) => `<span class="code-keyword">${c}</span>`).join('<span class="json-bracket">,</span>')
      }
      return cols.map((c) => `<span class="code-string">${c}</span>`).join('<span class="json-bracket">,</span>')
    })
    .join('\n')
}
