import { lexer, marked, type Token, type Tokens } from 'marked'
import {
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type ILevelsOptions,
} from 'docx'

marked.setOptions({ gfm: true })

const BULLET_REF = 'sidefmt-md-bullet'
const ORDERED_REF = 'sidefmt-md-ordered'

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function headingLevelForDepth(depth: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
  const map = [
    HeadingLevel.HEADING_1,
    HeadingLevel.HEADING_2,
    HeadingLevel.HEADING_3,
    HeadingLevel.HEADING_4,
    HeadingLevel.HEADING_5,
    HeadingLevel.HEADING_6,
  ] as const
  return map[Math.min(Math.max(depth, 1), 6) - 1]
}

type InlineChild = TextRun | ExternalHyperlink

function inlineChildren(tokens: Token[] | undefined, bold = false, italics = false, strike = false): InlineChild[] {
  if (!tokens?.length) return [new TextRun({ text: ' ' })]
  const out: InlineChild[] = []
  for (const t of tokens) {
    switch (t.type) {
      case 'text':
      case 'escape':
        out.push(new TextRun({ text: 'text' in t ? t.text : '', bold, italics, strike }))
        break
      case 'strong':
        out.push(...inlineChildren(t.tokens, true, italics, strike))
        break
      case 'em':
        out.push(...inlineChildren(t.tokens, bold, true, strike))
        break
      case 'del':
        out.push(...inlineChildren(t.tokens, bold, italics, true))
        break
      case 'codespan':
        out.push(
          new TextRun({
            text: t.text,
            font: 'Courier New',
            shading: { fill: 'F4F4F5' },
            size: 20,
          }),
        )
        break
      case 'link':
        out.push(
          new ExternalHyperlink({
            link: t.href,
            children: inlineChildren(t.tokens, bold, italics, strike),
          }),
        )
        break
      case 'image':
        out.push(new TextRun({ text: t.text ? `[${t.text}]` : '[image]', italics: true, size: 20 }))
        break
      case 'br':
        out.push(new TextRun({ break: 1 }))
        break
      case 'checkbox':
        out.push(new TextRun({ text: t.checked ? '[x] ' : '[ ] ' }))
        break
      default:
        if ('text' in t && typeof (t as Tokens.Text).text === 'string') {
          out.push(new TextRun({ text: (t as Tokens.Text).text, bold, italics, strike }))
        } else if ('raw' in t && typeof t.raw === 'string') {
          out.push(new TextRun({ text: t.raw, bold, italics, strike }))
        }
        break
    }
  }
  return out.length ? out : [new TextRun({ text: ' ' })]
}

function listNumberingConfig() {
  const indent = (level: number) => ({
    left: convertInchesToTwip(0.22 * (level + 1)),
    hanging: convertInchesToTwip(0.16),
  })
  const bulletLevels: ILevelsOptions[] = [0, 1, 2].map((level) => ({
    level,
    format: LevelFormat.BULLET,
    text: level === 0 ? '\u2022' : '\u2013',
    alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: indent(level) } },
  }))

  const orderedLevels: ILevelsOptions[] = [0, 1, 2].map((level) => ({
    level,
    format: LevelFormat.DECIMAL,
    text: '%1.',
    alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: indent(level) } },
  }))

  return {
    config: [
      { reference: BULLET_REF, levels: bulletLevels },
      { reference: ORDERED_REF, levels: orderedLevels },
    ],
  } as const
}

function tableFromToken(token: Tokens.Table): Table {
  const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
  const headerRow = new TableRow({
    children: token.header.map(
      (cell) =>
        new TableCell({
          children: [new Paragraph({ children: inlineChildren(cell.tokens) })],
          shading: { fill: 'F8F8F8' },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          borders: {
            top: cellBorder,
            bottom: cellBorder,
            left: cellBorder,
            right: cellBorder,
          },
        }),
    ),
  })
  const bodyRows = token.rows.map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              children: [new Paragraph({ children: inlineChildren(cell.tokens) })],
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              borders: {
                top: cellBorder,
                bottom: cellBorder,
                left: cellBorder,
                right: cellBorder,
              },
            }),
        ),
      }),
  )
  return new Table({
    rows: [headerRow, ...bodyRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  })
}

