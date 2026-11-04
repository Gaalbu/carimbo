/**
 * Auditoria reproduzível, sem rede: npx tsx apps/worker/scripts/historical-audit.ts
 * A saída JSON contém URLs e nomes de campos, nunca o HTML ou valores das alegações.
 * O universo é restrito aos registros cuja data está em uma campanha eleitoral cadastrada.
 */
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { electionForDate, type Review, type ReviewStore } from '@carimbo/core'
import { extractClaimReviews, type ExtractedClaimReview } from '@carimbo/sources'

interface FetchRecord {
  checkerId: string
  finalUrl: string
  rawSha256: string
  reviewIds: readonly string[]
}
type FetchIndex = Record<string, FetchRecord>
type Field = 'rawSha256' | 'reviewUrl' | 'claimText' | 'textualRating' | 'reviewDate'
interface Sample {
  review: Review
  election: number
  rank: string
}
interface Detail {
  id: string
  checkerId: string
  election: number
  url: string
  sourceUrl: string
}
interface Divergence extends Detail {
  fields: Field[]
}
interface Unavailable extends Detail {
  reason: string
}

function digest(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex')
}

export function selectSample(reviews: readonly Review[]): Sample[] {
  const groups = new Map<string, Sample[]>()
  for (const review of reviews) {
    const election = electionForDate(review.reviewDate)?.year
    if (election === undefined) continue
    const key = JSON.stringify([review.checkerId, election])
    const group = groups.get(key) ?? []
    group.push({
      review,
      election,
      rank: digest(JSON.stringify([review.checkerId, election, review.id])),
    })
    groups.set(key, group)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .flatMap(([, rows]) =>
      rows
        .sort((a, b) => a.rank.localeCompare(b.rank) || a.review.id.localeCompare(b.review.id))
        .slice(0, 20),
    )
}

function chooseReview(
  extracted: readonly ExtractedClaimReview[],
  review: Review,
): ExtractedClaimReview | undefined {
  if (extracted.length === 1) return extracted[0]
  const exact = extracted.filter(
    (item) => item.reviewUrl === review.reviewUrl && item.claimText === review.claimText,
  )
  if (exact.length === 1) return exact[0]
  const byClaim = extracted.filter((item) => item.claimText === review.claimText)
  if (byClaim.length === 1) return byClaim[0]
  const byUrl = extracted.filter((item) => item.reviewUrl === review.reviewUrl)
  return byUrl.length === 1 ? byUrl[0] : undefined
}

export async function auditHistorical(
  reviews: readonly Review[],
  rawDir: string,
  index: FetchIndex,
) {
  const sample = selectSample(reviews)
  const divergences: Divergence[] = []
  const unavailable: Unavailable[] = []
  const matches: Detail[] = []
  const groups: Record<
    string,
    { eligible: number; selected: number; matched: number; divergent: number; unavailable: number }
  > = {}
  for (const review of reviews) {
    const election = electionForDate(review.reviewDate)?.year
    if (election === undefined) continue
    const key = `${review.checkerId}/${String(election)}`
    groups[key] ??= { eligible: 0, selected: 0, matched: 0, divergent: 0, unavailable: 0 }
    groups[key].eligible++
  }
  let matched = 0
  for (const { review, election } of sample) {
    const group = groups[`${review.checkerId}/${String(election)}`]
    if (group === undefined) throw new Error('Grupo da amostra não encontrado')
    group.selected++
    const detail: Detail = {
      id: review.id,
      checkerId: review.checkerId,
      election,
      url: review.reviewUrl,
      sourceUrl: review.provenance.sourceUrl,
    }
    const unavailableWith = (reason: string) => {
      unavailable.push({ ...detail, reason })
      group.unavailable++
    }
    const divergentWith = (fields: Field[]) => {
      divergences.push({ ...detail, fields })
      group.divergent++
    }
    if (review.provenance.method !== 'claimreview') {
      unavailableWith('unsupported_method')
      continue
    }
    const sha = review.provenance.rawSha256
    if (!/^[a-f0-9]{64}$/.test(sha) || !/^[a-z0-9-]+$/.test(review.checkerId)) {
      unavailableWith('invalid_raw_reference')
      continue
    }
    let raw: Buffer
    try {
      raw = gunzipSync(await readFile(join(rawDir, review.checkerId, `${sha}.html.gz`)))
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      unavailableWith(code === 'ENOENT' ? 'raw_missing' : 'raw_unreadable')
      continue
    }
    if (digest(raw) !== sha) {
      divergentWith(['rawSha256'])
      continue
    }
    const record = Object.values(index).find(
      (item) =>
        item.checkerId === review.checkerId &&
        item.rawSha256 === sha &&
        item.reviewIds.includes(review.id),
    )
    const extraction = extractClaimReviews(
      raw.toString('utf8'),
      record?.finalUrl ?? review.provenance.sourceUrl,
    )
    const item = chooseReview(extraction.reviews, review)
    if (item === undefined) {
      unavailableWith(
        extraction.reviews.length === 0 ? 'no_extracted_review' : 'ambiguous_extraction',
      )
      continue
    }
    const fields: Field[] = (
      ['reviewUrl', 'claimText', 'textualRating', 'reviewDate'] as const
    ).filter((field) => item[field] !== review[field])
    if (fields.length > 0) divergentWith(fields)
    else {
      matched++
      group.matched++
      matches.push(detail)
    }
  }
  return {
    methodology: {
      sample: 'sha256(checkerId, election, review id), first 20 per group',
      period: 'registered electoral campaign dates, inclusive',
      network: false,
      comparison: ['rawSha256', 'reviewUrl', 'claimText', 'textualRating', 'reviewDate'],
      finalUrlFallback: 'provenance.sourceUrl when fetch index has no matching record',
    },
    summary: {
      eligible: Object.values(groups).reduce((sum, group) => sum + group.eligible, 0),
      selected: sample.length,
      matched,
      divergent: divergences.length,
      unavailable: unavailable.length,
    },
    groups: Object.fromEntries(Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))),
    matches,
    divergences,
    unavailable,
  }
}

async function main() {
  const root = resolve(fileURLToPath(new URL('../../..', import.meta.url)))
  const store = JSON.parse(await readFile(join(root, 'data/reviews.json'), 'utf8')) as ReviewStore
  const rawDir = join(root, 'data/raw')
  let index: FetchIndex = {}
  try {
    index = JSON.parse(await readFile(join(rawDir, 'fetched.json'), 'utf8')) as FetchIndex
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  process.stdout.write(
    `${JSON.stringify(await auditHistorical(store.reviews, rawDir, index), null, 2)}\n`,
  )
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
