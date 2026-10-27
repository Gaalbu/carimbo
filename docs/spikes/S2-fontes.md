# Spike S2: RSS, sitemap e ClaimReview dos checadores

**Data da verificação: 26/10/2026.** Tudo abaixo foi conferido com requisições reais, uma por
segundo por domínio, com o `User-Agent` que o worker usa
(`CarimboBot/0.1 (+https://github.com/Gaalbu/carimbo)`). Nada foi disfarçado: site que recusa
esse `User-Agent` aparece como bloqueado.

## Resultado

| Checador (`checkerId`) | RSS | Sitemap | ClaimReview JSON-LD | Status no worker |
|---|---|---|---|---|
| Aos Fatos (`aos-fatos`) | `https://www.aosfatos.org/noticias/feed/` (RSS 2.0, ~20 itens, links sem `www`) | `https://www.aosfatos.org/sitemap.xml` → `sitemap-noticias.xml` (um arquivo, ~7 mil URLs com `lastmod`, desde 2020) | **sim**, nas checagens de alegação única (`@type: ["Review","ClaimReview"]`, `datePublished`); as matérias "Checamos o debate…" com várias falas **não** têm JSON-LD | `active` |
| Estadão Verifica (`estadao-verifica`) | `https://www.estadao.com.br/arc/outboundfeeds/feeds/rss/sections/estadao-verifica/` | índice por dia `https://www.estadao.com.br/arc/outboundfeeds/sitemap-index-by-day/?outputType=xml` (um sitemap por dia, desde 1999; filtrar `/estadao-verifica/`) | **sim**, mas **sem `datePublished`** e com `url` relativa; a data vem do `NewsArticle` da mesma página | `active` |
| Comprova (`comprova`) | `/feed/` existe, mas o robots.txt proíbe `/feed/` para `*`; usamos o sitemap de notícias `https://projetocomprova.com.br/sitemap-news.xml` no lugar | `https://projetocomprova.com.br/sitemap.xml` → `sitemap-posttype-answer-french.AAAAMM.xml` (um por mês, desde 2019) | **sim**, num bloco à parte do `@graph` do Yoast; avaliação às vezes com explicação colada (`"Falso: …"`); posts "Comprova Explica"/contexto não têm | `active` |
| Lupa (`lupa`) | `https://www.agencialupa.org/feed/` (10 itens; mistura checagens e jornalismo) | `https://www.agencialupa.org/wp-content/sitemaps/sitemap_index.xml` (posts em `post-sitemapN.xml`) | **não**: só `NewsArticle`/`WebPage` no `@graph` (conferido em checagem de 26/10/2026 e de 12/11/2025) | `no-claimreview` |
| g1 Fato ou Fake (`g1-fato-ou-fake`) | `https://g1.globo.com/rss/g1/fato-ou-fake/` (100 itens) | `https://g1.globo.com/sitemap/g1/sitemap.xml` (site inteiro) | **não** no HTML servido: só um bloco `Organization` | `no-claimreview` |
| UOL Confere (`uol-confere`) | não verificado: **403 (Akamai)** para o nosso `User-Agent` em `/confere/` e nos sitemaps | robots.txt (acessível) lista `https://noticias.uol.com.br/sitemap/index.xml`, mas os sitemaps respondem 403 | não verificado | `blocked` |
| AFP Checamos (`afp-checamos`) | não verificado: **403 (Akamai)** em tudo, inclusive `robots.txt` | não verificado | não verificado | `blocked` |

## Observações que viraram regra no código

- **Lupa mudou de casa.** `lupa.uol.com.br` e `lupa.news` redirecionam (301) para
  `https://www.agencialupa.org/`. O catálogo de checadores (`packages/core/src/checkers.ts`) ainda
  aponta a home antiga; o redirecionamento funciona, mas vale atualizar.
- **robots.txt:** nenhum dos sites acessíveis bloqueia `CarimboBot` nem `*` nas páginas de
  checagem. Estadão bloqueia `/feed/$` (não afeta o feed do Arc) e libera `/estadao-verifica`.
  O robots.txt do Comprova escreve o primeiro `User-agent` com um hífen invisível (U+00AD); o
  parser remove esse caractere e honra o `Disallow: /feed/`, que é a leitura mais restritiva.
  Lupa publica `Content-Signal: search=yes, ai-train=no, use=reference`: o Carimbo só guarda
  campos estruturados e o link, o que cabe em `search`/`reference`.
