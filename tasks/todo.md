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
