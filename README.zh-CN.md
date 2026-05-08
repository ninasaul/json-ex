# JsonEx

[English](./README.md) | [中文](./README.zh-CN.md)

语言： [Switch to English](./README.md) · **中文（默认）**

JsonEx 是一个基于 Chrome Side Panel 的 JSON 工具插件，覆盖格式化、校验、对比与类型生成等常见开发场景。  
所有处理均在浏览器本地执行，不依赖后端服务。

### 功能特性

- **JSON 格式化与压缩**
  - 一键格式化（Pretty Print）和压缩（Minify）
  - 缩进支持 `2 / 4 / 8` 空格与 `Tab`
  - 支持 `LF / CRLF` 换行与末尾换行开关
- **语法校验**
  - 非法 JSON 可识别并提示语法错误
- **树形视图**
  - 支持树形结构浏览与整树折叠/展开
- **Diff 对比模式**
  - 左右 JSON 并排对比
  - 支持忽略空白、仅看变更、行内高亮
  - 支持复制 Diff 结果
- **类型代码生成**
  - 可从 JSON 生成以下语言类型代码：
  - `TS / Java / Python / Go / C# / Rust / Kotlin / PHP / Swift / Ruby / C++`
- **编辑辅助**
  - 转义 / 反转义
  - 上传 JSON 文件
  - 下载结果（按类型自动扩展名）
  - 一键复制与清空
- **历史记录**
  - 格式化模式与 Diff 模式独立历史
  - 支持快速回填、删除、清空
- **界面与偏好**
  - 内置中英文界面切换
  - 支持明暗主题
  - 支持编辑器字号、代码主题、顶栏位置等配置
  - 支持自动格式化与历史栏默认展开

### 技术栈

- React + TypeScript
- Vite
- Chrome Extension Manifest V3（`@crxjs/vite-plugin`）
- Tailwind CSS
- shadcn/ui + Radix UI

### 本地开发

```bash
npm install
npm run dev
```

### 构建

```bash
npm run build
```

构建产物位于 `dist/`。

### 在 Chrome 中加载

1. 打开 `chrome://extensions`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `dist/` 目录
5. 固定 JsonEx 或从侧边栏入口打开

### 截图

- `docs/screenshots/format-mode.png` - 格式化模式与树形视图
- `docs/screenshots/diff-mode.png` - 并排 Diff 对比模式
- `docs/screenshots/type-generation.png` - 多语言类型生成

### 脚本

- `npm run dev` - 启动开发环境
- `npm run build` - 构建插件产物
- `npm run preview` - 预览构建结果
- `npm run test` - 单次运行单元测试
- `npm run test:watch` - 监听模式运行单元测试

### 目录结构

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

### 隐私说明

- JSON 的解析、格式化、对比、类型生成均在本地执行
- 核心功能不依赖外部 API

### 贡献

欢迎提交 Issue 与 Pull Request。  
提交需求时建议附上使用场景与预期行为。

### 路线图

- [ ] 键排序与更多格式化预设
- [ ] 更强的树形交互与路径复制
- [ ] 支持 JSON patch/diff 导出格式
- [ ] 会话历史导入/导出
- [ ] 大型 JSON 性能优化

### 许可证

本项目采用 [MIT License](./LICENSE) 开源。
