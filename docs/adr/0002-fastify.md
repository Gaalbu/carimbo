# ADR 0002: NestJS com adaptador Fastify

Data: 26/10/2026 · Status: aceita

## Contexto

A API serve feed, busca, estatísticas e exportação. As vagas pedem "Node.js" bem mais que NestJS,
e NestJS já está provado em outros projetos do autor.

## Decisão anterior (substituída)

Fastify 5 direto, validação por schema e OpenAPI pelo plugin do Fastify.

## Decisão atual

NestJS 12 com o adaptador oficial para Fastify. Os controllers usam `StoreSource` e as funções
de domínio de `packages/core`; a ingestão continua como processo separado. OpenAPI e CORS são
configurados no bootstrap Nest. O armazenamento segue em JSON conforme ADR 0003.

## Consequências

- A estrutura dos controllers e providers passa a ser explícita e alinhada à experiência NestJS.
- O adaptador Fastify mantém o servidor HTTP leve e compatível com a infraestrutura existente.
