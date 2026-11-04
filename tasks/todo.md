# Ingestão histórica — tarefas

Plano e critérios completos: [plan.md](plan.md). Registrar evidências e falhas em cada entrega.

- [ ] **1. Inventário:** matriz fonte × ano 2014–2026, acessos, formatos históricos e amostras; verificar o universo identificável. Sem dependências.
- [ ] **2. Lotes retomáveis:** manifesto durável, checkpoints atômicos, janela explícita, falhas visíveis e testes de interrupção. Depende de 1 para definir fontes piloto.
- [ ] **3. Identidade e revisão:** resolver múltiplas alegações por URL com migração idempotente e guardar histórico de mudanças. Em paralelo com 2; necessário antes do backfill em massa.
- [ ] **4. Aos Fatos, Comprova e Estadão:** piloto por fonte, depois lotes históricos auditados; relatório de descobertas e falhas. Depende de 1–3.
- [ ] **5. Lupa, g1 e arquivos antigos:** investigar e testar extratores por época; catalogar Truco/Preto no Branco somente com evidência. Investigação paralela; carga depende de 1–3.
- [ ] **6. UOL e AFP:** confirmar acesso atual e alternativas autorizadas; registrar bloqueio quando persistir. Investigação paralela.
- [ ] **7. Google e Wayback:** investigar paginação, limites e snapshots reais; chave Google é pré-requisito do teste da API. Carga depende de 2–3.
- [ ] **8. Cobertura:** expor estado, universo conhecido, falhas e origem por fonte × ano, sem tratar lacuna como zero. Depende de 1–7 conforme cada fonte for concluída.
- [ ] **9. Fechamento:** auditoria de até 20 registros por fonte × eleição, testes/build, commits pequenos e push; documentar o que ainda não pôde ser coberto.

## Progresso — 04/11/2026

- Inventário inicial e ensaios de arquivo: [S6](../docs/spikes/S6-inventario-historico.md) e [S7](../docs/spikes/S7-arquivos.md); permanecem anos, layouts e universos não investigados.
- Páginas não são descartadas só pelo `lastmod`; falhas de listagem têm contagem; o worker salva avaliações após cada página e não trata índice bruto corrompido como vazio. Falta manifesto completo e exclusão mútua entre processos.
- A reconciliação preserva IDs já existentes ao reordenar alegações de uma página, sem presumir equivalência quando o texto muda; mudanças na avaliação passam a ser mantidas no arquivo de dados. Ainda falta avaliar migração ou resolução de divergências históricas e persistência dos brutos em runners efêmeros.
- [S8](../docs/spikes/S8-g1.md) registra os obstáculos da investigação do g1; nenhum parser foi atribuído sem amostra verificável.
- [S9](../docs/spikes/S9-auditoria-amostral.md) registra conferência automatizada de 61 amostras e 87 com brutos locais indisponíveis. Não substitui a revisão humana por amostra.
