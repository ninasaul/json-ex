import rehypeHighlight from 'rehype-highlight'
import type { PluggableList } from 'unified'

/** Fenced ``` blocks: lowlight common grammars + gentle language detect. */
export const markdownRehypeHighlightPlugins: PluggableList = [
  [rehypeHighlight, { detect: true, plainText: ['txt', 'text', 'plain', 'log', 'output'] }],
]
