import { describe, expect, it } from 'vitest'
import { isMarkdownPreviewStyleId, MARKDOWN_PREVIEW_STYLE_IDS } from '@/lib/markdown-preview-styles'

describe('markdown-preview-styles', () => {
  it('validates known style ids', () => {
    for (const id of MARKDOWN_PREVIEW_STYLE_IDS) {
      expect(isMarkdownPreviewStyleId(id)).toBe(true)
    }
    expect(isMarkdownPreviewStyleId('unknown')).toBe(false)
    expect(isMarkdownPreviewStyleId('')).toBe(false)
  })
})
