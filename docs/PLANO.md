# Plano: Carimbo

Criado em 26/10/2026, um dia depois do 2º turno. Nome provisório (verificar domínio antes da F5).

> **Carimbo**: o que circulou, carimbado. Verdadeiro, falso ou fora de contexto, numa tela só,
> com o link de quem checou. Todas as checagens desde a primeira eleição que teve checagem
> registrada no Brasil, sem um dado inventado.

## 1. Objetivo duplo

| Objetivo | Medida de pronto |
|---|---|
| **Fechar a lacuna Node.js** (51 vagas em `lacunas.md`, a maior) **e abrir Vue/Nuxt** | repo público, CI verde, testes, deploy no ar e bullet no currículo-base apontando para ele |
| **Produto que as pessoas usam** | quem recebeu um boato no WhatsApp cola o texto na busca e, em segundos, vê o carimbo e o link da checagem |
| **Arquivo histórico confiável** | todas as checagens dos checadores cobertos desde a primeira eleição com checagem registrada (provável 2014, ver §4.5), cada uma com fonte, método de extração e data de coleta; o que falta aparece como "sem cobertura" |

O seuimposto.com resolveu "quem está ganhando?" em uma tela. O Carimbo resolve "isso é verdade?"
do mesmo jeito: a resposta primeiro, grande, e a fonte logo abaixo.

**Momento:** a eleição acabou ontem, mas a onda de boatos pós-eleição (urna, fraude, posse,
transição) começa agora. O Carimbo e o Confere (`~/codigos/confere`) se completam: uma checagem
sobre "urna fraudada na seção X" pode apontar para a conferência daquele BU.

## 2. O que deu certo no seuimposto.com (visto em 26/10/2026, renderizado em desktop e celular)

| # | O que eles fizeram | Como vira Carimbo |
|---|---|---|
| 1 | **Manchete em frase, conclusão primeiro:** "Lula é eleito presidente", em serifa, no topo, acima de qualquer número. | Cada checagem abre com o carimbo (FALSO) e a frase do boato em serifa. Na home, a manchete é o placar do dia: "Hoje: 14 falsos, 5 fora de contexto, 2 verdadeiros". |
| 2 | **Uma tela, tudo visível no desktop:** placar em cima, mapa no centro, projeção à esquerda, chat à direita, linha do tempo embaixo. Sem rolagem. | Desktop em 3 colunas: filtros/temas · feed de carimbos · "mais procurados" e checadores. Sem rolagem da página, só do feed. |
| 3 | **Celular com barra de abas fixa embaixo** (Mapa, Explorar, Chat, Resultados) e placar grudado no topo. | Abas: Agora · Buscar · Temas · Sobre. Placar do dia grudado no topo. |
| 4 | **Fundo quase preto quente** (`--bg:#0F0E0D`, painéis `#151412`/`#1B1A17`), texto off-white (`#FAFAF9`), linhas em branco com 8-25% de opacidade. Cor só onde tem dado. | Mesma regra: o único lugar com cor forte é o carimbo. É isso que torna a estética "agressiva" sem virar poluição. |
| 5 | **Duas fontes:** Faustina (serifa, manchete) e Geist (sans, UI e números), woff2 com subset e `preload`. Escala curta em tokens (`--t-manchete:27px`, `--t-fig:42px`, `--t-body:13px`, `--t-micro:11px`). | Serifa para o texto do boato (é uma citação), sans para UI, e uma terceira, condensada e pesada, só no carimbo. Mesma disciplina de tokens. |
| 6 | **Números grandes e tabulares** (51,79%, 64.256.232 votos) com barra e marca de 50%. | Contadores do placar do dia com `tabular-nums` e barra proporcional falso/contexto/verdadeiro. |
| 7 | **Marcos que contam a história:** "Virada às 19:45", "Eleição definida às 21:08" na linha do tempo, e "4,26% das urnas bastaram para a projeção". | Linha do tempo de um boato: "primeira checagem em 24/10", "5 checadores concordam", "voltou a circular hoje". O dado vira frase. (ClaimReview costuma trazer só a data, sem hora: não prometer horário.) |
| 8 | **Comparação com o antes:** "O que mudou desde o 1º turno". | "Boatos que voltaram": mesma alegação checada de novo semanas depois. |
| 9 | **Prova social ao vivo:** "3.889 pessoas acompanhando" no rodapé. | "N pessoas conferindo agora" e "procurado N vezes hoje" em cada checagem. |
| 10 | **Busca única:** "Buscar município, estado ou candidato". | É o centro do produto: "Cole aqui o que você recebeu". |
| 11 | **Compartilhar pronto:** OG 1200×630 com `og:image:alt`, `twitter:card` grande, `theme-color`, favicon SVG inline. | OG gerada por checagem com o carimbo estampado. É o que vai para o grupo da família. Botão "Mandar no WhatsApp" (`wa.me/?text=` com o link). |
| 12 | **Fonte sempre visível:** "Dados do TSE" fixo no rodapé, autor com redes ao lado. | "Checagens de Lupa, Aos Fatos, …" no rodapé e o nome do checador em cada card. Autor (você) com GitHub e LinkedIn: é vitrine. |
| 13 | **Acessibilidade de verdade:** `aria-label` descritivo em cada estado ("Pará, Lula 55,0%"), na barra ("a linha do meio marca 50%") e nos marcos. | Cada carimbo com `aria-label` completo ("Falso, segundo Aos Fatos, 24/10"). O carimbo nunca é só cor: sempre tem a palavra. |
| 14 | **Leve e rápido:** nenhum marcador de framework de SPA no DOM renderizado, JS em arquivos com hash (`app.2c8569aaea.js`), dados pré-gerados em JS estático (`zonas.js`, `t1mun.js`), Cloudflare na frente. | SSR + cache de borda no Nuxt; home e páginas de checagem pré-renderizadas/ISR; o cliente não monta nada que o servidor possa entregar pronto. |
| 15 | **Modo tela cheia e modo escuro como padrão**, com alternância. | Escuro padrão, claro opcional. Tela cheia serve para quem transmite em live. |
| 16 | **Patrocínio visível** ("Apresentado por G4 Valley") no cabeçalho, discreto. | Fica para depois do MVP, e só patrocínio institucional. |

