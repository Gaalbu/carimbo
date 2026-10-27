import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import type { Review, ReviewStore } from '@carimbo/core'

const STORE_SCHEMA_VERSION = 1
const JSON_INDENT = 2

/** Reads `data/reviews.json`; a missing file is an empty store. */
export async function readStore(path: string): Promise<ReviewStore> {
  let text: string
  try {
    text = await readFile(path, 'utf8')
  } catch (error) {
    if (isMissingFile(error)) return emptyStore()
    throw error
  }
  const parsed = JSON.parse(text) as Partial<ReviewStore>
  if (parsed.schemaVersion !== STORE_SCHEMA_VERSION || !Array.isArray(parsed.reviews)) {
    throw new Error(`${path} não é um ReviewStore com schemaVersion 1`)
  }
  return parsed as ReviewStore
}

/** Writes the store atomically, so the API never reads a half-written file. */
export async function writeStore(path: string, store: ReviewStore): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.${String(process.pid)}.tmp`
  await writeFile(temporary, `${JSON.stringify(store, null, JSON_INDENT)}\n`, 'utf8')
  await rename(temporary, path)
}

export function emptyStore(): ReviewStore {
  return {
    schemaVersion: STORE_SCHEMA_VERSION,
    generatedAt: new Date(0).toISOString(),
    reviews: [],
  }
}

/** Newest check first; undated checks last; ties by id so the file diff stays stable. */
export function compareStoreOrder(a: Review, b: Review): number {
  if (a.reviewDate !== b.reviewDate) {
    if (a.reviewDate === null) return 1
    if (b.reviewDate === null) return -1
    return a.reviewDate < b.reviewDate ? 1 : -1
  }
  if (a.id === b.id) return 0
  return a.id < b.id ? -1 : 1
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
