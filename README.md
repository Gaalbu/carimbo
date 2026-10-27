# Carimbo

**O que circulou, carimbado.** Checagens de fatos publicadas por agências brasileiras, numa tela
só: falso, fora de contexto ou verdadeiro, sempre com o nome e o link de quem checou.

O Carimbo não checa nada. Ele junta checagens já publicadas (via `ClaimReview` nas páginas dos
checadores), normaliza o veredito em quatro carimbos e mostra a avaliação original ao lado. Plano
completo em [`docs/PLANO.md`](docs/PLANO.md).

## Regras

- **Sem veredito próprio.** Todo carimbo vem de um checador, com nome e link.
- **Veredito só copiado, nunca deduzido.** Avaliação fora do mapa vira "veja a checagem".
- **Proveniência em todo registro:** URL de origem, data de coleta, método, versão do parser e
  SHA-256 do conteúdo bruto.
- **Dado ausente é dado ausente:** sem data, aparece "data não informada"; sem coleta, "sem
  cobertura", nunca zero.
- **Só campos estruturados e link.** Nenhum texto de checagem é copiado.

## Estrutura

| Pacote | O que faz |
|---|---|
| [`packages/core`](packages/core) | entidades, normalização dos carimbos, agrupamento, busca, contrato da API |
| [`packages/sources`](packages/sources) | extrator de `ClaimReview` JSON-LD, RSS, sitemap, cliente HTTP educado |
| [`apps/worker`](apps/worker) | ingestão: lê as fontes e grava `data/reviews.json` |
| [`apps/api`](apps/api) | Fastify: feed, checagem, busca, estatísticas, cobertura, dados abertos |
| [`apps/web`](apps/web) | Nuxt 4: o site |

Decisões em [`docs/adr`](docs/adr), levantamento das fontes em [`docs/spikes`](docs/spikes).

## Rodar localmente

Requer Node `>=22.22.3` (veja `.nvmrc`).

```bash
npm ci
```

```bash
npm run dev -w @carimbo/api
```

```bash
npm run dev -w @carimbo/web
```

O site abre em `http://localhost:3000` e consome a API em `http://localhost:3001`
(`NUXT_PUBLIC_API_BASE`). Para coletar checagens novas:

```bash
npm run ingest:once -w @carimbo/worker
```

Verificação completa (lint, tipos, testes e build), a mesma da CI:

```bash
npm run verify
```

## Dados abertos

`data/reviews.json` é o arquivo que o site serve, com a proveniência de cada registro. A API
também exporta em `/v1/export.json` e `/v1/export.csv`.

## Licença

MIT. As checagens pertencem a cada agência; o Carimbo publica só os campos estruturados e o link.
