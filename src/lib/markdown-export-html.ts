import { marked } from 'marked'
import type { Lang } from '@/lib/i18n'

marked.setOptions({ gfm: true })

const EXPORT_HTML_STYLES = `
  :root { color-scheme: light dark; }
  body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 15px; line-height: 1.6; margin: 0; padding: 24px; color: #111; background: #fff; }
  @media (prefers-color-scheme: dark) {
    body { color: #e8e8e8; background: #121212; }
    a { color: #7ab4ff; }
    th { background: #1e1e1e; }
    code, pre { background: #1e1e1e; border-color: #333; }
  }
  article { max-width: 52rem; margin: 0 auto; }
  h1,h2,h3,h4 { line-height: 1.25; margin: 1.25em 0 0.5em; font-weight: 600; }
  h1 { font-size: 1.75rem; }
  h2 { font-size: 1.35rem; }
  h3 { font-size: 1.15rem; }
  p { margin: 0.65em 0; }
  ul, ol { margin: 0.65em 0; padding-left: 1.5rem; }
  li { margin: 0.25em 0; }
  blockquote { margin: 0.75em 0; padding-left: 1rem; border-left: 3px solid #8884; color: #555; }
  @media (prefers-color-scheme: dark) { blockquote { color: #aaa; border-color: #6666; } }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.9em; padding: 0.15em 0.35em; border-radius: 4px; background: #f4f4f5; border: 1px solid #e4e4e7; }
  pre { overflow: auto; padding: 12px 14px; border-radius: 8px; background: #f4f4f5; border: 1px solid #e4e4e7; }
  pre code { padding: 0; border: none; background: none; font-size: 0.85em; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 0.95em; }
  th, td { border: 1px solid #d4d4d8; padding: 6px 10px; text-align: left; vertical-align: top; }
  th { background: #fafafa; font-weight: 600; }
  hr { border: none; border-top: 1px solid #ddd; margin: 2em 0; }
  a { color: #2563eb; }
`

function markdownToHtmlBody(md: string): string {
  return marked.parse(md.trim() || '', { async: false }) as string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildMarkdownHtmlDocument(md: string, lang: Lang): string {
  const title = lang === 'zh' ? 'Markdown 导出' : 'Markdown export'
  const body = markdownToHtmlBody(md)
  return `<!DOCTYPE html>
<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>${EXPORT_HTML_STYLES}</style>
</head>
<body>
<article class="markdown-body">${body}</article>
</body>
</html>`
}

export function downloadMarkdownHtml(md: string, lang: Lang, filename = 'document.html'): void {
  const doc = buildMarkdownHtmlDocument(md, lang)
  const blob = new Blob([doc], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** Opens a print dialog; user can choose “Save as PDF”. Returns whether a window could be opened. */
export function printMarkdownAsPdf(md: string, lang: Lang): boolean {
  const html = buildMarkdownHtmlDocument(md, lang)
  const w = window.open('', '_blank', 'noopener,noreferrer')
  if (!w) return false
  w.document.open()
  w.document.write(html)
  w.document.close()
  const runPrint = () => {
    try {
      w.focus()
      w.print()
    } catch {
      //
    }
  }
  if (w.document.readyState === 'complete') {
    window.setTimeout(runPrint, 250)
  } else {
    w.addEventListener('load', () => window.setTimeout(runPrint, 250))
  }
  return true
}
