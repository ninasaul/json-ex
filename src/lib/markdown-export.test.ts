import { describe, expect, it } from 'vitest'
import { buildMarkdownHtmlDocument } from '@/lib/markdown-export-html'

describe('markdown-export', () => {
  it('builds a standalone HTML document with rendered body', () => {
    const html = buildMarkdownHtmlDocument('# Hi\n\n**Bold**', 'en')
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<article')
    expect(html).toContain('<h1>Hi</h1>')
    expect(html).toContain('<strong>Bold</strong>')
  })
})