**O que não copiar:**

- **Chat ao vivo:** mesmo com login Google e moderação, o print mostrou xingamento e spam na
  primeira tela. Num site de checagem isso destrói a credibilidade. Sem chat.
- **Anúncio de aposta e de "tomar o espaço por R$ 32.000"** colado no mapa. Sem anúncio no MVP.
- **Mensagem de navegador não suportado** no lugar do conteúdo (o HTML sem JS só diz "abra no
  Chrome"). O Carimbo renderiza no servidor: sem JS, a checagem ainda aparece.

## 3. Framework: Vue 3 + Nuxt 4

| Front | Menções em `candidaturas.csv`* | Projeto seu que já prova |
|---|---:|---|
| React | 106 | algebra-tiles, simulafisica, la-fora |
| Angular | 96 | de-la-do-para, ReceitasApi UI, controle-gastos, vaga-pilot |
| Next.js | 8 | portfolio_gab, cade-meu-dinheiro (e a web do Confere) |
| **Vue / Nuxt** | 5 / 0 | **nenhum** |
| Svelte | 0 | nenhum |

\* contagem bruta de texto (`grep -ic`), só para ordem de grandeza. `lacunas.md` conta Vue em 4
vagas e Next em 6.

**Escolha: Nuxt 4 (Vue 3, Composition API, TypeScript).**

- Nas suas candidaturas, Vue aparece quase tanto quanto Next (5 × 8 menções no CSV; 4 × 6
  vagas em `lacunas.md`) e é o único dos frameworks citados sem projeto seu. Svelte não aparece.
  O `PLANO_CANDIDATURAS.md` já trata Vue como transferível e lista o Vue Jobs como fonte.
- Next.js já está provado no portfolio_gab e no cade-meu-dinheiro. Um terceiro projeto Next
  rende menos que o primeiro em Vue.
- Nuxt roda em Node (servidor Nitro): SSR, rotas de servidor e geração de OG são Node. O front
  também conta como experiência Node.
- Vue tem a mesma família de ideias de Angular (templates, diretivas, componentes) e React
  (composables ≈ hooks). Curva curta para você.

**Backend: Node.js com Fastify, separado do Nuxt.** As vagas pedem "Node.js" (51) muito mais do
que NestJS (4), e o NestJS já aparece no norte4j-api e no Confere. Um serviço Fastify com
TypeScript, validação por schema e workers mostra Node sem a camada do Nest, que é o que a
maioria das vagas Node testa.

## 4. Produto

### 4.1 De onde vêm as checagens

O Carimbo **não checa nada**. Ele junta checagens já publicadas por agências e mostra o veredito
delas, com link.

| Fonte | Como | Status |
|---|---|---|
| Google Fact Check Tools API (`claims:search`, `languageCode=pt`) | agrega o ClaimReview de vários checadores: texto da alegação, quem disse, data, avaliação textual, URL e editor | **spike S1**: a API ainda é `v1alpha1`; confirmar cobertura de checadores BR e limites com chave real |
| ClaimReview (JSON-LD) nas páginas dos checadores | ler RSS de cada checador e extrair o `ClaimReview` da página da checagem | **spike S2**: listar quais publicam ClaimReview e RSS hoje (Lupa, Aos Fatos, Estadão Verifica, UOL Confere, AFP Checamos, Comprova, g1 Fato ou Fake) |
| Arquivo de cada checador (sitemap, páginas de listagem por data) | backfill histórico, para as checagens anteriores ao RSS | **spike S6** |
| Internet Archive (Wayback Machine) | checagens cujo site original saiu do ar ou mudou de endereço | **spike S7** |

As quatro alimentam a mesma fila. Se a API do Google cair ou não cobrir algum checador, o RSS
cobre o presente e o arquivo do checador cobre o passado.

### 4.2 Os três carimbos

Cada checador usa um vocabulário. O Carimbo guarda a avaliação original e a normaliza:

| Carimbo | Avaliações originais (exemplos, mapa completo na spec 002) | Cor |
|---|---|---|
| **FALSO** | falso, fake, montagem, inventado | vermelho |
| **FORA DE CONTEXTO** | enganoso, sem contexto, distorcido, exagerado, impreciso | âmbar |
| **VERDADEIRO** | verdadeiro, verdade, correto | verde |
| **VEJA A CHECAGEM** | qualquer avaliação que não encaixa (subestimado, contraditório, insustentável, "ainda é cedo") | cinza |

A avaliação original aparece sempre embaixo do carimbo ("Aos Fatos: enganoso"). Avaliação nova
desconhecida vai para "veja a checagem" e gera um alerta para incluir no mapa, nunca um palpite.

### 4.3 Telas

1. **Home (Agora):** placar do dia (contadores por carimbo), busca "cole aqui o que você recebeu",
   feed em ordem cronológica, faixa "mais procurados hoje", filtros por tema e por checador.
   Seletor de eleição no topo, no lugar do "Presidente / Governadores" do seuimposto:
   `2026 · 2024 · 2022 · 2020 · 2018 · 2016 · 2014 · tudo`.
2. **Eleição `/eleicao/[ano]`:** a mesma tela com o recorte do período de campanha daquele ano
   (datas do calendário oficial do TSE, versionadas no repo): placar da eleição, linha do tempo
   da campanha, temas e checadores ativos naquele ano. Checador que não existia ou não tem dado
   coletado aparece como "sem cobertura", nunca como zero.
3. **Cobertura `/cobertura`:** tabela checador × ano com a contagem indexada, a primeira e a
   última data, o método de coleta e as lacunas conhecidas. É a página que prova que o arquivo
   não mente.
4. **Checagem `/c/[slug]`:** carimbo grande, a frase do boato em serifa, quem checou, quando,
   onde circulou (quando o ClaimReview informa), linha do tempo e outras checagens da mesma
   alegação. Botões "Ler a checagem completa" (link externo) e "Mandar no WhatsApp".
5. **Busca `/buscar?q=`:** busca de texto em português (sem acento, com tolerância a erro de
   digitação) por similaridade com alegações já checadas. Sem resultado: "Ainda não checado.
   Envie para um checador" com os canais oficiais de cada agência.
6. **Tema `/tema/[slug]`:** urna e eleição, saúde, economia, clima… com o mesmo feed filtrado.
7. **Checadores `/fontes`:** quem são, link e quantas checagens de cada um estão no Carimbo.
8. **Metodologia `/como-funciona`:** de onde vem, como normaliza, o que o Carimbo não faz.
9. **Dados abertos `/dados`:** exportação CSV/JSON de todos os registros, com a proveniência
   (§4.5). Quem duvidar pode refazer as contas.

### 4.4 Regras (vão para a constituição do repo)

1. **Sem veredito próprio.** Todo carimbo vem de um checador, com nome e link. O Carimbo nunca
   muda uma avaliação.
2. **Neutralidade:** nenhum ranking de "quem mais mente" no MVP. Pessoas citadas aparecem como
   filtro, não como placar.
3. **Direito autoral:** só os campos estruturados (alegação, avaliação, título, data, editor) e o
   link. Nada do texto da checagem copiado.
4. **Dado ausente é dado ausente:** sem data, aparece "data não informada", nunca a data de
   ingestão disfarçada.
5. **Acessibilidade:** WCAG 2.2 AA, carimbo sempre com palavra, `prefers-reduced-motion` desliga
   a animação de carimbar.
6. **Sem mentir dado:** as regras da §4.5 valem acima de qualquer prazo ou meta de volume.

### 4.5 Arquivo histórico: desde a primeira eleição, sem mentir dado

**Ponto de partida provável: eleição de 2014.** O Truco, da Agência Pública, foi criado para
checar as falas dos candidatos a presidente em 2014, e o blog Preto no Branco, do O Globo, teve
o auge na mesma campanha. O spike S6 confirma se existe algo anterior e, principalmente, o que
ainda está acessível. O ano de início do arquivo é o da checagem mais antiga que se consegue
**provar com fonte**, não o que a literatura diz.

Regras (entram na constituição do repo):

1. **Proveniência em todo registro.** Cada checagem guarda `sourceUrl`, `fetchedAt`, `method`
   (`factcheck_api` · `claimreview` · `html_parser` · `wayback`), `parserVersion` e o SHA-256 do
   conteúdo bruto. Registro sem esses campos não entra no banco (restrição `NOT NULL` + teste).
2. **Veredito só copiado, nunca deduzido.** A avaliação vem literalmente do ClaimReview ou do
   selo impresso na página do checador, extraído por um parser com fixture e teste. Sem LLM, sem
   classificador, sem "parece falso pelo título". Não deu para extrair: `unknown` ("veja a
   checagem").
3. **Bruto guardado, texto não publicado.** O HTML/JSON original fica guardado (privado) para
   reprocessar quando um parser melhorar. O site publica só os campos estruturados e o link.
4. **Site fora do ar vira Wayback, e isso aparece.** Quando a fonte é um snapshot do Internet
   Archive, o card diz "fonte arquivada em DD/MM/AAAA", com o link do snapshot.
5. **Lacuna é lacuna.** Checador sem dado num ano aparece como "sem cobertura" na `/cobertura` e
   no recorte da eleição. Nenhum número é extrapolado ou estimado.
6. **Contagem com o nome certo.** Sempre "checagens indexadas pelo Carimbo", nunca "mentiras da
   eleição de 2018". Os totais dependem de quem checou e de quanto foi coletado, e a interface
   diz isso.
7. **Histórico de revisão.** Se o checador mudar a avaliação, as duas ficam guardadas e o card
   mostra "avaliação atualizada em DD/MM/AAAA".
8. **Vereditos diferentes nunca se fundem.** O agrupamento junta a mesma alegação, mas mostra o
   veredito de cada checador lado a lado.
9. **Auditoria por amostra.** A cada backfill, sortear 20 registros por checador × eleição e
   conferir à mão contra a página original. O resultado fica em `docs/auditoria/AAAA-MM-DD.md`.
   Taxa de erro acima de 0 em veredito bloqueia a publicação daquele lote até o parser ser
   corrigido.
10. **Link quebrado é monitorado.** Um job semanal confere os `sourceUrl`. Link que morreu ganha
    o snapshot do Wayback, se houver, ou o selo "fonte original indisponível".

Boa cidadania no backfill: respeitar `robots.txt`, usar o sitemap quando houver, 1 requisição por
segundo por domínio, `User-Agent` identificado, cada página baixada uma vez.

## 5. Estética: agradável e agressiva

Base do seuimposto (escuro quente, cor só no dado, serifa + sans) com uma camada de impacto:

- **O carimbo é o herói:** caixa-alta em fonte condensada e pesada (candidatas: Anton, Big
  Shoulders Display ou Archivo Black; escolher no protótipo), borda dupla, leve rotação
  (`-3deg`), textura de tinta em SVG. Ao entrar na tela, animação curta de "bater o carimbo"
  (escala 1.4 → 1, 180 ms, `--ease-out`).
- **Contraste alto:** vermelho e âmbar saturados sobre o quase preto; o resto da interface é
  cinza quente e some.
- **Ritmo de feed:** cards densos, sem sombra e sem gradiente, separados por linha de 1 px como
  no seuimposto. A cor do carimbo é a única coisa que salta.
- **Faixa "agora" no topo:** última checagem passando em letreiro (pausável, desligada com
  movimento reduzido).
- **Atalhos de teclado:** `/` busca, `F`/`C`/`V` filtram por carimbo, `J`/`K` navegam no feed.

Tokens de partida:

```css
:root {
  color-scheme: dark;
  --bg: #0f0e0d; --panel: #151412; --panel-2: #1b1a17;
  --line: rgba(250, 250, 249, .08); --line-2: rgba(250, 250, 249, .16);
  --fg: #fafaf9; --fg-2: #d6d4cf; --fg-3: #a6a39c;
  --falso: #ff3b30; --contexto: #ffb020; --verdadeiro: #3dd68c; --outro: #85827c;
  --serif: "Faustina", Georgia, serif;
  --sans: "Geist", "Helvetica Neue", Arial, sans-serif;
  --stamp: "Anton", Impact, sans-serif;
  --ease-out: cubic-bezier(.16, 1, .3, 1);
  --t-manchete: 27px; --t-fig: 42px; --t-body: 14px; --t-micro: 11px;
}
:root[data-theme="light"] {
  color-scheme: light;
  --bg: #f7f6f3; --panel: #ffffff; --fg: #1a1917; --fg-3: #6b6862;
  --falso: #b3261e; --contexto: #8a5300; --verdadeiro: #17774a; --outro: #6b6862;
}
```

Contraste medido (WCAG, 26/10):

| Carimbo | Escuro: cor sobre `#0f0e0d` | Claro: cor sobre `#f7f6f3` |
|---|---:|---:|
| falso | 5,4 | 6,1 |
| fora de contexto | 10,6 | 5,9 |
| verdadeiro | 10,3 | 5,2 |
| veja a checagem | 5,0 | 5,1 |

As cores do escuro **não servem no claro** (âmbar e verde caem para 1,7). Por isso existem duas
paletas. Texto dentro de um carimbo preenchido usa `--bg`, nunca branco: branco sobre o
vermelho do escuro dá 3,6 e reprova.

## 6. Arquitetura

```
 Google Fact Check API ─┐                       ┌──► apps/web (Nuxt 4 · SSR/ISR · OG por checagem)
 RSS + JSON-LD checador ┤                       │          ▲
                        ▼                       │          │ REST (cache longo)
        apps/worker (Node + BullMQ) ──► PostgreSQL ◄── apps/api (Node + Fastify)
         fetch → parse → normalize           ▲
         → dedupe → index                    └── Redis (filas, contadores "agora", cache)
```

| Pacote | Responsabilidade |
|---|---|
| `packages/core` | entidades (`Claim`, `Review`, `Verdict`, `FactChecker`), normalização de avaliação, agrupamento de alegações iguais, portas. Sem framework. |
| `packages/sources` | adapters: cliente da Fact Check API, leitor de RSS, extrator de ClaimReview JSON-LD. Validação com zod. |
| `apps/worker` | filas BullMQ `poll-sources` (a cada 15 min), `extract`, `normalize`, `dedupe`. |
| `apps/api` | Fastify: `GET /v1/claims`, `/v1/claims/:slug`, `/v1/search?q=`, `/v1/stats/today`, `/v1/checkers`. OpenAPI gerado do schema. |
| `apps/web` | Nuxt 4: páginas, componentes, OG image, SSR com cache. |

Decisões que viram ADR na F0:

1. Monorepo npm workspaces (como no Confere).
2. Fastify em vez de Express/Nest (desempenho, schema-first, menos mágica; Nest já está provado).
3. Prisma + PostgreSQL; busca com `tsvector` em português + `unaccent` + `pg_trgm` via SQL
   tipado, sem Elasticsearch.
4. Agrupamento de alegações iguais por similaridade de trigramas + mesma URL de origem; nada de
   embeddings no MVP.
5. Nuxt com `routeRules` (ISR na home e nas checagens) e OG via `nuxt-og-image`. Contadores ao
   vivo ("conferindo agora", "procurado hoje") ficam fora do HTML em cache: o cliente busca
   `GET /v1/stats/live` a cada 30 s. Contagem anônima no Redis com TTL, sem cookie nem
   identificador do visitante (LGPD).
6. Onde o worker roda em produção (decidir no spike S5 com preços reais): **A)** um container
   único com API + worker + Redis numa máquina pequena paga; **B)** GitHub Actions agendado a cada
   15 min rodando `npm run ingest:once`, com Redis gerenciado. Free tier não sustenta worker
   sempre ligado, e BullMQ ocioso consome comandos do Redis gerenciado continuamente.

