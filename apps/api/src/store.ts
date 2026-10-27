import { readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { buildSnapshot, EMPTY_SNAPSHOT, type StoreSnapshot } from '@carimbo/core'
import type { FastifyBaseLogger } from 'fastify'

import { parseReviewStore } from './store-schema.js'

/** `<repo root>/data/reviews.json`, resolved from this file (src/ or dist/, same depth). */
export const DEFAULT_DATA_FILE = fileURLToPath(
  new URL('../../../data/reviews.json', import.meta.url),
)

export interface StoreSource {
  current(): Promise<StoreSnapshot>
}

/** A fixed snapshot, for tests and tools. */
export function staticStore(snapshot: StoreSnapshot): StoreSource {
  return { current: () => Promise.resolve(snapshot) }
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}

/**
 * Reads the store written by the worker. The file is checked on every call and parsed again only
 * when its mtime changes. A missing file serves an empty store; an invalid one is logged and the
 * last good snapshot keeps being served.
 */
export function fileStore(path: string, log: FastifyBaseLogger): StoreSource {
  let snapshot = EMPTY_SNAPSHOT
  let loadedMtime: number | null = null
  let pending: Promise<StoreSnapshot> | null = null

  async function refresh(): Promise<StoreSnapshot> {
    let mtime: number
    try {
      mtime = (await stat(path)).mtimeMs
    } catch (error) {
      if (!isMissingFile(error)) throw error
      if (loadedMtime !== null) log.warn({ path }, 'store file disappeared; serving an empty store')
      snapshot = EMPTY_SNAPSHOT
      loadedMtime = null
      return snapshot
    }
    if (mtime === loadedMtime) return snapshot
    try {
      const store = parseReviewStore(JSON.parse(await readFile(path, 'utf8')))
      snapshot = buildSnapshot(store)
      log.info({ path, reviews: snapshot.reviews.length }, 'store loaded')
    } catch (error) {
      log.error({ err: error, path }, 'invalid store file; keeping the previous snapshot')
    }
    loadedMtime = mtime
    return snapshot
  }

  return {
    current() {
      pending ??= refresh().finally(() => {
        pending = null
      })
      return pending
    },
  }
}
