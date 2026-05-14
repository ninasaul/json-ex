#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const svgPath = path.join(root, 'public', 'logo_base.svg')
const outDir = path.join(root, 'public', 'icons')

const svg = await fs.promises.readFile(svgPath)
await fs.promises.mkdir(outDir, { recursive: true })

// Chrome recommends 16 / 32 / 48 / 128; extra sizes (24, 96) help toolbar + high-DPI scaling.
const SIZES = [16, 24, 32, 48, 96, 128]

for (const size of SIZES) {
  const out = path.join(outDir, `icon${size}.png`)
  await sharp(svg)
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(out)
  console.log('wrote', path.relative(root, out))
}