## 7. Stack

| Camada | Escolha |
|---|---|
| Runtime | Node.js LTS atual (`.nvmrc`), TypeScript strict em tudo |
| API | Fastify 5 + `@fastify/swagger` + zod (type provider) |
| Filas | BullMQ + Redis 7 |
| Banco | PostgreSQL 17 + Prisma; `unaccent`, `pg_trgm` |
| Web | Nuxt 4, Vue 3 (`<script setup>`), Pinia só se o estado global aparecer, CSS com tokens (sem Tailwind, para não repetir o portfolio) |
| Testes | Vitest (core, sources, api com `fastify.inject`), Testcontainers (Postgres), `@nuxt/test-utils`, Playwright (E2E) |
| Qualidade | ESLint + Prettier, `vue-tsc --noEmit`, GitHub Actions, Lighthouse CI na F5 |
| Entrega | Docker Compose local; web na Vercel ou Netlify, Postgres no Neon; API + worker + Redis conforme a ADR 6 (custo real medido no S5, não presumir free tier) |

## 8. Fases

Ritmo de ~10 h/semana. Cada fase termina com algo demonstrável e CI verde.

| Fase | Entrega | Estimativa |
|---|---|---|
| **F0: fundação** | monorepo, Compose (Postgres + Redis), lint, Vitest, CI, ADRs 1-5, spikes S1-S3 | 1 semana |
| **F1: ingestão** | adapters das duas fontes com fixtures reais, normalização dos carimbos, worker com filas, dedupe | 1,5 semana |
| **F1b: backfill histórico** | parser por checador para o arquivo antigo (com fixtures de cada época do site), Wayback para o que saiu do ar, proveniência obrigatória, primeira auditoria por amostra, página de cobertura em JSON | 2-3 semanas |
| **F2: API** | Fastify com feed, checagem, busca, stats do dia, recorte por eleição, cobertura e exportação de dados abertos; OpenAPI; testes de integração | 1,5 semana |
| **F3: protótipo + web** | protótipo da home e da checagem; Nuxt com feed, checagem, busca, carimbo animado | 2 semanas |
| **F4: compartilhar** | OG por checagem, botão WhatsApp, "mais procurados", contador "conferindo agora" | 1 semana |
| **F5: publicar** | deploy, domínio, Lighthouse, página de metodologia, README com GIF, post no LinkedIn, bullet no currículo | 1 semana |

