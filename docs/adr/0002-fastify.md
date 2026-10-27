# ADR 0002: Fastify em vez de Express ou NestJS

Data: 26/10/2026 · Status: aceita

## Contexto

A API serve feed, busca, estatísticas e exportação. As vagas pedem "Node.js" bem mais que NestJS,
e NestJS já está provado em outros projetos do autor.

## Decisão

Fastify 5 com validação por schema (zod via `fastify-type-provider-zod`) e OpenAPI gerado pelo
`@fastify/swagger`.

## Consequências

- Menos mágica que Nest; rotas testáveis com `fastify.inject`, sem subir porta.
- Organização de módulos fica por conta do projeto (rotas finas, domínio em `packages/core`).
