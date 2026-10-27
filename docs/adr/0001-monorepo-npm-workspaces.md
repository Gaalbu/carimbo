# ADR 0001: monorepo com npm workspaces

Data: 26/10/2026 · Status: aceita

## Contexto

O Carimbo tem domínio (`packages/core`), adapters de fonte (`packages/sources`), worker de
ingestão, API e web. Os cinco compartilham os tipos do domínio e o contrato da API.

## Decisão

Um repositório com npm workspaces, sem Turborepo nem Nx. `packages/*` compilam para `dist/` e são
consumidos pelos `apps/*`; os scripts da raiz compilam os pacotes antes de typecheck e testes.

## Consequências

- Um `package-lock.json` só, uma CI só, mudança de contrato num commit só.
- Sem cache de build entre pacotes; aceitável no tamanho atual.
