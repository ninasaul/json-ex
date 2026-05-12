import { useRef, useCallback, useMemo, useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { markdownRehypeHighlightPlugins } from '@/lib/markdown-rehype-highlight'
import { Panel, Group, Separator as ResizeHandle } from 'react-resizable-panels'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { copyToClipboard } from '@/lib/json-utils'
import { downloadMarkdownHtml, printMarkdownAsPdf } from '@/lib/markdown-export-html'
import {
  insertFence,
  insertHorizontalRule,
  insertMarkdownTable,
  prefixCurrentLine,
  prefixTaskCheckboxLine,
  wrapSelection,
} from '@/lib/markdown-editor-insert'
import { HugeiconsIcon } from '@hugeicons/react'
import { toast } from 'sonner'
import {
  CodeIcon,
  CodeSquareIcon,
  Copy01Icon,
  Doc01Icon,
  EraserIcon,
  FileDownloadIcon,
  FileUploadIcon,
  Heading01Icon,
  Heading02Icon,
  Heading03Icon,
  HtmlFile01Icon,
  Image01Icon,
  Link01Icon,
  ListPlusIcon,
  ListStartIcon,
  MinusSignIcon,
  Pdf01Icon,
  QuoteUpIcon,
  RedoIcon,
  TableIcon,
  TextBoldIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  Tick02Icon,
  UndoIcon,
} from '@hugeicons/core-free-icons'
import type { Lang } from '@/lib/i18n'
import {
  isMarkdownPreviewStyleId,
  MARKDOWN_PREVIEW_STYLE_OPTIONS,
  MARKDOWN_PREVIEW_STYLE_STORAGE_KEY,
  markdownPreviewBodyClassName,
  type MarkdownPreviewStyleId,
} from '@/lib/markdown-preview-styles'

const STORAGE_KEY = 'jsonex-markdown-draft'
const MAX_EDITOR_HISTORY = 80

function preventBlur(e: React.MouseEvent) {
  e.preventDefault()
}

/** Short vertical rule: outer cell matches `size-7` buttons so the line is visually centered. */
function MarkdownToolbarDivider() {
  return (
    <span className="mx-0.5 inline-flex h-7 shrink-0 items-center justify-center" aria-hidden>
      <span className="h-3 w-px shrink-0 rounded-full bg-border" />
    </span>
  )
}

export interface MarkdownWorkspaceProps {
  lang: Lang
  splitHandleClass: string
  resizeAria: string
  editorFontSize: number
  setA11yError: (value: string | null) => void
}

export function MarkdownWorkspace({ lang, splitHandleClass, resizeAria, editorFontSize, setA11yError }: MarkdownWorkspaceProps) {
  const [markdown, setMarkdown] = useState('')
  const [copied, setCopied] = useState(false)
  const [docxExporting, setDocxExporting] = useState(false)
  const [historyVersion, setHistoryVersion] = useState(0)
  const [previewStyle, setPreviewStyle] = useState<MarkdownPreviewStyleId>(() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(MARKDOWN_PREVIEW_STYLE_STORAGE_KEY) : null
      if (raw && isMarkdownPreviewStyleId(raw)) return raw
    } catch {
      //
    }
    return 'default'
  })
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const selectionRestore = useRef<{ start: number; end: number } | null>(null)
  const undoStackRef = useRef<string[]>([])
  const redoStackRef = useRef<string[]>([])

  const bumpHistory = useCallback(() => {
    setHistoryVersion((n) => n + 1)
  }, [])

  const resetEditorHistory = useCallback(() => {
    undoStackRef.current = []
    redoStackRef.current = []
    bumpHistory()
  }, [bumpHistory])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (typeof raw === 'string') setMarkdown(raw)
    } catch {
      //
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, markdown)
    } catch {
      //
    }
  }, [markdown])

  useEffect(() => {
    try {
      localStorage.setItem(MARKDOWN_PREVIEW_STYLE_STORAGE_KEY, previewStyle)
    } catch {
      //
    }
  }, [previewStyle])

  useEffect(() => {
    if (!selectionRestore.current) return
    const el = textareaRef.current
    if (!el) {
      selectionRestore.current = null
      return
    }
    const { start, end } = selectionRestore.current
    selectionRestore.current = null
    el.focus()
    el.setSelectionRange(start, end)
  }, [markdown])

  const editorStyle = useMemo(
    () => ({ fontSize: `${editorFontSize}px`, lineHeight: 1.65 } as const),
    [editorFontSize],
  )

  const applyEdit = useCallback(
    (fn: (src: string, a: number, b: number) => { text: string; selStart: number; selEnd: number }) => {
      const el = textareaRef.current
      if (!el) return
      const a = el.selectionStart
      const b = el.selectionEnd
      setMarkdown((prev) => {
        const undo = undoStackRef.current
        if (undo.length >= MAX_EDITOR_HISTORY) undo.shift()
        undo.push(prev)
        redoStackRef.current = []
        const r = fn(prev, a, b)
        selectionRestore.current = { start: r.selStart, end: r.selEnd }
        queueMicrotask(bumpHistory)
        return r.text
      })
    },
    [bumpHistory],
  )

  const handleUndo = useCallback(() => {
    setMarkdown((current) => {
      const undo = undoStackRef.current
      if (undo.length === 0) return current
      const prevSnap = undo.pop()!
      const redo = redoStackRef.current
      if (redo.length >= MAX_EDITOR_HISTORY) redo.shift()
      redo.push(current)
      selectionRestore.current = { start: prevSnap.length, end: prevSnap.length }
      queueMicrotask(bumpHistory)
      return prevSnap
    })
  }, [bumpHistory])

  const handleRedo = useCallback(() => {
    setMarkdown((current) => {
      const redo = redoStackRef.current
      if (redo.length === 0) return current
      const nextSnap = redo.pop()!
      const undo = undoStackRef.current
      if (undo.length >= MAX_EDITOR_HISTORY) undo.shift()
      undo.push(current)
      selectionRestore.current = { start: nextSnap.length, end: nextSnap.length }
      queueMicrotask(bumpHistory)
      return nextSnap
    })
  }, [bumpHistory])

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(markdown)
    if (!ok) {
      const msg = lang === 'zh' ? '复制失败，请检查剪贴板权限。' : 'Copy failed. Check clipboard permissions.'
      setA11yError(msg)
      return
    }
    setA11yError(null)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }, [markdown, lang, setA11yError])

  const handleExportHtml = useCallback(() => {
    if (!markdown.trim()) return
    try {
      downloadMarkdownHtml(markdown, lang)
      setA11yError(null)
    } catch {
      setA11yError(lang === 'zh' ? '导出 HTML 失败。' : 'HTML export failed.')
      toast.error(lang === 'zh' ? '导出 HTML 失败。' : 'HTML export failed.')
    }
  }, [markdown, lang, setA11yError])

  const handleExportPdf = useCallback(() => {
    if (!markdown.trim()) return
    const ok = printMarkdownAsPdf(markdown, lang)
    if (!ok) {
      const msg = lang === 'zh' ? '无法打开打印窗口，请检查浏览器是否拦截弹出窗口。' : 'Could not open print window. Check if pop-ups are blocked.'
      setA11yError(msg)
      toast.error(msg)
      return
    }
    setA11yError(null)
  }, [markdown, lang, setA11yError])

  const handleExportDocx = useCallback(async () => {
    if (!markdown.trim() || docxExporting) return
    setDocxExporting(true)
    try {
      const { downloadMarkdownDocx } = await import('@/lib/markdown-export-docx')
      await downloadMarkdownDocx(markdown)
      setA11yError(null)
      toast.success(lang === 'zh' ? '已导出 Word' : 'Word document exported')
    } catch {
      const msg = lang === 'zh' ? '导出 Word 失败。' : 'Word export failed.'
      setA11yError(msg)
      toast.error(msg)
    } finally {
      setDocxExporting(false)
    }
  }, [markdown, lang, setA11yError, docxExporting])

  const handleDownload = useCallback(() => {
    if (!markdown.trim()) return
    try {
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'document.md'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setA11yError(null)
    } catch {
      setA11yError(lang === 'zh' ? '下载失败。' : 'Download failed.')
    }
  }, [markdown, lang, setA11yError])

  const handlePickFile = useCallback(() => {
    fileRef.current?.click()
  }, [])

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        resetEditorHistory()
        setMarkdown(text)
        setA11yError(null)
      } catch {
        setA11yError(lang === 'zh' ? '读取文件失败。' : 'Failed to read file.')
      }
      e.target.value = ''
    },
    [lang, setA11yError, resetEditorHistory],
  )

  const t = lang === 'zh'
    ? {
        edit: '编辑',
        preview: '预览',
        previewStyle: '预览风格',
        placeholder: '在此编写 Markdown…',
        upload: '上传 .md',
        copy: '复制',
        copied: '已复制',
        download: '下载 .md',
        exportTrigger: '导出',
        exportMenu: '导出为…',
        exportHtml: 'HTML 文件',
        exportPdf: 'PDF（打印为 PDF）',
        exportDocx: 'Word（.docx）',
        clear: '清空',
        emptyPreview: '（无内容）',
        toolbarAria: 'Markdown 插入与格式',
        tbBold: '粗体',
        tbItalic: '斜体',
        tbStrike: '删除线',
        tbCode: '行内代码',
        tbLink: '链接',
        tbImage: '图片 ![alt](url)',
        tbH1: '一级标题（行首）',
        tbH2: '二级标题（行首）',
        tbH3: '三级标题（行首）',
        tbBullet: '无序列表（行首）',
        tbOrdered: '有序列表（行首）',
        tbTask: '任务列表（行首）',
        tbQuote: '引用（行首）',
        tbFence: '代码块',
        tbTable: '表格（3 列）',
        tbHr: '分隔线',
        tbUndo: '撤销（工具栏操作）',
        tbRedo: '重做',
      }
    : {
        edit: 'Edit',
        preview: 'Preview',
        previewStyle: 'Preview style',
        placeholder: 'Write Markdown here…',
        upload: 'Upload .md',
        copy: 'Copy',
        copied: 'Copied',
        download: 'Download .md',
        exportTrigger: 'Export',
        exportMenu: 'Export as…',
        exportHtml: 'HTML file',
        exportPdf: 'PDF (print to PDF)',
        exportDocx: 'Word (.docx)',
        clear: 'Clear',
        emptyPreview: '(empty)',
        toolbarAria: 'Markdown insert and format',
        tbBold: 'Bold',
        tbItalic: 'Italic',
        tbStrike: 'Strikethrough',
        tbCode: 'Inline code',
        tbLink: 'Link',
        tbImage: 'Image ![alt](url)',
        tbH1: 'Heading 1 (line start)',
        tbH2: 'Heading 2 (line start)',
        tbH3: 'Heading 3 (line start)',
        tbBullet: 'Bullet list (line start)',
        tbOrdered: 'Numbered list (line start)',
        tbTask: 'Task list (line start)',
        tbQuote: 'Blockquote (line start)',
        tbFence: 'Code block',
        tbTable: 'Table (3 columns)',
        tbHr: 'Horizontal rule',
        tbUndo: 'Undo (toolbar edits)',
        tbRedo: 'Redo',
      }

  const previewClass = useMemo(() => markdownPreviewBodyClassName(previewStyle), [previewStyle])

  const ph = lang === 'zh' ? '文字' : 'text'
  const phImg = lang === 'zh' ? '说明' : 'alt'
  void historyVersion
  const canUndo = undoStackRef.current.length > 0
  const canRedo = redoStackRef.current.length > 0

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <input ref={fileRef} type="file" accept=".md,.markdown,text/markdown,text/plain" className="hidden" onChange={handleFile} />
      <Group orientation="horizontal" className="min-h-0 flex-1">
        <Panel defaultSize={50} minSize={24} className="flex min-h-0 min-w-0 flex-col overflow-hidden" style={{ overflow: 'hidden' }}>
          <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" aria-label={t.edit}>
            <div className="flex shrink-0 flex-col border-b border-border/60 bg-muted/10">
              <div className="flex h-9 min-h-9 items-center justify-between px-2">
                <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{t.edit}</h2>
                <div className="flex items-center gap-0.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon-sm" className="size-6 text-muted-foreground hover:text-foreground" aria-label={t.upload} onClick={handlePickFile}>
                        <HugeiconsIcon icon={FileUploadIcon} strokeWidth={2} className="size-3.5 shrink-0" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t.upload}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon-sm" className="size-6 text-muted-foreground hover:text-foreground" aria-label={t.copy} onClick={handleCopy} disabled={!markdown}>
                        {copied ? (
                          <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                        ) : (
                          <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} className="size-3.5 shrink-0 opacity-70" aria-hidden />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{copied ? t.copied : t.copy}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon-sm" className="size-6 text-muted-foreground hover:text-foreground" aria-label={t.download} onClick={handleDownload} disabled={!markdown.trim()}>
                        <HugeiconsIcon icon={FileDownloadIcon} strokeWidth={2} className="size-3.5 shrink-0 opacity-70" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t.download}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-6 text-muted-foreground hover:text-foreground"
                        aria-label={t.clear}
                        onClick={() => {
                          resetEditorHistory()
                          setMarkdown('')
                        }}
                        disabled={!markdown}
                      >
                        <HugeiconsIcon icon={EraserIcon} strokeWidth={2} className="size-3.5 shrink-0" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t.clear}</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <div
                role="toolbar"
                aria-label={t.toolbarAria}
                className="flex min-h-8 flex-wrap items-center gap-0.5 border-t border-border/50 px-1.5 py-1"
              >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon-sm" className="size-7 text-muted-foreground hover:text-foreground" aria-label={t.tbBold} onMouseDown={preventBlur} onClick={() => applyEdit((s, a, b) => wrapSelection(s, a, b, '**', '**', ph))}>
                        <HugeiconsIcon icon={TextBoldIcon} strokeWidth={2} className="size-3.5 shrink-0 opacity-80" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t.tbBold}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon-sm" className="size-7 text-muted-foreground hover:text-foreground" aria-label={t.tbItalic} onMouseDown={preventBlur} onClick={() => applyEdit((s, a, b) => wrapSelection(s, a, b, '*', '*', ph))}>
                        <HugeiconsIcon icon={TextItalicIcon} strokeWidth={2} className="size-3.5 shrink-0 opacity-80" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t.tbItalic}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon-sm" className="size-7 text-muted-foreground hover:text-foreground" aria-label={t.tbStrike} onMouseDown={preventBlur} onClick={() => applyEdit((s, a, b) => wrapSelection(s, a, b, '~~', '~~', ph))}>
                        <HugeiconsIcon icon={TextStrikethroughIcon} strokeWidth={2} className="size-3.5 shrink-0 opacity-80" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t.tbStrike}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon-sm" className="size-7 text-muted-foreground hover:text-foreground" aria-label={t.tbCode} onMouseDown={preventBlur} onClick={() => applyEdit((s, a, b) => wrapSelection(s, a, b, '`', '`', ph))}>
                        <HugeiconsIcon icon={CodeIcon} strokeWidth={2} className="size-3.5 shrink-0 opacity-80" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t.tbCode}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon-sm" className="size-7 text-muted-foreground hover:text-foreground" aria-label={t.tbLink} onMouseDown={preventBlur} onClick={() => applyEdit((s, a, b) => wrapSelection(s, a, b, '[', '](https://)', ph))}>
                        <HugeiconsIcon icon={Link01Icon} strokeWidth={2} className="size-3.5 shrink-0 opacity-80" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t.tbLink}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon-sm" className="size-7 text-muted-foreground hover:text-foreground" aria-label={t.tbImage} onMouseDown={preventBlur} onClick={() => applyEdit((s, a, b) => wrapSelection(s, a, b, '![', '](https://)', phImg))}>
                        <HugeiconsIcon icon={Image01Icon} strokeWidth={2} className="size-3.5 shrink-0 opacity-80" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t.tbImage}</TooltipContent>
                  </Tooltip>
                  <MarkdownToolbarDivider />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon-sm" className="size-7 text-muted-foreground hover:text-foreground" aria-label={t.tbUndo} onMouseDown={preventBlur} onClick={handleUndo} disabled={!canUndo}>
                        <HugeiconsIcon icon={UndoIcon} strokeWidth={2} className="size-3.5 shrink-0 opacity-80" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t.tbUndo}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon-sm" className="size-7 text-muted-foreground hover:text-foreground" aria-label={t.tbRedo} onMouseDown={preventBlur} onClick={handleRedo} disabled={!canRedo}>
                        <HugeiconsIcon icon={RedoIcon} strokeWidth={2} className="size-3.5 shrink-0 opacity-80" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t.tbRedo}</TooltipContent>
                  </Tooltip>
                  <MarkdownToolbarDivider />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon-sm" className="size-7 text-muted-foreground hover:text-foreground" aria-label={t.tbH1} onMouseDown={preventBlur} onClick={() => applyEdit((s, a, b) => prefixCurrentLine(s, a, '# '))}>
                        <HugeiconsIcon icon={Heading01Icon} strokeWidth={2} className="size-3.5 shrink-0 opacity-80" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t.tbH1}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon-sm" className="size-7 text-muted-foreground hover:text-foreground" aria-label={t.tbH2} onMouseDown={preventBlur} onClick={() => applyEdit((s, a, b) => prefixCurrentLine(s, a, '## '))}>
                        <HugeiconsIcon icon={Heading02Icon} strokeWidth={2} className="size-3.5 shrink-0 opacity-80" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t.tbH2}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon-sm" className="size-7 text-muted-foreground hover:text-foreground" aria-label={t.tbH3} onMouseDown={preventBlur} onClick={() => applyEdit((s, a, b) => prefixCurrentLine(s, a, '### '))}>
                        <HugeiconsIcon icon={Heading03Icon} strokeWidth={2} className="size-3.5 shrink-0 opacity-80" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t.tbH3}</TooltipContent>
                  </Tooltip>
                  <MarkdownToolbarDivider />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon-sm" className="size-7 text-muted-foreground hover:text-foreground" aria-label={t.tbBullet} onMouseDown={preventBlur} onClick={() => applyEdit((s, a, b) => prefixCurrentLine(s, a, '- '))}>
                        <HugeiconsIcon icon={ListPlusIcon} strokeWidth={2} className="size-3.5 shrink-0 opacity-80" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t.tbBullet}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon-sm" className="size-7 text-muted-foreground hover:text-foreground" aria-label={t.tbOrdered} onMouseDown={preventBlur} onClick={() => applyEdit((s, a, b) => prefixCurrentLine(s, a, '1. '))}>
                        <HugeiconsIcon icon={ListStartIcon} strokeWidth={2} className="size-3.5 shrink-0 opacity-80" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t.tbOrdered}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon-sm" className="size-7 text-muted-foreground hover:text-foreground" aria-label={t.tbTask} onMouseDown={preventBlur} onClick={() => applyEdit((s, a) => prefixTaskCheckboxLine(s, a))}>
                        <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-3.5 shrink-0 opacity-80" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t.tbTask}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon-sm" className="size-7 text-muted-foreground hover:text-foreground" aria-label={t.tbQuote} onMouseDown={preventBlur} onClick={() => applyEdit((s, a, b) => prefixCurrentLine(s, a, '> '))}>
                        <HugeiconsIcon icon={QuoteUpIcon} strokeWidth={2} className="size-3.5 shrink-0 opacity-80" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t.tbQuote}</TooltipContent>
                  </Tooltip>
                  <MarkdownToolbarDivider />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-7 text-muted-foreground hover:text-foreground"
                        aria-label={t.tbTable}
                        onMouseDown={preventBlur}
                        onClick={() =>
                          applyEdit((s, a) =>
                            insertMarkdownTable(s, a, {
                              h1: lang === 'zh' ? '列 1' : 'Col 1',
                              h2: lang === 'zh' ? '列 2' : 'Col 2',
                              h3: lang === 'zh' ? '列 3' : 'Col 3',
                            }),
                          )
                        }
                      >
                        <HugeiconsIcon icon={TableIcon} strokeWidth={2} className="size-3.5 shrink-0 opacity-80" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t.tbTable}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon-sm" className="size-7 text-muted-foreground hover:text-foreground" aria-label={t.tbFence} onMouseDown={preventBlur} onClick={() => applyEdit((s, a, b) => insertFence(s, a, b, lang === 'zh' ? '代码' : 'code'))}>
                        <HugeiconsIcon icon={CodeSquareIcon} strokeWidth={2} className="size-3.5 shrink-0 opacity-80" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t.tbFence}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon-sm" className="size-7 text-muted-foreground hover:text-foreground" aria-label={t.tbHr} onMouseDown={preventBlur} onClick={() => applyEdit((s, a) => insertHorizontalRule(s, a))}>
                        <HugeiconsIcon icon={MinusSignIcon} strokeWidth={2} className="size-3.5 shrink-0 opacity-80" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t.tbHr}</TooltipContent>
                  </Tooltip>
              </div>
            </div>
            <Textarea
              ref={textareaRef}
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder={t.placeholder}
              spellCheck={false}
              className="min-h-0 flex-1 resize-none rounded-none border-0 font-mono text-xs leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0"
              style={editorStyle}
            />
          </section>
        </Panel>
        <ResizeHandle id="resize-md-editor-preview" aria-label={resizeAria} className={splitHandleClass} />
        <Panel defaultSize={50} minSize={24} className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-muted/5" style={{ overflow: 'hidden' }}>
          <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" aria-label={t.preview}>
            <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-muted/10 px-3">
              <h2 className="min-w-0 shrink-0 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{t.preview}</h2>
              <div className="flex min-w-0 shrink-0 items-center gap-2">
                <Select
                  value={previewStyle}
                  onValueChange={(v) => {
                    if (isMarkdownPreviewStyleId(v)) setPreviewStyle(v)
                  }}
                >
                  <SelectTrigger className="max-w-38 text-xs" size="sm" aria-label={t.previewStyle}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end" collisionPadding={8}>
                    {MARKDOWN_PREVIEW_STYLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id} className="text-xs">
                        {lang === 'zh' ? opt.labelZh : opt.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 shrink-0 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                      aria-label={t.exportMenu}
                      disabled={!markdown.trim() || docxExporting}
                    >
                      {t.exportTrigger}
                    </Button>
                  </DropdownMenuTrigger>
                <DropdownMenuContent align="end" collisionPadding={8} className="min-w-44">
                  <DropdownMenuItem className="gap-2 text-xs" disabled={docxExporting} onSelect={handleExportHtml}>
                    <HugeiconsIcon icon={HtmlFile01Icon} strokeWidth={2} className="size-3.5 shrink-0 opacity-70" aria-hidden />
                    <span>{t.exportHtml}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 text-xs" disabled={docxExporting} onSelect={handleExportPdf}>
                    <HugeiconsIcon icon={Pdf01Icon} strokeWidth={2} className="size-3.5 shrink-0 opacity-70" aria-hidden />
                    <span>{t.exportPdf}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 text-xs" disabled={docxExporting} onSelect={() => void handleExportDocx()}>
                    <HugeiconsIcon icon={Doc01Icon} strokeWidth={2} className="size-3.5 shrink-0 opacity-70" aria-hidden />
                    <span>{t.exportDocx}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className={previewClass}>
                {markdown.trim() ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={markdownRehypeHighlightPlugins}>
                    {markdown}
                  </ReactMarkdown>
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">{t.emptyPreview}</p>
                )}
              </div>
            </ScrollArea>
          </section>
        </Panel>
      </Group>
    </main>
  )
}
