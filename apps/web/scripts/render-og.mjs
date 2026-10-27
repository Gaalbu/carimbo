/* global process, console */
// Renders public/og.svg to public/og.png (1200×630) with a local headless Chromium, using the
// same @fontsource fonts as the site. Usage: CHROME=/path/to/chrome node scripts/render-og.mjs
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = join(here, '..', 'public')
const require = createRequire(import.meta.url)
const chrome = process.env.CHROME
if (!chrome) throw new Error('Set CHROME to a Chromium/Chrome binary (headless shell works).')

const font = (pkg, file) =>
  pathToFileURL(join(dirname(require.resolve(`${pkg}/package.json`)), 'files', file)).href

const svg = readFileSync(join(publicDir, 'og.svg'), 'utf8')
const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Anton;src:url(${font('@fontsource/anton', 'anton-latin-400-normal.woff2')})}
@font-face{font-family:Faustina;font-weight:300 800;src:url(${font('@fontsource-variable/faustina', 'faustina-latin-wght-normal.woff2')})}
@font-face{font-family:Geist;font-weight:100 900;src:url(${font('@fontsource-variable/geist', 'geist-latin-wght-normal.woff2')})}
html,body{margin:0;background:#0f0e0d}svg{display:block}
</style>${svg}`

const dir = mkdtempSync(join(tmpdir(), 'carimbo-og-'))
const page = join(dir, 'og.html')
writeFileSync(page, html)
execFileSync(chrome, [
  '--headless',
  '--disable-gpu',
  '--hide-scrollbars',
  '--allow-file-access-from-files',
  '--window-size=1200,630',
  '--virtual-time-budget=2000',
  `--screenshot=${join(publicDir, 'og.png')}`,
  pathToFileURL(page).href,
])
console.log('wrote public/og.png')
