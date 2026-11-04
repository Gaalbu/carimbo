# S1 — Google Fact Check Tools API

Pesquisa documental em 04/11/2026. A [referência oficial de `claims.search`](https://developers.google.com/fact-check/tools/api/reference/rest/v1alpha1/claims/search) descreve busca por domínio do publicador, idioma, `maxAgeDays`, `pageSize` e `pageToken`. A idade é a mais recente entre data da alegação e da revisão: não é um filtro de ano de publicação. O `nextPageToken` vazio ou ausente indica fim; a página seguinte deve manter os demais parâmetros da consulta.

No Carimbo, o worker pesquisa por domínio e limita cada checador a 10 páginas por execução. Ao atingir esse limite com token remanescente ou ocorrer falha, registra resultado parcial. Esse limite é local, não uma cota atribuída ao Google. A API é fonte secundária e não sobrescreve registro existente da fonte primária.

**Pendente:** não foi possível testar cobertura real, distribuição por ano, quotas, respostas e persistência de token com uma chave válida. A existência da API não comprova cobertura dos checadores nem de todos os anos. Antes de uma carga completa, adicionar retomada de paginação e relatório persistente de limites/erros; validar amostras e domínios de cada publicador. Não registrar a chave em URL, logs ou repositório.
