# SIDEFMT

**English** | [中文](./README.zh-CN.md)

SIDEFMT is a **Chrome Side Panel** extension for **JSON**, **general source code formatting**, and **Markdown**. Formatting, validation, diffing, conversion, type generation, Prettier-based code layout, and Markdown preview all run **in your browser** with no backend.

## Overview

Four top-level modes (header toggle):

| Mode | Purpose |
|------|---------|
| **JSON format** | Edit JSON, format/minify, tree view, converters, type output, repair/escape tools |
| **Code format** | Format TypeScript, JavaScript, HTML, CSS, Markdown, YAML, or GraphQL with **Prettier** (browser bundle); result pane syntax highlighting |
| **Markdown** | Split editor and live preview (GFM), optional preview themes, exports |
| **Diff** | Two JSON inputs, side-by-side diff with filters and copy |

UI language (Chinese / English), light/dark theme, and settings (font size, code colors, formatting rules for JSON and code format, header position, etc.) are available from the header.

**Code format** reuses the same style controls as JSON formatting where applicable: tab vs spaces, indent width (`2 / 4 / 8`), line endings `LF` / `CRLF`, and optional final newline. **JSON** documents should stay in **JSON format** mode (JSON5 repair, converters, tree); the code workspace intentionally does not replace that path.

## JSON (JSON format mode)

- **Format and minify** with indent `2 / 4 / 8` spaces or `Tab`
- **Line endings** `LF` / `CRLF` and optional **final newline** (settings)
- **Validation** with syntax error feedback
- **Syntax-highlighted** formatted output (themeable in settings)
- **Tree view** with collapse/expand when the document is not in the “heavy” size range (see below)
- **Repair JSON** (`JSON5` where applicable, plus best-effort fixes for comments, trailing commas, unquoted keys, single quotes)
- **Escape / unescape** strings
- **Upload** `.json` (and related) and **download** result (extension follows current output type)
- **Converters** (dropdown on the result toolbar): JSON ↔ YAML, JSON ↔ URL query string, JSON ↔ `application/x-www-form-urlencoded` style text, JSON ↔ CSV (with array/object paths where applicable)
- **Type generation** from JSON for: TypeScript, Java, Python, Go, C#, Rust, Kotlin, PHP, Swift, Ruby, C++
- **Auto-format** and **history** (format vs diff histories are separate; reuse, delete, or clear entries)

## Code format mode

- **Languages**: TypeScript, JavaScript, HTML, CSS, Markdown, YAML, GraphQL (parser selected in the toolbar)
- **Engine**: Prettier **standalone** in the browser with the matching official plugins (no CLI)
- **Shortcut**: `⌘+Enter` / `Ctrl+Enter` runs format
- **Output**: formatted text with read-only **syntax highlighting** on the result side (large outputs may fall back like the JSON result pane)
- **Style**: follows **Settings** / JSON format rules for tabs, indent width, line endings, and trailing newline

## Diff mode

- Two editors (base / target), **side-by-side** diff in the result area
- Options such as **ignore whitespace** and **show only changes**
- **Line-level** diff with **inline** character highlights where useful
- **Copy** diff text; very large pairs skip full diff for responsiveness (see below)

## Markdown mode

- **Left**: Markdown source, toolbar inserts (headings, lists, links, tables, code fences, task lists, undo/redo for toolbar edits, etc.), upload/copy/download/clear
- **Right**: **GFM** preview (`remark-gfm`), **syntax highlighting** in fenced code (`rehype-highlight` / lowlight)
- **Five built-in preview styles** (readable typography; choice persisted locally)
- **Export** preview-related outputs where supported (e.g. HTML, print/PDF flow, Word via bundled path)

Draft text can be persisted in **local storage** (same-origin, device-local).

## Large documents (“heavy” guardrails)

To keep the UI responsive, some features degrade when size limits are exceeded (implementation in `src/lib/heavy-input.ts`):

- **Single JSON text** over **350k characters**: tree view and rich syntax highlighting on the formatted pane are skipped; plain text fallback may be used
- **Diff pair** over per-side or combined thresholds: full side-by-side diff may be skipped with an on-screen notice
- **Code format** output uses similar heuristics for very large highlighted output

Adjust content or work in smaller chunks if you hit these limits.

## Tech stack

- React `19.x`, TypeScript `5.6.x`, Vite `8.x`
- Chrome **Manifest V3** via `@crxjs/vite-plugin`
- Tailwind CSS `4.x`, shadcn/ui, Radix UI / Base UI
- **Prettier** (`prettier/standalone` + plugins) for code format mode
- `react-markdown`, `remark-gfm`, `rehype-highlight`, `lowlight`, `marked` (where used for exports), `docx` (Word export path)

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Output is written to `dist/`. Optional manifest check:

```bash
npm run verify:manifest
```

## Load the extension in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** and select the `dist/` directory
4. Pin SIDEFMT or open it from the **Side panel**

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Preview production build |
| `npm run test` | Vitest once |
| `npm run test:watch` | Vitest watch |
| `npm run verify:manifest` | Manifest / extension sanity script |

## Repository layout (abbreviated)

```text
SIDEFMT/
├── public/              # manifest copy, theme-init, logo (see also dist after build)
├── src/
│   ├── App.tsx          # shell: modes, header, JSON/diff vs code vs markdown
│   ├── background.ts    # extension service worker
│   ├── components/      # UI including jsonex/* panels
│   │   └── jsonex/
│   │       └── code-format-workspace.tsx   # Prettier code format UI
│   ├── hooks/
│   └── lib/             # json-utils, code-format-utils, diff-utils, type-generator, …
├── docs/
│   ├── product.md       # product notes (Chinese)
│   └── screenshots/     # optional UI screenshots
├── scripts/
└── package.json
```

## Privacy

Core parsing, formatting, diffing, conversion, highlighting, Prettier formatting, and type generation do **not** require an external API. Data stays in the browser unless you explicitly export or copy it elsewhere. Preferences and history use `sidefmt-*` keys in local storage; one-time migration copies legacy `jsonex-*` keys from older builds on startup.

## Contributing

Issues and pull requests are welcome. For features, describe the use case and expected behavior.

## Roadmap (non-exhaustive)

- Key sorting and more formatting presets
- Richer JSON tree interactions (e.g. path copy)
- Structured diff / patch export formats
- History import/export
- Further performance work for very large payloads

## License

[MIT License](./LICENSE).
