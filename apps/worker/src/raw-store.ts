import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { gzip } from 'node:zlib'

const gzipAsync = promisify(gzip)

/** What happened the last time a page was fetched, so it is fetched only once. */
export interface FetchRecord {
  readonly checkerId: string
  readonly fetchedAt: string
  readonly finalUrl: string
  readonly rawSha256: string
  /** Ids of the reviews the page produced; empty when it had no usable ClaimReview. */
  readonly reviewIds: readonly string[]
}

export interface RawStore {
  /** Keeps the raw bytes gzipped under `<dir>/<checkerId>/<sha256>.<ext>.gz`. */
  saveRaw(checkerId: string, rawSha256: string, body: Uint8Array, extension: string): Promise<void>
  getFetch(url: string): FetchRecord | undefined
  recordFetch(url: string, record: FetchRecord): void
  /** Persists the fetch index. */
  flush(): Promise<void>
}

const INDEX_FILE = 'fetched.json'

/**
 * Private raw store under `data/raw/` (gitignored): the HTML/JSON as fetched, to reprocess when a
 * parser improves (docs/PLANO.md §4.5, regra 3). Never published.
 */
export async function openRawStore(dir: string): Promise<RawStore> {
  const indexPath = join(dir, INDEX_FILE)
  const index = new Map<string, FetchRecord>(Object.entries(await readIndex(indexPath)))

  return {
    async saveRaw(checkerId, rawSha256, body, extension) {
      const folder = join(dir, checkerId)
      await mkdir(folder, { recursive: true })
      await writeFile(join(folder, `${rawSha256}.${extension}.gz`), await gzipAsync(body))
    },
    getFetch: (url) => index.get(url),
    recordFetch: (url, record) => {
      index.set(url, record)
    },
    async flush() {
      await mkdir(dir, { recursive: true })
      const temporary = `${indexPath}.tmp`
      await writeFile(temporary, JSON.stringify(Object.fromEntries(index), null, 1), 'utf8')
      await rename(temporary, indexPath)
    },
  }
}

async function readIndex(path: string): Promise<Record<string, FetchRecord>> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as Record<string, FetchRecord>
  } catch {
    return {}
  }
}
