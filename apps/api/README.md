# @carimbo/api

API HTTP do Carimbo (Fastify 5 + zod). Lê o `ReviewStore` gravado pelo worker, agrupa as checagens
por alegação e serve tudo em JSON. Os tipos das respostas estão em
`packages/core/src/api-contract.ts`.

```sh
npm run dev -w @carimbo/api   # http://127.0.0.1:3001, documentação em /docs
```

## Variáveis de ambiente

| Variável     | Padrão                       | Uso                                                  |
| ------------ | ---------------------------- | ---------------------------------------------------- |
| `DATA_FILE`  | `<raiz do repo>/data/reviews.json` | Arquivo do `ReviewStore`. Ausente: serve vazio. Relido quando o mtime muda. |
| `WEB_ORIGIN` | `http://localhost:3000`      | Origem liberada no CORS.                             |
| `API_HOST`   | `127.0.0.1`                  | Endereço de escuta.                                  |
| `API_PORT`   | `3001`                       | Porta.                                               |

## Endpoints

| Rota                       | Resposta                 | Observações                                                         |
| -------------------------- | ------------------------ | ------------------------------------------------------------------- |
| `GET /health`              | `{ status: 'ok' }`       |                                                                     |
| `GET /v1/claims`           | `Page<ClaimSummary>`     | `verdict`, `checker`, `theme`, `election`, `cursor`, `limit` (1-100, padrão 20). Mais recentes primeiro. |
| `GET /v1/claims/:slug`     | `ClaimDetail`            | Vereditos lado a lado e `related`. 404 se o slug não existe.        |
| `GET /v1/search?q=`        | `SearchResult`           | `q` com 3 a 500 caracteres; `limit` 1-50. Sem acento e com erro de digitação. |
| `GET /v1/stats/today`      | `StatsResponse`          | `days` 1-30 (padrão 1), janela terminando hoje em America/Sao_Paulo. |
| `GET /v1/checkers`         | `CheckerWithCount[]`     |                                                                     |
| `GET /v1/themes`           | `ThemeWithCount[]`       | Tema é filtro de assunto, nunca veredito.                           |
| `GET /v1/elections`        | `Election[]`             | Período oficial de campanha (TSE), mais recente primeiro.           |
| `GET /v1/coverage`         | `CoverageResponse`       | Par checador × ano sem linha é lacuna, não zero.                    |
| `GET /v1/export.json`      | `ReviewStore`            | Todas as checagens com proveniência (download).                     |
| `GET /v1/export.csv`       | CSV UTF-8 com BOM        | RFC 4180, CRLF, mesma informação do JSON.                           |
| `GET /docs`                | Swagger UI               | OpenAPI em `/docs/json`.                                            |

Erros sempre em JSON: `{ statusCode, error, message }`, com `Cache-Control: no-store`. Respostas
200 de `/v1/*` saem com `Cache-Control: public, max-age=60, stale-while-revalidate=300`.

Todos os totais são de **checagens indexadas pelo Carimbo**, não do universo de boatos.
