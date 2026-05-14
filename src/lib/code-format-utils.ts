import {
  applyJsonFormatStyle,
  syntaxHighlightCode,
  syntaxHighlightPlain,
  type JsonFormatLineEnding,
} from '@/lib/json-utils'
import { syntaxHighlightYaml } from '@/lib/convert-utils'

export type CodeFormatKind = 'typescript' | 'javascript' | 'html' | 'css' | 'markdown' | 'yaml' | 'graphql'

export const CODE_FORMAT_KINDS: CodeFormatKind[] = [
  'typescript',
  'javascript',
  'html',
  'css',
  'markdown',
  'yaml',
  'graphql',
]

export function highlightCodeOutput(code: string, kind: CodeFormatKind): string {
  if (kind === 'yaml') return syntaxHighlightYaml(code)
  if (kind === 'typescript' || kind === 'javascript' || kind === 'graphql') {
    return syntaxHighlightCode(code, 'ts')
  }
  return syntaxHighlightPlain(code)
}

function asPlugin(m: { default?: unknown } | unknown): unknown {
  if (m && typeof m === 'object' && 'default' in m && (m as { default: unknown }).default) {
    return (m as { default: unknown }).default
  }
  return m
}

export interface CodeFormatStyleOptions {
  useTabs: boolean
  tabWidth: number
  lineEnding: JsonFormatLineEnding
  trailingNewline: boolean
}

export type CodeFormatResult = { formatted: string } | { error: string }

/**
 * Formats source with Prettier in the browser (standalone bundle).
 * Intentionally excludes JSON: use the JSON workspace for JSON repair / JSON5 / converters.
 */
export async function formatCodeWithPrettier(
  source: string,
  kind: CodeFormatKind,
  style: CodeFormatStyleOptions,
): Promise<CodeFormatResult> {
  const trimmed = source.trim()
  if (!trimmed) {
    return { error: '__empty__' }
  }

  const prettier = await import('prettier/standalone')
  const format = prettier.format

  let parser: string
  let plugins: unknown[]

  try {
    switch (kind) {
      case 'typescript': {
        const [estree, typescript] = await Promise.all([
          import('prettier/plugins/estree'),
          import('prettier/plugins/typescript'),
        ])
        parser = 'typescript'
        plugins = [asPlugin(estree), asPlugin(typescript)]
        break
      }
      case 'javascript': {
        const [estree, babel] = await Promise.all([
          import('prettier/plugins/estree'),
          import('prettier/plugins/babel'),
        ])
        parser = 'babel'
        plugins = [asPlugin(estree), asPlugin(babel)]
        break
      }
      case 'html': {
        const html = await import('prettier/plugins/html')
        parser = 'html'
        plugins = [asPlugin(html)]
        break
      }
      case 'css': {
        const postcss = await import('prettier/plugins/postcss')
        parser = 'css'
        plugins = [asPlugin(postcss)]
        break
      }
      case 'markdown': {
        const md = await import('prettier/plugins/markdown')
        parser = 'markdown'
        plugins = [asPlugin(md)]
        break
      }
      case 'yaml': {
        const yaml = await import('prettier/plugins/yaml')
        parser = 'yaml'
        plugins = [asPlugin(yaml)]
        break
      }
      case 'graphql': {
        const gql = await import('prettier/plugins/graphql')
        parser = 'graphql'
        plugins = [asPlugin(gql)]
        break
      }
      default: {
        const _exhaust: never = kind
        return { error: String(_exhaust) }
      }
    }

    const raw = await format(trimmed, {
      parser,
      plugins,
      tabWidth: style.tabWidth,
      useTabs: style.useTabs,
      endOfLine: style.lineEnding === 'crlf' ? 'crlf' : 'lf',
      printWidth: 100,
    } as import('prettier').Options)

    const styled = applyJsonFormatStyle(raw, style.lineEnding, style.trailingNewline)
    return { formatted: styled }
  } catch (e) {
    const msg = (e as Error).message ?? String(e)
    return { error: msg }
  }
}
