import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { FactCheckApiClient, PoliteFetcher } from '@carimbo/sources'

import { type IngestOptions, type IngestSummary, runIngest } from './ingest.js'
import type { Logger } from './queues.js'
import { openRawStore } from './raw-store.js'
import { readStore, writeStore } from './store.js'

// src/ and dist/ sit at the same depth, so the repository's data/ is three levels up.
const DEFAULT_DATA_DIR = fileURLToPath(new URL('../../../data/', import.meta.url))
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

const USAGE = `uso: npm run ingest:once -w @carimbo/worker -- [opções]

  --since AAAA-MM-DD   também percorre o sitemap de cada checador até esta data
  --max-pages N        no máximo N páginas de checagem buscadas por checador
  --refresh            busca de novo páginas já vistas
  --checker ID         só este checador (repetível; aceita os pulados por status)
  --data-dir CAMINHO   pasta do reviews.json e do raw/ (padrão: data/ do repositório)

FACTCHECK_API_KEY no ambiente liga a Google Fact Check Tools API.
`

export interface CliArgs extends IngestOptions {
  readonly dataDir: string
  readonly help: boolean
}

export function parseCliArgs(argv: readonly string[]): CliArgs {
  const { values } = parseArgs({
    args: [...argv],
    options: {
      since: { type: 'string' },
      'max-pages': { type: 'string' },
      refresh: { type: 'boolean', default: false },
      checker: { type: 'string', multiple: true },
      'data-dir': { type: 'string' },
      help: { type: 'boolean', default: false },
    },
    strict: true,
  })
  const since = values.since ?? null
  if (since !== null && (!ISO_DAY.test(since) || Number.isNaN(Date.parse(since)))) {
    throw new Error(`--since precisa ser AAAA-MM-DD, veio "${since}"`)
  }
  const maxPagesText = values['max-pages']
  const maxPages = maxPagesText === undefined ? null : Number(maxPagesText)
  if (maxPages !== null && (!Number.isInteger(maxPages) || maxPages < 0)) {
    throw new Error(`--max-pages precisa ser um inteiro ≥ 0, veio "${String(maxPagesText)}"`)
  }
  return {
    since,
    maxPages,
    refresh: values.refresh,
    checkerIds: values.checker ?? null,
    dataDir: resolve(values['data-dir'] ?? DEFAULT_DATA_DIR),
    help: values.help,
  }
}

const stderrLog: Logger = {
  info: (message) => process.stderr.write(`${message}\n`),
  warn: (message) => process.stderr.write(`AVISO ${message}\n`),
}

export function formatSummary(summary: IngestSummary): string {
  const lines = ['checador\tlistadas\tjá vistas\tbuscadas\tsem ClaimReview\tfalhas\tchecagens']
  for (const [id, report] of Object.entries(summary.checkers)) {
    lines.push(
      [
        id,
        report.candidates,
        report.skipped,
        report.fetched,
        report.withoutClaimReview,
        report.failed,
        report.reviews,
      ].join('\t'),
    )
  }
  lines.push(
    `novas: ${String(summary.added)}, atualizadas: ${String(summary.updated)}, total no arquivo: ${String(summary.total)}, falhas de leitura: ${String(summary.parseFailures)}`,
  )
  if (summary.unknownRatings.size > 0) {
    lines.push('avaliações desconhecidas (incluir no mapa da spec 002 se forem recorrentes):')
    for (const [rating, count] of summary.unknownRatings) {
      lines.push(`  ${String(count)}× ${rating}`)
    }
  }
  return `${lines.join('\n')}\n`
}

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2))
  if (args.help) {
    process.stdout.write(USAGE)
    return
  }
  const storePath = join(args.dataDir, 'reviews.json')
  const apiKey = process.env.FACTCHECK_API_KEY
  const summary = await runIngest(args, {
    fetcher: new PoliteFetcher(),
    rawStore: await openRawStore(join(args.dataDir, 'raw')),
    loadStore: () => readStore(storePath),
    saveStore: (store) => writeStore(storePath, store),
    log: stderrLog,
    now: () => new Date(),
    factCheck: apiKey === undefined || apiKey === '' ? null : new FactCheckApiClient({ apiKey }),
  })
  process.stdout.write(formatSummary(summary))
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(`ERRO ${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
