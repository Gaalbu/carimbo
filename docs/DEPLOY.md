# Deploy

O Carimbo no MVP são duas peças sem banco (ADR 0003): a **API** (Fastify, lê
`data/reviews.json`) e o **site** (Nuxt 4, SSR com cache). A coleta roda no GitHub Actions e
versiona o arquivo de dados no próprio repositório.

```
GitHub Actions (a cada 6 h) ──► data/reviews.json no main ──► imagem/volume da API ──► site
```

## Produção atual: GitHub Pages (estático)

O site no ar é a versão estática, em https://gaalbu.github.io/carimbo/, publicada por
`.github/workflows/pages.yml` a cada push na `main` e depois de cada coleta bem-sucedida.

- `npm run generate:static -w @carimbo/web` copia `data/reviews.json` (e gera o CSV) para
  `dados/` e pré-renderiza todas as páginas com `NUXT_PUBLIC_STATIC_DATA=dados/reviews.json`.
- Sem servidor de API: busca, filtros e "carregar mais" rodam no navegador com as mesmas funções
  de `packages/core` que a API usa, sobre o mesmo arquivo.
- Saída em `apps/web/.output/public`, servida sob `NUXT_APP_BASE_URL=/carimbo/`.

As opções abaixo (container da API + site SSR) continuam valendo para quando o volume pedir.

## Imagens

| Arquivo          | O que gera                                       | Porta | Healthcheck |
| ---------------- | ------------------------------------------------ | ----- | ----------- |
| `Dockerfile.api` | `node dist/server.js`, usuário `node`, com o `data/` do build | 3001  | `/health`   |
| `Dockerfile.web` | `node .output/server/index.mjs` (Nitro `node-server`), usuário `node` | 3000  | `/`         |

```bash
docker build -f Dockerfile.api -t carimbo-api .
docker build -f Dockerfile.web -t carimbo-web .
```

Local, com os dois juntos:

```bash
docker compose --profile app up --build   # site em :3000, API em :3001
```

Sem o profile, o `compose.yml` sobe só PostgreSQL e Redis, como antes. No profile `app` o
container do site compartilha a rede do container da API, porque o site usa a mesma
`NUXT_PUBLIC_API_BASE` no SSR e no navegador.

## Variáveis de ambiente

| Variável               | Onde   | Padrão na imagem          | Uso |
| ---------------------- | ------ | ------------------------- | --- |
| `DATA_FILE`            | API    | `/app/data/reviews.json`  | Arquivo do `ReviewStore`. Ausente: a API serve vazio. Relido quando o mtime muda. |
| `WEB_ORIGIN`           | API    | `http://localhost:3000`   | Origem liberada no CORS. Em produção, a URL pública do site. |
| `API_HOST`             | API    | `0.0.0.0`                 | Endereço de escuta (fora do container o padrão é `127.0.0.1`). |
| `API_PORT`             | API    | `3001`                    | Porta. Algumas plataformas injetam `PORT`; mapeie para `API_PORT`. |
| `NUXT_PUBLIC_API_BASE` | site   | `http://localhost:3001`   | URL pública da API, lida em tempo de execução. Usada no SSR e no navegador, então precisa ser alcançável pelos dois. |
| `NUXT_PUBLIC_SITE_URL` | site   | vazio                     | Origem absoluta para `og:url`/`og:image`. Vazio: usa o host da requisição. |
| `FACTCHECK_API_KEY`    | ingest | (segredo do repositório)  | Chave da Google Fact Check Tools API, usada só pelo worker no workflow `ingest.yml`. |

## Site

| Opção | Como | Observações |
| --- | --- | --- |
| Vercel | Projeto apontando para `apps/web`, comando `npm run build -w @carimbo/web` na raiz | Nitro detecta o preset da Vercel; `routeRules` com `swr` vira cache da plataforma. Definir `NUXT_PUBLIC_API_BASE`. |
| Netlify | Igual, preset Netlify detectado pelo Nitro | Idem. |
| Container Node | `Dockerfile.web` em qualquer host de containers | Cache SWR fica em memória do processo; ponha um CDN na frente se precisar. |

## API

| Opção | Como | Observações |
| --- | --- | --- |
| Fly.io | `Dockerfile.api`, porta interna 3001, check em `/health` | Volume opcional em `/app/data` para trocar o arquivo sem rebuild. |
| Render | Web Service a partir de `Dockerfile.api` | Redeploy automático a cada push no main inclui o `reviews.json` novo. |
| Railway | Serviço a partir de `Dockerfile.api` | Idem. |
| VM pequena | `docker compose --profile app up -d` ou só a imagem da API atrás de um proxy (Caddy/nginx) | Um `git pull` periódico atualiza `data/` montado como volume; a API relê o arquivo sozinha. |

A imagem leva o `data/reviews.json` do momento do build. Duas formas de manter os dados frescos:

1. **Redeploy a cada commit no main** (o mais simples): o workflow de ingestão commita o arquivo e a
   plataforma reconstrói a imagem.
2. **Volume em `/app/data`**: algo externo (cron com `git pull`, `curl` do raw do GitHub) troca o
   arquivo, e a API recarrega quando o mtime muda.

## Ingestão (`.github/workflows/ingest.yml`)

- Roda a cada 6 horas (minuto 17) e sob demanda (`workflow_dispatch`).
- `npm ci`, `npm run build:packages`, `npm run ingest:once -w @carimbo/worker`.
- Se `data/reviews.json` mudou, commita no `main` como `github-actions[bot]` e faz push (com
  `pull --rebase` e até três tentativas). Só esse arquivo entra no commit; `data/raw/` nunca.
- `concurrency: ingest` impede duas coletas ao mesmo tempo; timeout de 30 min.
- Configure o segredo `FACTCHECK_API_KEY` em Settings → Secrets and variables → Actions.
- Se o `main` tiver proteção de branch exigindo PR, o push do bot falha: libere o
  `github-actions[bot]` ou troque o passo final por abertura de PR.
- Commits feitos com `GITHUB_TOKEN` não disparam outros workflows (a CI não roda nesses commits);
  o webhook da plataforma de deploy dispara normalmente.

## CI (`.github/workflows/ci.yml`)

Além de lint, tipos, testes e build, o job `docker` constrói as duas imagens (sem push), com cache
de camadas do GitHub Actions.

## Custos

Nenhum valor aqui foi conferido. Antes de escolher, consulte a página de preços de cada serviço.

| Item | Custo |
| --- | --- |
| GitHub Actions (ingestão a cada 6 h, repositório público) | verificar |
| Vercel / Netlify (site) | verificar |
| Fly.io / Render / Railway (API em container) | verificar |
| VM pequena (API + site) | verificar |
| Google Fact Check Tools API | verificar |
