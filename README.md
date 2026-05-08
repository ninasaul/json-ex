# JsonEx

[English](./README.md) | [中文](./README.zh-CN.md)

Language: **English (default)** · [Switch to Chinese](./README.zh-CN.md)

JsonEx is a Chrome Side Panel extension for daily JSON workflows: format, validate, diff, and generate type definitions.  
All processing runs locally in the browser, with no backend dependency.

### Features

- **Format and Minify JSON**
  - Pretty print and minify in one click
  - Indent options: `2 / 4 / 8` spaces or `Tab`
  - Line ending options: `LF / CRLF`, optional final newline
- **Validation**
  - Detects invalid JSON and shows syntax errors
- **Tree View**
  - Visual JSON tree with collapse/expand support
- **Diff Mode**
  - Side-by-side compare for two JSON inputs
  - Ignore whitespace, show only changes, inline highlight
  - Copy diff output
- **Type Generation**
  - Generate types/models from JSON for:
  - `TS / Java / Python / Go / C# / Rust / Kotlin / PHP / Swift / Ruby / C++`
- **Editing Utilities**
  - Escape / unescape
  - Upload JSON files
  - Download generated output with proper file extension
  - Copy and clear actions
- **History**
  - Separate history for format mode and diff mode
  - Reuse, delete, and clear records quickly
- **UI and Preferences**
  - Built-in English/Chinese UI switch
  - Light/Dark themes
  - Configurable editor font size, code theme, header position
  - Auto-format and default history panel options

### Tech Stack

- React + TypeScript
- Vite
- Chrome Extension Manifest V3 (`@crxjs/vite-plugin`)
- Tailwind CSS
- shadcn/ui + Radix UI

### Development

```bash
npm install
npm run dev
```

### Build

```bash
npm run build
```

Build output is generated in `dist/`.

### Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist/` folder
5. Pin JsonEx or open it from Chrome Side Panel

### Screenshots

- `docs/screenshots/format-mode.png` - format mode with tree view
- `docs/screenshots/diff-mode.png` - side-by-side diff mode
- `docs/screenshots/type-generation.png` - multi-language type generation

### Scripts

- `npm run dev` - start development mode
- `npm run build` - build extension package
- `npm run preview` - preview production build
- `npm run test` - run unit tests once
- `npm run test:watch` - run unit tests in watch mode

### Project Structure

```text
JsonEx/
├── public/
│   ├── manifest.json
│   └── icons/
├── src/
│   ├── App.tsx
│   ├── background.ts
│   ├── components/
│   ├── hooks/
│   └── lib/
├── docs/
│   └── product.md
└── package.json
```

### Privacy

- All JSON parsing, formatting, diffing, and type generation run locally
- No external API is required for core features

### Contributing

Issues and pull requests are welcome.  
For feature requests, please include your use case and expected behavior.

### Roadmap

- [ ] Sort keys and more formatting presets
- [ ] Better JSON tree interactions and path copy
- [ ] JSON patch/diff export formats
- [ ] Session history import/export
- [ ] Large JSON performance optimizations

### License

Released under the [MIT License](./LICENSE).
