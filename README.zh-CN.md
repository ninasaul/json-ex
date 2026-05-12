# JsonEx

[English](./README.md) | **中文**

JsonEx 是一款 **Chrome 侧边栏（Side Panel）** 扩展，面向日常 **JSON** 与 **Markdown** 工作流：格式化、校验、对比、互转、类型生成、Markdown 预览与导出等均在 **浏览器本地** 完成，不依赖自有后端。

## 总览

顶栏提供三种工作模式切换：

| 模式 | 说明 |
|------|------|
| **格式化** | JSON 编辑、格式化/压缩、树视图、转换器、类型输出、修复/转义等工具 |
| **Markdown** | 分栏编辑与实时预览（GFM）、多套预览风格、导出能力 |
| **对比** | 双份 JSON 输入，并排 Diff，可筛选与复制 |

界面 **中/英**、**亮/暗色** 主题，以及 **设置**（编辑器字号、代码配色、格式规则、顶栏位置、自动格式化与历史栏默认展开等）均在顶栏右侧入口。

## JSON（格式化模式）

- **格式化 / 压缩**，缩进支持 `2 / 4 / 8` 空格或 `Tab`
- **换行符** `LF` / `CRLF`，可选 **文件末尾换行**（设置内）
- **语法校验** 与错误提示
- 格式化结果支持 **语法高亮**（配色可在设置中切换）
- **树形视图**（在文档未超过「大体积」阈值时可用，见下文）
- **修复 JSON**：优先 **JSON5** 兼容解析，并辅以注释去除、尾逗号、未加引号键名、单引号等尽力修复
- **转义 / 反转义**
- **上传** JSON 相关文件、**下载**当前结果（扩展名随输出类型）
- **转换器**（结果区工具栏下拉）：JSON ↔ YAML、JSON ↔ QueryString、JSON ↔ 类 FormData 文本、JSON ↔ CSV（含数组/路径等约束说明）
- 从 JSON **生成类型**：TypeScript、Java、Python、Go、C#、Rust、Kotlin、PHP、Swift、Ruby、C++
- **自动格式化** 与 **历史记录**（格式化与 Diff 历史相互独立，可回填、删除、清空）

## Diff 模式

- 左右 **双栏输入**，结果区 **并排对比**
- 支持 **忽略空白**、**仅显示变更** 等选项
- **行级** Diff 与 **行内** 差异高亮
- **复制** Diff 文本；超大体积时可能跳过完整并排计算以保证流畅（见下文）

## Markdown 模式

- **左侧**：Markdown 源码、工具条插入（标题、列表、链接、表格、代码块、任务列表、工具条级撤销/重做等）、上传/复制/下载/清空
- **右侧**：**GFM** 预览（`remark-gfm`），围栏代码 **语法高亮**（`rehype-highlight` / lowlight）
- **五套内置预览风格**（排版主题，选择会写入本地存储）
- **导出**：如 HTML、走系统打印的 PDF 流程、Word（.docx）等（以当前实现为准）

草稿可 **本地持久化**（同源、本机）。

## 大体积 JSON 的降级策略

为保持界面可交互，超过阈值时会关闭部分重功能（实现见 `src/lib/heavy-input.ts`）：

- **单份 JSON 文本** 超过约 **35 万字符**：树视图与结果区富语法高亮可能关闭，改为偏文本的展示
- **Diff 两侧或合计** 超过阈值：可能 **跳过完整并排 Diff** 并给出提示

若触达限制，可拆分内容或先在本地精简后再操作。

## 技术栈

- React `19.x`、TypeScript `5.6.x`、Vite `8.x`
- Chrome **Manifest V3**（`@crxjs/vite-plugin`）
- Tailwind CSS `4.x`、shadcn/ui、Radix UI / Base UI
- `react-markdown`、`remark-gfm`、`rehype-highlight`、`lowlight`、`marked`（导出相关）、`docx`（Word 导出路径）

## 本地开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

产物在 `dist/`。可选执行扩展清单检查：

```bash
npm run verify:manifest
```

## 在 Chrome 中加载

1. 打开 `chrome://extensions`
2. 开启 **开发者模式**
3. **加载已解压的扩展程序**，选择 `dist/` 目录
4. 固定 JsonEx 或通过 **侧边栏** 打开

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发 |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run preview` | 预览生产构建 |
| `npm run test` | 单次 Vitest |
| `npm run test:watch` | Vitest 监听 |
| `npm run verify:manifest` | 清单与扩展相关校验脚本 |

## 仓库结构（节选）

```text
JsonEx/
├── public/              # manifest、主题脚本、logo 等（构建后亦见 dist）
├── src/
│   ├── App.tsx          # 壳层：模式、顶栏、格式化/Diff 编排
│   ├── background.ts    # Service worker
│   ├── components/      # 含 jsonex/* 各面板
│   ├── hooks/
│   └── lib/             # json-utils、diff-utils、type-generator、convert-utils、Markdown 相关等
├── docs/
│   ├── product.md
│   └── screenshots/
├── scripts/
└── package.json
```

## 隐私说明

解析、格式化、对比、转换、高亮与类型生成等核心能力 **不依赖** 外部 API。数据默认留在本机，除非你主动复制或导出。

## 贡献

欢迎 Issue 与 Pull Request。功能类需求请尽量写清 **使用场景** 与 **预期行为**。

## 路线图（非穷尽）

- 键排序与更多格式化预设
- 更强的树交互（如路径复制）
- 结构化 Diff / Patch 导出
- 历史记录导入/导出
- 更大 JSON 场景下的性能优化

## 许可证

[MIT License](./LICENSE)。