**Marco mínimo para o currículo:** fim da F2 (API Node pública com testes e CI). **Marco para
Vue entrar no currículo:** fim da F3.

### Spikes

| Spike | Pergunta | Saída |
|---|---|---|
| S1 | A Fact Check Tools API cobre os checadores BR? Quantas alegações em pt nos últimos 30 dias? Cota? Quanto tempo leva entre a checagem sair no site e aparecer na API? **Precisa de uma chave de API criada por você no Google Cloud.** | número real + ADR "fonte primária" |
| S2 | Quais checadores publicam RSS e ClaimReview JSON-LD hoje? | tabela checador × RSS × JSON-LD |
| S3 | Vocabulário real de avaliações (coletar todas as `textualRating` de S1 e S2) | mapa de normalização versionado + teste que cobre cada valor |
| S4 | Similaridade: qual limiar de `pg_trgm` agrupa "urna fraudada em X" sem juntar alegações diferentes? | limiar + casos de teste reais |
| S5 | Custo mensal real das opções A e B da ADR 6 | tabela de preços com data + decisão |
| S6 | Qual a checagem eleitoral mais antiga que ainda se prova com fonte? Para cada checador: desde quando publica, se tem sitemap ou listagem por data, quantas páginas por eleição, como o selo do veredito aparecia em cada época do site | tabela checador × eleição (2014-2026) + ano de início do arquivo |
| S7 | O Wayback Machine tem snapshots das checagens que saíram do ar (ex.: Truco, Preto no Branco)? Limites de uso da API de disponibilidade? | lista do que é recuperável + ADR "fonte arquivada" |

