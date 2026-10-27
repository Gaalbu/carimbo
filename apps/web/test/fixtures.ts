import type {
  CheckerWithCount,
  ClaimDetail,
  ClaimSummary,
  CoverageResponse,
  Page,
  Review,
  StatsResponse,
} from '@carimbo/core'

// Test-only data. Never imported by the app.

export const checkers: CheckerWithCount[] = [
  {
    id: 'aos-fatos',
    name: 'Aos Fatos',
    homepage: 'https://www.aosfatos.org',
    submitUrl: 'https://www.aosfatos.org/fatima',
    count: 2,
  },
  {
    id: 'lupa',
    name: 'Lupa',
    homepage: 'https://lupa.uol.com.br',
    submitUrl: null,
    count: 1,
  },
]

export function review(overrides: Partial<Review> = {}): Review {
  return {
    id: '0123456789abcdef',
    checkerId: 'aos-fatos',
    claimText: 'Urna eletrônica foi hackeada na seção 123',
    claimant: null,
    claimDate: null,
    reviewDate: '2026-10-24',
    reviewUrl: 'https://www.aosfatos.org/noticias/urna-hackeada',
    headline: 'É falso que urna foi hackeada',
    textualRating: 'falso',
    verdict: 'false',
    ratingMapVersion: 1,
    archivedUrl: null,
    provenance: {
      sourceUrl: 'https://www.aosfatos.org/noticias/urna-hackeada',
      fetchedAt: '2026-10-25T10:00:00Z',
      method: 'claimreview',
      parserVersion: 'claimreview@1',
      rawSha256: 'a'.repeat(64),
    },
    ...overrides,
  }
}

export const claim: ClaimSummary = {
  slug: 'urna-hackeada-secao-123',
  claimText: 'Urna eletrônica foi hackeada na seção 123',
  claimant: null,
  latestReviewDate: '2026-10-24',
  themes: ['urna-e-eleicao'],
  reviews: [
    review(),
    review({
      id: 'fedcba9876543210',
      checkerId: 'lupa',
      reviewDate: null,
      textualRating: 'Enganoso',
      verdict: 'out_of_context',
      reviewUrl: 'https://lupa.uol.com.br/urna',
    }),
  ],
}

export const claimDetail: ClaimDetail = { ...claim, related: [] }

export const claimsPage: Page<ClaimSummary> = { items: [claim], total: 1, nextCursor: null }

export const emptyPage: Page<ClaimSummary> = { items: [], total: 0, nextCursor: null }

export function stats(overrides: Partial<StatsResponse> = {}): StatsResponse {
  return {
    from: '2026-10-26',
    to: '2026-10-26',
    counts: { false: 14, out_of_context: 5, true: 2, unknown: 0 },
    total: 21,
    indexed: 300,
    updatedAt: '2026-10-26T12:00:00Z',
    ...overrides,
  }
}

export const coverage: CoverageResponse = {
  years: [2022, 2018],
  checkers,
  rows: [
    {
      checkerId: 'aos-fatos',
      year: 2022,
      count: 120,
      firstDate: '2022-08-16',
      lastDate: '2022-10-30',
      methods: ['claimreview'],
    },
  ],
}