- **Data ausente continua ausente.** Estadão não põe `datePublished` no `ClaimReview`; o extrator
  usa só o `datePublished` do único `Article`/`NewsArticle` da página (nunca o de `WebPage`, nunca
  a data da coleta). Se houver dois `Article` com datas diferentes, fica `null`.
- **Data como o checador escreveu.** `2026-10-26T15:29:46-03:00` vira `2026-10-26` (a parte de
  data do texto), sem conversão de fuso.
- **URL canônica.** A `reviewUrl` é a `url` do `ClaimReview` resolvida contra a página e
  percent-encoded (`publicações` → `publica%C3%A7%C3%B5es`), para o `id` ser estável entre RSS e
  sitemap.
- **Aos Fatos "Checamos…"** (debates, entrevistas) agrupa várias falas numa página sem
  `ClaimReview`. Se um dia vierem vários `ClaimReview` com a mesma `url`, o worker mantém o
  primeiro e avisa no stderr, porque o `id` é derivado só da `reviewUrl`.

## Lacunas e próximos passos

- **Lupa e g1** precisam de um parser `html_parser` (selo impresso na página) com fixture por época
  do site, ou da Fact Check Tools API (S1). Até lá: "sem cobertura", nunca zero.
- **UOL Confere e AFP Checamos** recusam o nosso `User-Agent` identificado. Caminhos honestos:
  pedir liberação aos sites, ou a Fact Check Tools API (o worker já consulta por
  `reviewPublisherSiteFilter` quando `FACTCHECK_API_KEY` existe). Não vamos trocar o
  `User-Agent` por um de navegador.
- Sem chave da Fact Check Tools API neste ambiente, o S1 continua aberto.

## Coleta inicial (26/10/2026)

`npm run ingest:once -w @carimbo/worker -- --max-pages 5` seguido de
`npm run ingest:once -w @carimbo/worker -- --since 2026-08-16` (início da campanha de 2026).
514 páginas de checagem buscadas, 1 por segundo por domínio, nenhuma falha de rede, nenhuma
falha de leitura de JSON-LD.

| Checador | Páginas listadas | Buscadas | Sem ClaimReview | Checagens em `data/reviews.json` |
|---|---|---|---|---|
| Aos Fatos | 225 | 224 | 57 | 162 |
| Estadão Verifica | 212 | 212 | 76 | 136 |
| Comprova | 78 | 78 | 35 | 43 |
| **Total** | | | | **341** |

Carimbos: 226 FALSO, 86 FORA DE CONTEXTO, 4 VERDADEIRO, 25 VEJA A CHECAGEM. Nenhuma checagem
ficou sem data (todas têm `datePublished` no `ClaimReview` ou no `NewsArticle`). Algumas datas
são anteriores a agosto porque o sitemap lista a última modificação: checagens antigas
atualizadas (a mais antiga, de 28/10/2018, da Aos Fatos) entram com a data original.

Avaliações fora do mapa (`RATING_MAP_VERSION = 1`), insumo do S3:

| Checador | Avaliação literal | Vezes |
|---|---|---|
| Aos Fatos | `não_é_bem_assim` | 13 |
| Comprova | `Falta contexto` | 10 |
| Comprova | `Sátira` | 2 |
| Comprova | `Comprovado` | 1 |

Perda conhecida: 9 páginas da Aos Fatos com várias falas ("Checamos a live…") trazem vários
`ClaimReview` com a mesma `url`; como o `id` vem só da `reviewUrl`, 27 avaliações ficaram de
fora (o worker avisa no stderr). Resolver exige mudar o contrato do `id` (ex.: incluir a
alegação no hash), decisão do `packages/core`.

### Conferência manual (amostra de 15)

Sorteio de 10 registros quaisquer + 3 do Comprova + 2 do Estadão, conferidos contra a cópia bruta
da página (`data/raw/`, privado): alegação, avaliação literal, data da checagem, data da alegação,
autor e título batem com o JSON-LD e com o `<title>` da página em 15 de 15. Observações: a Aos
Fatos usa `desinformação` como "autor" genérico da alegação (copiado como está); o slug de uma
página do Estadão diz `fora-contexto`, mas o `ClaimReview` diz `Enganoso`, e o Carimbo copia o
`ClaimReview`.
