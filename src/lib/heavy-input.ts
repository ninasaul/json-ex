import { escapeHtml } from '@/lib/html-escape'

/** Characters: above this threshold, syntax highlighting / tree / diff degrade for responsiveness. */
export const HEAVY_JSON_CHAR_THRESHOLD = 350_000

/** Combined formatted diff text budget before skipping side-by-side diff computation. */
export const HEAVY_DIFF_COMBINED_CHAR_THRESHOLD = 500_000

export function isHeavyJsonText(text: string): boolean {
  return text.length > HEAVY_JSON_CHAR_THRESHOLD
}

export function isHeavyDiffPair(left: string, right: string): boolean {
  return (
    isHeavyJsonText(left) ||
    isHeavyJsonText(right) ||
    left.length + right.length > HEAVY_DIFF_COMBINED_CHAR_THRESHOLD
  )
}

export function plainEscapeMultiline(code: string): string {
  return code
    .split('\n')
    .map((line) => escapeHtml(line))
    .join('\n')
}

export const HEAVY_DIFF_SKIP_ZH =
  '两侧格式化结果体积过大，已跳过并排 Diff 以保流畅。可将内容保存到本地对比，或精简 JSON 后再试。'

export const HEAVY_DIFF_SKIP_EN =
  'Formatted inputs are too large; side-by-side diff is skipped to keep the UI responsive. Compare locally or use smaller JSON.'
