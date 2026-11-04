import { mkdir, open, readFile, lstat, unlink, type FileHandle } from 'node:fs/promises'
import { hostname } from 'node:os'
import { join } from 'node:path'

/**
 * Uses exclusive creation on a shared local filesystem. No automatic stale-lock
 * removal: PID reuse, containers and remote hosts make liveness ambiguous.
 * After a crash, stop all writers before manually removing the lock. This is an
 * advisory lock; non-cooperating writers and filesystems without atomic O_EXCL
 * are not protected. Do not replace the lock while an ingestion is running.
 */
export async function withDataLock<T>(dataDir: string, action: () => Promise<T>): Promise<T> {
  await mkdir(dataDir, { recursive: true })
  const lockPath = join(dataDir, '.ingest.lock')
  let handle
  try {
    handle = await open(lockPath, 'wx', 0o600)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    let owner = 'dados indisponíveis'
    try {
      owner = (await readFile(lockPath, 'utf8')).trim() || owner
    } catch {
      // The owner may still be creating the file, or may have just released it.
    }
    throw new Error(
      `Diretório de dados ocupado: lock ${lockPath} (${owner}). ` +
        'Se for órfão, confirme que nenhuma ingestão usa este diretório e remova o lock manualmente.',
      { cause: error },
    )
  }

  try {
    await handle.writeFile(
      JSON.stringify({ pid: process.pid, host: hostname(), startedAt: new Date().toISOString() }),
    )
    return await action()
  } finally {
    await releaseLock(handle, lockPath)
  }
}

async function releaseLock(handle: FileHandle, lockPath: string): Promise<void> {
  try {
    const [owned, current] = await Promise.all([handle.stat(), lstat(lockPath)])
    if (owned.dev !== current.dev || owned.ino !== current.ino) {
      throw new Error(`O lock ${lockPath} foi substituído; não será removido.`)
    }
    await unlink(lockPath)
  } finally {
    await handle.close()
  }
}