## 9. Critérios de aceite do MVP

1. **Dado** uma checagem nova no RSS de um checador coberto, **quando** o worker roda, **então**
   ela aparece no feed em até 30 min, com carimbo, avaliação original e link. (O atraso da API
   do Google não entra nesse prazo: ele depende da indexação deles e é medido no S1.)
2. **Dado** o texto "urna eletrônica foi hackeada" colado na busca, **então** as checagens
   parecidas aparecem em menos de 300 ms (p95, banco local), mesmo sem acento ou com erro de
   digitação.
3. **Dado** uma avaliação fora do mapa, **então** o carimbo é "veja a checagem" e o log registra
   a avaliação nova.
4. **Dado** dois checadores sobre a mesma alegação, **então** a página mostra os dois vereditos
   lado a lado, sem escolher um.
5. **Dado** um link de checagem colado no WhatsApp, **então** a prévia mostra o carimbo e a frase.
6. **Dado** um celular de 360 px, **então** não há rolagem horizontal e a busca está a um toque.
7. Lighthouse mobile da home: Performance ≥ 90, Accessibility ≥ 95. JS inicial < 150 KB gzip.
8. **Dado** qualquer registro no banco, **então** ele tem `sourceUrl`, `fetchedAt`, `method`,
   `parserVersion` e hash do bruto; inserir sem um deles falha (teste de integração).
