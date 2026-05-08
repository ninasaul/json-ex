# JsonEx — 产品文档

## 概述

JsonEx 是一款 Chrome Side Panel JSON 工具扩展，覆盖格式化、校验、Diff 对比、类型生成等高频开发场景。所有处理均在本地浏览器执行，不依赖后端服务。

## 当前功能范围

### JSON 处理能力

- 格式化（Pretty Print）与压缩（Minify）
- 缩进规则：`2 / 4 / 8` 空格与 `Tab`
- 行尾规则：`LF / CRLF`，可配置“文件末尾换行”
- 语法错误提示，支持行列定位
- 转义 / 反转义

### Diff 对比能力

- 双栏输入 + 结果工作区的并排对比模式
- 支持忽略空白、仅显示变更
- 行级 + 行内高亮
- 可复制 Diff 文本

### 类型生成能力

- 从 JSON 生成多语言类型定义
- 支持 `TS / Java / Python / Go / C# / Rust / Kotlin / PHP / Swift / Ruby / C++`

### 使用体验

- 树形视图，支持折叠/展开
- 输入上传、结果下载、复制与清空
- 格式化模式与 Diff 模式独立历史记录
- 中英文切换、明暗主题切换
- 可配置编辑器字号、代码配色、顶栏位置等偏好

## 技术架构（与当前代码一致）

- React `19.2.x` + TypeScript `5.6.x`
- Vite `8.x`
- Chrome Extension Manifest V3 + `@crxjs/vite-plugin`
- Tailwind CSS `4.2.x` + `@tailwindcss/vite`
- shadcn/ui + Radix UI + Base UI
- 图标：Hugeicons（`@hugeicons/react`）

## 关键模块

- `src/App.tsx`：主界面编排与交互入口
- `src/lib/use-json-formatter.ts`：格式化流程状态管理
- `src/lib/json-utils.ts`：格式化/压缩/语法高亮/剪贴板能力
- `src/lib/type-generator.ts`：多语言类型生成
- `src/lib/diff-utils.ts`：Diff 计算与行内差异算法
- `src/lib/storage.ts`：本地存储读写封装
- `src/components/json-tree.tsx`：树形展示

## 工程状态

- 已补充基础单元测试（Vitest），覆盖：
  - `json-utils` 关键路径
  - `type-generator` 关键路径
- 当前脚本包括：`dev`、`build`、`preview`、`test`、`test:watch`

## 后续规划（未完成）

- [ ] key 排序与更多格式化预设
- [ ] 更完整的 JSON Diff 导出格式（如 patch）
- [ ] 历史记录导入/导出
- [ ] 大 JSON 场景性能优化（分段计算/Worker）
- [ ] 持续拆分 `App.tsx`，降低耦合并提升可测试性
