#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const manifestPath = path.join(root, 'public', 'manifest.json')

const raw = fs.readFileSync(manifestPath, 'utf8')
const m = JSON.parse(raw)

const errors = []
if (m.manifest_version !== 3) errors.push('manifest_version must be 3')
if (!m.side_panel?.default_path) errors.push('side_panel.default_path is required')
else if (m.side_panel.default_path !== 'index.html') {
  errors.push(`side_panel.default_path must be index.html, got ${m.side_panel.default_path}`)
}
if (!m.background?.service_worker) errors.push('background.service_worker is required')
if (!Array.isArray(m.permissions)) errors.push('permissions must be an array')
else {
  for (const p of ['sidePanel', 'storage']) {
    if (!m.permissions.includes(p)) errors.push(`permissions must include ${p}`)
  }
}

if (errors.length) {
  console.error('manifest validation failed:')
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}

console.log('manifest ok:', manifestPath)
