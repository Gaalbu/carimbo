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

export interface ManifestEntry {
  readonly checkerId: string
  readonly since: string | null
  readonly url: string
  readonly kind: 'page' | 'discovery'
  readonly status: 'discovered' | 'processed' | 'without_markup' | 'failed'
  readonly diagnostics: readonly string[]
  readonly updatedAt: string
}

export interface ManifestRun {
  readonly id: string
  readonly checkerId: string
  readonly since: string | null
  readonly startedAt: string
  readonly status: 'running' | 'finished'
  readonly maxPages: number | null
  readonly truncated: boolean
  readonly parseFailures: number
  readonly discoveryFailures: number
}

export interface Manifest {
  readonly entries: readonly ManifestEntry[]
  readonly runs: readonly ManifestRun[]
}

export interface RawStore {
  /** Keeps the raw bytes gzipped under `<dir>/<checkerId>/<sha256>.<ext>.gz`. */
  saveRaw(checkerId: string, rawSha256: string, body: Uint8Array, extension: string): Promise<void>
  getFetch(url: string): FetchRecord | undefined
  recordFetch(url: string, record: FetchRecord): void
  getManifest(): Manifest
  recordManifestEntry(entry: ManifestEntry): void
  recordManifestRun(run: ManifestRun): void
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
  const manifestPath = join(dir, 'manifest.json')
  const manifest = await readManifest(manifestPath)
  const entryPositions = new Map(
    manifest.entries.map((entry, index) => [manifestKey(entry), index]),
  )
  const runPositions = new Map(manifest.runs.map((run, index) => [run.id, index]))

  let flushing = Promise.resolve()

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
    getManifest: () => ({ entries: [...manifest.entries], runs: [...manifest.runs] }),
    recordManifestEntry(entry) {
      const key = manifestKey(entry)
      const position = entryPositions.get(key)
      if (position === undefined) {
        entryPositions.set(key, manifest.entries.length)
        manifest.entries.push(entry)
      } else manifest.entries[position] = entry
    },
    recordManifestRun(run) {
      const position = runPositions.get(run.id)
      if (position === undefined) {
        runPositions.set(run.id, manifest.runs.length)
        manifest.runs.push(run)
      } else manifest.runs[position] = run
    },
    flush() {
      flushing = flushing.then(async () => {
        await mkdir(dir, { recursive: true })
        const temporary = `${indexPath}.${String(process.pid)}.${crypto.randomUUID()}.tmp`
        await writeFile(temporary, JSON.stringify(Object.fromEntries(index), null, 1), 'utf8')
        await rename(temporary, indexPath)
        const manifestTemporary = `${manifestPath}.${String(process.pid)}.${crypto.randomUUID()}.tmp`
        await writeFile(manifestTemporary, JSON.stringify(manifest, null, 1), 'utf8')
        await rename(manifestTemporary, manifestPath)
      })
      return flushing
    },
  }
}

function manifestKey(entry: ManifestEntry): string {
  return JSON.stringify([entry.checkerId, entry.since, entry.url, entry.kind])
}

async function readManifest(
  path: string,
): Promise<{ entries: ManifestEntry[]; runs: ManifestRun[] }> {
  try {
    const data: unknown = JSON.parse(await readFile(path, 'utf8'))
    if (
      typeof data !== 'object' ||
      data === null ||
      !('entries' in data) ||
      !Array.isArray(data.entries) ||
      !('runs' in data) ||
      !Array.isArray(data.runs)
    )
      throw new Error('invalid manifest')
    return data as { entries: ManifestEntry[]; runs: ManifestRun[] }
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      return { entries: [], runs: [] }
    throw error
  }
}

async function readIndex(path: string): Promise<Record<string, FetchRecord>> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as Record<string, FetchRecord>
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return {}
    throw error
  }
}
