# ADR 0003: armazenamento em arquivo JSON no MVP, PostgreSQL depois

Data: 26/10/2026 · Status: aceita (substitui temporariamente a decisão 3 do PLANO §6)

## Contexto

O plano prevê Prisma + PostgreSQL com `tsvector`, `unaccent` e `pg_trgm`. Para pôr o site no ar,
o volume inicial (centenas a poucos milhares de checagens) cabe em memória com folga.

## Decisão

O worker grava um `ReviewStore` (`data/reviews.json`, tipo em `packages/core/src/review.ts`) só
com campos estruturados e proveniência; o bruto fica em `data/raw/`, fora do Git. A API carrega o
arquivo, recarrega quando ele muda, e faz agrupamento e busca por trigramas em memória
(`packages/core`).

## Consequências

- Deploy sem banco; o arquivo versionado é também o dado aberto auditável.
- A restrição "registro sem proveniência não entra" vira validação no worker e teste, não
  `NOT NULL`. Ao migrar para PostgreSQL, o mesmo contrato `Review` vira a tabela.
- Gatilho para migrar: busca p95 acima de 300 ms ou store acima de ~50 mil registros.