function processList(list: Tokens.List, depth: number): Paragraph[] {
  const ref = list.ordered ? ORDERED_REF : BULLET_REF
  const out: Paragraph[] = []
  const level = Math.min(depth, 2)
  for (const item of list.items) {
    const prefix: InlineChild[] = []
    if (item.task) {
      prefix.push(new TextRun({ text: item.checked ? '[x] ' : '[ ] ' }))
    }
    for (const child of item.tokens) {
      if (child.type === 'list') {
        out.push(...processList(child as Tokens.List, depth + 1))
      } else if (child.type === 'paragraph') {
        out.push(
          new Paragraph({
            numbering: { reference: ref, level },
            children: [...prefix, ...inlineChildren(child.tokens)],
          }),
        )
        prefix.length = 0
      } else if (child.type === 'code') {
        out.push(
          new Paragraph({
            numbering: { reference: ref, level },
            children: [
              ...prefix,
              new TextRun({
                text: child.text.replace(/\r\n/g, '\n'),
                font: 'Courier New',
                size: 20,
              }),
            ],
          }),
        )
        prefix.length = 0
      }
    }
  }
  return out
}

function blockquoteParagraphs(token: Tokens.Blockquote): Paragraph[] {
  return token.tokens
    .filter((x): x is Tokens.Paragraph => x.type === 'paragraph')
    .map(
      (p) =>
        new Paragraph({
          indent: { left: convertInchesToTwip(0.25) },
          children: inlineChildren(p.tokens, false, true),
        }),
    )
}

export async function buildMarkdownDocxBlob(md: string): Promise<Blob> {
  const tokens = lexer(md.trim() || '')
  const children: (Paragraph | Table)[] = []

  for (const token of tokens) {
    switch (token.type) {
      case 'space':
        break
      case 'heading':
        children.push(
          new Paragraph({
            heading: headingLevelForDepth(token.depth),
            children: inlineChildren(token.tokens),
          }),
        )
        break
      case 'paragraph':
        children.push(new Paragraph({ children: inlineChildren(token.tokens) }))
        break
      case 'code':
        children.push(
          new Paragraph({
            spacing: { before: 120, after: 120 },
            shading: { fill: 'F4F4F5' },
            children: [
              new TextRun({
                text: token.text.replace(/\r\n/g, '\n'),
                font: 'Courier New',
                size: 20,
              }),
            ],
          }),
        )
        break
      case 'blockquote':
        children.push(...blockquoteParagraphs(token as Tokens.Blockquote))
        break
      case 'list':
        children.push(...processList(token as Tokens.List, 0))
        break
      case 'table':
        children.push(tableFromToken(token as Tokens.Table))
        break
      case 'hr':
        children.push(
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'DDDDDD' } },
            spacing: { after: 120 },
            children: [new TextRun({ text: '' })],
          }),
        )
        break
      case 'html':
        children.push(new Paragraph({ text: token.text.replace(/\s+/g, ' ').slice(0, 4000) }))
        break
      default:
        if ('text' in token && typeof (token as Tokens.Text).text === 'string') {
          children.push(new Paragraph({ text: (token as Tokens.Text).text }))
        } else if ('raw' in token && typeof token.raw === 'string') {
          children.push(new Paragraph({ text: token.raw.slice(0, 2000) }))
        }
        break
    }
  }

  if (children.length === 0) {
    children.push(new Paragraph({ text: ' ' }))
  }

  const doc = new Document({
    numbering: listNumberingConfig(),
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children,
      },
    ],
  })

  return Packer.toBlob(doc)
}

export async function downloadMarkdownDocx(md: string, filename = 'document.docx'): Promise<void> {
  const blob = await buildMarkdownDocxBlob(md)
  triggerDownload(blob, filename)
}