9. **Dado** o recorte "eleição 2014", **então** só aparecem checagens publicadas no período de
   campanha de 2014, e checador sem dado naquele ano aparece como "sem cobertura", não zero.
10. **Dado** uma página antiga cujo selo o parser não reconhece, **então** o registro entra como
    `unknown` com a avaliação bruta guardada, e nunca com um carimbo deduzido.
11. **Dado** o lote de backfill de uma eleição, **então** existe um relatório de auditoria por
    amostra com 0 erro de veredito antes de o lote aparecer no site.

## 10. Riscos

| Risco | Mitigação |
|---|---|
| API do Google em alpha muda ou some | RSS + JSON-LD como segunda fonte desde a F1; fixtures no repo deixam os testes sem rede |
| Checador não publica ClaimReview | entra só com RSS + link, sem carimbo normalizado ("veja a checagem") |
| Tema político gera ataque | regras da §4.4: sem veredito próprio, sem ranking de pessoas, fonte em todo card, metodologia pública |
| Agrupamento junta alegações diferentes | limiar conservador (S4) e botão "não é a mesma alegação" registrado para revisão |
| Escopo cresce (extensão de navegador, bot de WhatsApp, chat) | lista "depois" fechada; nada entra antes da F5 |
| Site antigo mudou de layout várias vezes, e um parser só não serve | um parser por checador × época, cada um com fixture real daquela época; o que nenhum parser reconhece vira `unknown` |
| Checagens antigas sumiram (site fechado, URL mudada) | Wayback (S7); o que não se recupera fica listado como lacuna na `/cobertura` |
| Backfill pesado demais para os sites | 1 req/s por domínio, sitemap, cache, uma vez só; nunca em laço |
| Pressa de mostrar volume leva a dado errado | auditoria por amostra bloqueia o lote (§4.5, regra 9) |
| RAM instável do notebook | só modo dev local; builds de produção na CI |

## 11. Como entra no currículo (só depois do marco, com números reais)

> **Carimbo** (Node.js, Fastify, TypeScript, Vue 3/Nuxt, PostgreSQL, Redis/BullMQ): agregador
> de checagens de fatos que reúne N mil checagens de X agências, de AAAA a 2026, com
> proveniência por registro e dados abertos; normaliza os vereditos em
> verdadeiro/falso/fora de contexto e oferece busca em português por similaridade em < 300 ms;
> filas com retry, arquitetura com domínio sem framework, Y testes, CI e deploy.
> github.com/… · carimbo.…

Depois de publicado, atualizar a linha "Node.js + NestJS" e a de "Vue.js" em
`v2/lacunas.md` → "Andamento".

## 12. Depois (não prometer)

Bot de WhatsApp que responde com o carimbo, extensão de navegador, busca por imagem (a Fact Check
API tem `claims:imageSearch`), alerta por tema, versão em inglês.
