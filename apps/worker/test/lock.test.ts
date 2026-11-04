import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { withDataLock } from '../src/lock.js'

const cli = resolve('src/main.ts')

function runCli(args: string[]): Promise<{ code: number | null; stderr: string }> {
  return new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', cli, ...args])
    let stderr = ''
    child.stderr.setEncoding('utf8').on('data', (chunk: string) => {
      stderr += chunk
    })
    child.on('error', reject)
    child.on('close', (code) => {
      resolveResult({ code, stderr })
    })
  })
}

describe('data directory lock', () => {
  it('blocks another CLI process before it touches the store, including via a symlink', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'carimbo-lock-'))
    const dir = join(parent, 'data')
    const alias = join(parent, 'alias')
    try {
      await withDataLock(dir, async () => {
        await symlink(dir, alias)
        const result = await runCli(['--data-dir', alias, '--max-pages', '0'])
        expect(result.code).toBe(1)
        expect(result.stderr).toContain('lock')
        expect(result.stderr).toContain(String(process.pid))
        await expect(readFile(join(dir, 'reviews.json'))).rejects.toMatchObject({ code: 'ENOENT' })
      })
    } finally {
      await rm(parent, { recursive: true, force: true })
    }
  })

  it('releases the lock on failure and allows another acquisition', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'carimbo-lock-'))
    try {
      await expect(withDataLock(dir, () => Promise.reject(new Error('failure')))).rejects.toThrow(
        'failure',
      )
      await expect(withDataLock(dir, () => Promise.resolve('ok'))).resolves.toBe('ok')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('leaves a lock after a process is killed and refuses automatic recovery', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'carimbo-lock-'))
    const modulePath = resolve('src/lock.ts')
    const script = `import { withDataLock } from ${JSON.stringify(modulePath)}; await withDataLock(${JSON.stringify(dir)}, async () => { process.stdout.write('ready'); await new Promise(() => { setInterval(() => {}, 1000); }); });`
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', '--input-type=module', '-e', script],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )
    try {
      await new Promise<void>((resolveReady, reject) => {
        child.stdout.once('data', () => {
          resolveReady()
        })
        child.once('error', reject)
        child.once('exit', () => {
          reject(new Error('holder exited before acquiring lock'))
        })
      })
      const exited = new Promise<void>((resolveExit) => {
        child.once('exit', () => {
          resolveExit()
        })
      })
      child.kill('SIGKILL')
      await exited
      const result = await runCli(['--data-dir', dir, '--max-pages', '0'])
      expect(result.code).toBe(1)
      expect(result.stderr).toContain('manual')
      expect(await readFile(join(dir, '.ingest.lock'), 'utf8')).toContain(String(child.pid))
    } finally {
      child.kill('SIGKILL')
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('allows different data directories at the same time', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'carimbo-lock-'))
    try {
      await withDataLock(join(parent, 'one'), () =>
        withDataLock(join(parent, 'two'), () => Promise.resolve()),
      )
    } finally {
      await rm(parent, { recursive: true, force: true })
    }
  })

  it('keeps an orphan or unreadable lock for manual recovery', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'carimbo-lock-'))
    const lock = join(dir, '.ingest.lock')
    try {
      await writeFile(lock, 'incomplete')
      await expect(withDataLock(dir, () => Promise.resolve())).rejects.toThrow(/lock.*manual/i)
      expect(await readFile(lock, 'utf8')).toBe('incomplete')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
