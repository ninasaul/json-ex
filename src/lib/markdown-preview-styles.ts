import { cn } from '@/lib/utils'

export const MARKDOWN_PREVIEW_STYLE_STORAGE_KEY = 'sidefmt-markdown-preview-style'

export const MARKDOWN_PREVIEW_STYLE_IDS = ['default', 'minimal', 'serif', 'technical', 'soft'] as const

export type MarkdownPreviewStyleId = (typeof MARKDOWN_PREVIEW_STYLE_IDS)[number]

export function isMarkdownPreviewStyleId(value: string): value is MarkdownPreviewStyleId {
  return (MARKDOWN_PREVIEW_STYLE_IDS as readonly string[]).includes(value)
}

/** Shared rhythm: comfortable measure, list markers muted, emphasis balanced. */
const BASE =
  'markdown-preview mx-auto max-w-prose px-5 py-5 text-[0.9375rem] leading-[1.65] text-foreground antialiased ' +
  '[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:marker:text-muted-foreground/45 ' +
  '[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:marker:text-muted-foreground/50 ' +
  '[&_li]:my-1 [&_strong]:font-semibold'

/** Per-theme typography and surfaces: fewer borders, clearer hierarchy, restrained accents. */
const STYLE_SUFFIX: Record<MarkdownPreviewStyleId, string> = {
  default:
    '[&_h1]:mb-1 [&_h1]:mt-0 [&_h1]:text-balance [&_h1]:text-[1.375rem] [&_h1]:font-semibold [&_h1]:tracking-tight ' +
    '[&_h2]:mb-2 [&_h2]:mt-9 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:tracking-tight ' +
    '[&_h3]:mb-1.5 [&_h3]:mt-6 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground ' +
    '[&_p]:mb-3.5 [&_p]:text-pretty ' +
    '[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:decoration-primary/30 [&_a]:underline-offset-[3px] [&_a]:transition-colors hover:[&_a]:decoration-primary/60 ' +
    '[&_blockquote]:my-5 [&_blockquote]:rounded-r-md [&_blockquote]:border-l-[3px] [&_blockquote]:border-l-primary/18 [&_blockquote]:bg-muted/20 [&_blockquote]:py-2 [&_blockquote]:pl-4 [&_blockquote]:pr-3 [&_blockquote]:text-[0.92em] [&_blockquote]:text-muted-foreground ' +
    '[&_code]:rounded-md [&_code]:bg-muted/50 [&_code]:px-1.5 [&_code]:py-px [&_code]:font-mono [&_code]:text-[0.8125rem] ' +
    '[&_pre]:my-5 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-border/40 [&_pre]:bg-muted/15 [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-[0.8125rem] [&_pre]:leading-relaxed ' +
    '[&_table]:my-5 [&_table]:w-full [&_table]:border-separate [&_table]:border-spacing-0 [&_table]:overflow-hidden [&_table]:rounded-lg [&_table]:text-[0.9em] ' +
    '[&_th]:border-b [&_th]:border-border/55 [&_th]:bg-muted/25 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted-foreground ' +
    '[&_td]:border-b [&_td]:border-border/30 [&_td]:px-3 [&_td]:py-2 ' +
    '[&_tr:last-child_td]:border-b-0 ' +
    '[&_hr]:my-8 [&_hr]:h-px [&_hr]:border-0 [&_hr]:bg-border/50',

  minimal:
    '[&_h1]:mb-1 [&_h1]:mt-0 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:tracking-tight ' +
    '[&_h2]:mb-1.5 [&_h2]:mt-8 [&_h2]:text-sm [&_h2]:font-medium [&_h2]:text-muted-foreground ' +
    '[&_h3]:mb-1 [&_h3]:mt-5 [&_h3]:text-sm [&_h3]:font-medium ' +
    '[&_p]:mb-3 [&_p]:text-pretty ' +
    '[&_a]:text-foreground [&_a]:underline [&_a]:decoration-border/70 [&_a]:underline-offset-[5px] [&_a]:transition-colors hover:[&_a]:decoration-primary/40 ' +
    '[&_blockquote]:my-4 [&_blockquote]:border-l [&_blockquote]:border-foreground/8 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground ' +
    '[&_code]:rounded [&_code]:bg-muted/35 [&_code]:px-1 [&_code]:py-px [&_code]:font-mono [&_code]:text-[0.8125rem] ' +
    '[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted/20 [&_pre]:p-3.5 [&_pre]:font-mono [&_pre]:text-[0.8125rem] [&_pre]:leading-relaxed ' +
    '[&_table]:my-4 [&_table]:w-full [&_table]:text-sm ' +
    '[&_th]:border-b [&_th]:border-foreground/12 [&_th]:pb-2 [&_th]:pt-1 [&_th]:pr-3 [&_th]:text-left [&_th]:font-medium [&_th]:text-muted-foreground ' +
    '[&_td]:border-b [&_td]:border-border/20 [&_td]:py-2 [&_td]:pr-3 ' +
    '[&_hr]:my-7 [&_hr]:border-t [&_hr]:border-border/35',

  serif:
    'font-serif [&_code]:font-mono [&_pre]:font-mono ' +
    '[&_h1]:mb-2 [&_h1]:mt-0 [&_h1]:text-[1.625rem] [&_h1]:font-light [&_h1]:leading-snug [&_h1]:tracking-tight ' +
    '[&_h2]:mb-2 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-normal ' +
    '[&_h3]:mb-1.5 [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-medium ' +
    '[&_p]:mb-4 [&_p]:text-pretty [&_p]:leading-[1.72] ' +
    '[&_a]:text-primary [&_a]:underline [&_a]:decoration-primary/25 [&_a]:underline-offset-[5px] ' +
    '[&_blockquote]:my-6 [&_blockquote]:border-l [&_blockquote]:border-foreground/10 [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-muted-foreground ' +
    '[&_code]:rounded-sm [&_code]:bg-muted/45 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.8rem] not-italic ' +
    '[&_pre]:my-6 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border/30 [&_pre]:bg-muted/15 [&_pre]:p-4 [&_pre]:text-[0.8125rem] [&_pre]:leading-relaxed ' +
    '[&_table]:my-6 [&_table]:w-full [&_table]:border-collapse [&_th]:border-b [&_th]:border-foreground/10 [&_th]:py-2 [&_th]:pr-4 [&_th]:text-left [&_th]:text-sm [&_th]:font-medium ' +
    '[&_td]:border-b [&_td]:border-foreground/6 [&_td]:py-2 [&_td]:pr-4 ' +
    '[&_hr]:mx-auto [&_hr]:my-10 [&_hr]:h-px [&_hr]:w-12 [&_hr]:border-0 [&_hr]:bg-foreground/10',

  technical:
    '[&_h1]:mb-2 [&_h1]:mt-0 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:tracking-tight ' +
    '[&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:text-[11px] [&_h2]:font-semibold [&_h2]:uppercase [&_h2]:tracking-[0.14em] [&_h2]:text-muted-foreground ' +
    '[&_h3]:mb-1.5 [&_h3]:mt-5 [&_h3]:text-sm [&_h3]:font-semibold ' +
    '[&_p]:mb-3 [&_p]:text-pretty ' +
    '[&_a]:font-medium [&_a]:text-sky-600 [&_a]:underline [&_a]:decoration-sky-500/20 [&_a]:underline-offset-2 dark:[&_a]:text-sky-400 ' +
    '[&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-sky-500/25 [&_blockquote]:pl-3.5 [&_blockquote]:text-muted-foreground ' +
    '[&_code]:rounded-md [&_code]:border [&_code]:border-emerald-600/12 [&_code]:bg-emerald-500/[0.06] [&_code]:px-1.5 [&_code]:py-px [&_code]:font-mono [&_code]:text-[0.8125rem] dark:[&_code]:border-emerald-400/15 ' +
    '[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-zinc-950 [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-[13px] [&_pre]:leading-relaxed [&_pre]:text-zinc-100 [&_pre]:ring-1 [&_pre]:ring-inset [&_pre]:ring-white/10 dark:[&_pre]:ring-white/[0.06] [&_pre_code]:bg-transparent [&_pre_code]:p-0 ' +
    '[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs ' +
    '[&_th]:border [&_th]:border-border/45 [&_th]:bg-muted/35 [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold ' +
    '[&_td]:border [&_td]:border-border/35 [&_td]:px-2.5 [&_td]:py-1.5 ' +
    '[&_hr]:my-7 [&_hr]:border-t [&_hr]:border-dashed [&_hr]:border-border/45',

  soft:
    '[&_h1]:mb-2 [&_h1]:mt-0 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:tracking-tight ' +
    '[&_h2]:mb-2 [&_h2]:mt-7 [&_h2]:text-lg [&_h2]:font-semibold ' +
    '[&_h3]:mb-1.5 [&_h3]:mt-5 [&_h3]:text-base [&_h3]:font-medium ' +
    '[&_p]:mb-3.5 [&_p]:text-pretty ' +
    '[&_a]:text-primary [&_a]:underline [&_a]:decoration-primary/20 [&_a]:underline-offset-4 ' +
    '[&_blockquote]:my-5 [&_blockquote]:rounded-xl [&_blockquote]:border-l-[3px] [&_blockquote]:border-l-primary/22 [&_blockquote]:bg-muted/18 [&_blockquote]:px-4 [&_blockquote]:py-2.5 [&_blockquote]:text-muted-foreground ' +
    '[&_code]:rounded-lg [&_code]:bg-muted/50 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.8125rem] ' +
    '[&_pre]:my-5 [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:border [&_pre]:border-border/35 [&_pre]:bg-muted/18 [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-[0.8125rem] [&_pre]:shadow-sm ' +
    '[&_table]:my-5 [&_table]:w-full [&_table]:overflow-hidden [&_table]:rounded-xl [&_table]:border [&_table]:border-border/35 [&_table]:border-separate [&_table]:border-spacing-0 ' +
    '[&_th]:border-b [&_th]:border-border/40 [&_th]:bg-muted/28 [&_th]:px-3.5 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium ' +
    '[&_td]:border-b [&_td]:border-border/25 [&_td]:px-3.5 [&_td]:py-2 ' +
    '[&_hr]:mx-auto [&_hr]:my-8 [&_hr]:h-px [&_hr]:max-w-[10rem] [&_hr]:border-0 [&_hr]:bg-border/55',
}

export function markdownPreviewBodyClassName(styleId: MarkdownPreviewStyleId): string {
  return cn(BASE, STYLE_SUFFIX[styleId])
}

export const MARKDOWN_PREVIEW_STYLE_OPTIONS: {
  id: MarkdownPreviewStyleId
  labelZh: string
  labelEn: string
}[] = [
  { id: 'default', labelZh: '默认', labelEn: 'Default' },
  { id: 'minimal', labelZh: '极简', labelEn: 'Minimal' },
  { id: 'serif', labelZh: '衬线', labelEn: 'Serif' },
  { id: 'technical', labelZh: '技术文档', labelEn: 'Technical' },
  { id: 'soft', labelZh: '柔和', labelEn: 'Soft' },
]
