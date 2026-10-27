# @carimbo/sources

Adapters que trazem checagens publicadas para dentro do Carimbo. Toda entrada externa é validada
aqui na borda (zod) e sai como campos estruturados prontos para virar `Review` do `@carimbo/core`.
Nada do texto da checagem é lido nem copiado: só os campos do `ClaimReview` e o link.

| Módulo | Exporta | Para quê |
|---|---|---|
| `claimreview.ts` | `extractClaimReviews(html, pageUrl)`, `isoDate`, `CLAIMREVIEW_PARSER_VERSION` | acha os `<script type="application/ld+json">`, abre `@graph` e listas, aceita `@type` em lista, resolve `url` relativa, lê `ratingValue` como texto ou número. Sem `datePublished` no `ClaimReview`, usa só o `datePublished` do único `Article`/`NewsArticle` da mesma página; senão fica `null` (nunca a data da coleta). A avaliação fica literal, inclusive o `"Falso: explicação…"` do Comprova. |
| `review.ts` | `buildReview`, `reviewIdFor`, `sha256Hex` | monta o `Review`: `id` = 16 primeiros hex do SHA-256 da `reviewUrl`, `verdict` só por `normalizeRating`, com `RATING_MAP_VERSION` |
| `feed.ts` | `parseFeed(xml, feedUrl)` | links e datas de itens de RSS 2.0, RSS 1.0 (RDF) e Atom |
| `sitemap.ts` | `parseSitemap(xml, url)` | índice de sitemaps ou `urlset` (com `lastmod` ou data do Google News), para backfill |
| `robots.ts` | `parseRobots(text, userAgent)` | RFC 9309: grupo do bot vence `*`, regra mais longa decide, `Allow` ganha empate, `*` e `$` |
| `http.ts` | `PoliteFetcher`, `CARIMBO_USER_AGENT` | `User-Agent: CarimboBot/0.1 (+https://github.com/Gaalbu/carimbo)`, respeita robots.txt, no máximo 1 requisição/s por host, timeout, novas tentativas com backoff exponencial (rede, 429, 5xx), redirecionamentos seguidos à mão para cada salto passar pelas mesmas regras |
| `factcheck-api.ts` | `FactCheckApiClient` | Google Fact Check Tools `claims:search` (`v1alpha1`, `languageCode=pt`); a chave vai no cabeçalho `x-goog-api-key`. O worker só usa se `FACTCHECK_API_KEY` existir. |

Comandos: `npm run build -w @carimbo/sources`, `npm test -w @carimbo/sources`.

## Fixtures

`test/fixtures/` guarda `ClaimReview` reais coletados no spike S2 (26/10/2026), reduzidos aos
campos estruturados: alegação, avaliação, datas, URL, editor e autor. Nenhum texto de checagem é
copiado (constituição, regra III). Cada arquivo cobre um caso que o extrator precisa tratar:

| Arquivo | Caso |
|---|---|
| `aosfatos-claimreview-falso.json` | `@type` em lista (`["Review", "ClaimReview"]`), avaliação em minúsculas, números como número |
| `comprova-claimreview-rating-with-explanation.json` | explicação colada na avaliação (`"Falso: …"`), sem `ratingValue`; checagem de 2024 que a home destacava em 2026 |
| `estadao-claimreview-enganoso.json` | sem `datePublished` no `ClaimReview` (só no `NewsArticle` da mesma página), `url` relativa, `ratingValue` como texto |
| `estadao-page-falso-prorrogacao.html` | página real reduzida aos blocos JSON-LD: `ClaimReview` sem data ao lado do `NewsArticle` com data e título |
| `comprova-page-audio-flavio.html` | página real reduzida: `@graph` do Yoast (só `WebPage`, cuja data não vale) e o `ClaimReview` numa lista, com unicode escapado na `url` |

Detalhes em `docs/spikes/S2-fontes.md`.
