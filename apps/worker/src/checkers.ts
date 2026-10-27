/**
 * Where each checker publishes, as found in spike S2 (docs/spikes/S2-fontes.md, 26/10/2026).
 * Ids match the catalog in `@carimbo/core` (`CHECKER_IDS`).
 */

/** A list of recent pages: an RSS/Atom feed or a (news) sitemap. */
export interface RecentSource {
  readonly kind: 'rss' | 'sitemap'
  readonly url: string
}

export interface BackfillSitemap {
  /** Sitemap index (or urlset) to start from. */
  readonly indexUrl: string
  /** Whether a child sitemap of the index may hold pages published on or after `since`. */
  readonly includeChild: (loc: string, since: string) => boolean
  /** Whether a page URL is a fact-check of this checker (sitemaps list the whole site). */
  readonly includePage: (loc: string) => boolean
}

/**
 * - `active`: pages carry ClaimReview JSON-LD and the site answers our User-Agent.
 * - `no-claimreview`: reachable, but the server HTML has no ClaimReview (needs an `html_parser`).
 * - `blocked`: the site answers our identified User-Agent with 403; we do not disguise it.
 */
export type CheckerStatus = 'active' | 'no-claimreview' | 'blocked'

export interface CheckerSource {
  readonly checkerId: string
  readonly status: CheckerStatus
  readonly recent: readonly RecentSource[]
  readonly backfill: BackfillSitemap | null
  /** Publisher site as the Google Fact Check Tools API reports it. */
  readonly factCheckSite: string | null
}

const DAY_IN_URL = /\/(\d{4}-\d{2}-\d{2})\//
const MONTH_IN_FILE = /\.(\d{4})(\d{2})\.xml$/

/** Estadão splits its sitemap by day: `/sitemap/2026-10-20/?outputType=xml`. */
function dayOnOrAfter(loc: string, since: string): boolean {
  const day = DAY_IN_URL.exec(loc)?.[1]
  return day !== undefined && day >= since
}

/** Comprova splits by month: `sitemap-posttype-answer-french.202610.xml`. */
function monthOnOrAfter(loc: string, since: string): boolean {
  const match = MONTH_IN_FILE.exec(loc)
  if (match === null) return false
  return `${match[1] ?? ''}-${match[2] ?? ''}` >= since.slice(0, 'YYYY-MM'.length)
}

function pathStartsWith(prefix: string): (loc: string) => boolean {
  return (loc) => {
    try {
      return new URL(loc).pathname.startsWith(prefix)
    } catch {
      return false
    }
  }
}

export const CHECKER_SOURCES: readonly CheckerSource[] = [
  {
    checkerId: 'aos-fatos',
    status: 'active',
    recent: [{ kind: 'rss', url: 'https://www.aosfatos.org/noticias/feed/' }],
    backfill: {
      indexUrl: 'https://www.aosfatos.org/sitemap.xml',
      includeChild: (loc) => loc.endsWith('/sitemap-noticias.xml'),
      includePage: pathStartsWith('/noticias/'),
    },
    factCheckSite: 'aosfatos.org',
  },
  {
    checkerId: 'estadao-verifica',
    status: 'active',
    recent: [
      {
        kind: 'rss',
        url: 'https://www.estadao.com.br/arc/outboundfeeds/feeds/rss/sections/estadao-verifica/',
      },
    ],
    backfill: {
      indexUrl: 'https://www.estadao.com.br/arc/outboundfeeds/sitemap-index-by-day/?outputType=xml',
      includeChild: dayOnOrAfter,
      includePage: pathStartsWith('/estadao-verifica/'),
    },
    factCheckSite: 'estadao.com.br',
  },
  {
    // robots.txt disallows /feed/ for every agent, so the news sitemap stands in for RSS.
    checkerId: 'comprova',
    status: 'active',
    recent: [{ kind: 'sitemap', url: 'https://projetocomprova.com.br/sitemap-news.xml' }],
    backfill: {
      indexUrl: 'https://projetocomprova.com.br/sitemap.xml',
      includeChild: monthOnOrAfter,
      includePage: pathStartsWith('/publica%C3%A7%C3%B5es/'),
    },
    factCheckSite: 'projetocomprova.com.br',
  },
  {
    // lupa.uol.com.br now redirects to agencialupa.org; its pages carry only NewsArticle.
    checkerId: 'lupa',
    status: 'no-claimreview',
    recent: [{ kind: 'rss', url: 'https://www.agencialupa.org/feed/' }],
    backfill: null,
    factCheckSite: 'lupa.uol.com.br',
  },
  {
    checkerId: 'g1-fato-ou-fake',
    status: 'no-claimreview',
    recent: [{ kind: 'rss', url: 'https://g1.globo.com/rss/g1/fato-ou-fake/' }],
    backfill: null,
    factCheckSite: 'g1.globo.com',
  },
  {
    checkerId: 'uol-confere',
    status: 'blocked',
    recent: [],
    backfill: null,
    factCheckSite: 'noticias.uol.com.br',
  },
  {
    checkerId: 'afp-checamos',
    status: 'blocked',
    recent: [],
    backfill: null,
    factCheckSite: 'checamos.afp.com',
  },
]
