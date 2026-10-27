/* global process */
// Publishes the store for the static build (GitHub Pages): copies <repo>/data/reviews.json to
// public/dados/reviews.json and writes public/dados/reviews.csv with the same CSV as the API's
// /v1/export.csv. Usage: node scripts/prepare-static-data.mjs [path/to/reviews.json]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { dedupeReviews, toCsv } from '@carimbo/core'

const here = dirname(fileURLToPath(import.meta.url))
const source = resolve(process.argv[2] ?? join(here, '..', '..', '..', 'data', 'reviews.json'))
const outDir = join(here, '..', 'public', 'dados')

const raw = readFileSync(source, 'utf8')
const store = JSON.parse(raw)
if (store?.schemaVersion !== 1 || !Array.isArray(store.reviews)) {
  throw new Error(`${source} is not a ReviewStore (schemaVersion 1)`)
}

mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'reviews.json'), raw)
writeFileSync(join(outDir, 'reviews.csv'), toCsv(dedupeReviews(store.reviews)))
process.stdout.write(`dados: ${String(store.reviews.length)} checagens em public/dados/\n`)
