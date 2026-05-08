import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import path from 'path'
import fs from 'fs'

// @crxjs/vite-plugin 只会把 action.default_popup / options_ui.page 等字段里的 HTML 打进产物；
// side_panel.default_path 不会触发打包，因此在 manifest 里用 options_ui 再引用一次 index.html（侧栏仍为正式入口）。
const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'public/manifest.json'), 'utf-8'))

export default defineConfig({
  plugins: [tailwindcss(), react(), crx({ manifest })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
