# Plano: completar a ingestão histórica do Carimbo

Referência: 04/11/2026, arquivo `data/reviews.json` no commit `ad53094`.
O objetivo é descobrir e ingerir as checagens publicadas pelos checadores cobertos, de 2014 em diante, sem inferir veredito nem chamar de completa uma fonte que não foi verificada. A coleta cotidiana continua independente da carga histórica.

## Diagnóstico verificável

A base tem 4.860 registros. A tabela usa `reviewDate`, por ano civil, e conta registros, não URLs, alegações distintas, total publicado nem apenas períodos de campanha. Um traço significa **nenhum registro nesta base**, não ausência de publicações.

| Ano | Aos Fatos | Comprova | Estadão Verifica |
|---|---:|---:|---:|
| 2014–2017 | — | — | — |
| 2018 | 4 | — | — |
| 2019 | 8 | — | — |
| 2020 | — | 9 | — |
| 2021 | 115 | 185 | — |
| 2022 | 790 | 356 | — |
| 2023 | 472 | 201 | — |
| 2024 | 891 | 244 | — |
| 2025 | 677 | 157 | — |
| 2026 | 550 | 45 | 156 |
| Total | 3.507 | 1.197 | 156 |

A data da revisão mais antiga registrada é 17/03/2018. Não se sabe se cada checador existia ou publicava checagens em cada ano. A existência de registros num ano não prova cobertura integral. O objetivo anterior registra indícios de checagem eleitoral em 2014, mas não prova que toda a produção dessa eleição esteja acessível.

## Limites reais da implementação

- `--since` percorre sitemaps a partir de uma data, mas o filtro de páginas usa `lastmod`, não `reviewDate`. Uma página velha atualizada recentemente pode entrar; páginas omitidas do sitemap ficam de fora. Não existe `--until` para isolar um ano.
- O worker ordena candidatos do sitemap por modificação decrescente e limita as páginas ainda não vistas com `--max-pages`. Ele mantém um índice de páginas coletadas em `data/raw/`, ignorado pelo Git. Em um runner novo esse índice não existe; páginas que não geraram registro podem ser consultadas novamente.
- Resultados e índice são gravados ao fim do processamento de cada checador, não a cada página. Interrupção antes dessa etapa pode perder o progresso do lote. O fluxo agendado usa apenas fontes recentes, tem limite de 30 minutos e não é um backfill histórico.
- A consulta Google existe, mas depende de `FACTCHECK_API_KEY`; limita cada fonte a 10 páginas de até 100 resultados e usa uma janela de idade máxima, sem evidência de que esgote todos os anos. O limite ou falha da API não pode contar como cobertura completa.
- Lupa e g1 estão marcados como sem ClaimReview; UOL e AFP, como bloqueados. Isso reflete o diagnóstico de 26/10/2026 em `docs/spikes/S2-fontes.md`, não uma nova conferência dos sites. O arquivo bruto é local e ignorado pelo Git; o fluxo do GitHub não o preserva entre execuções.
- O identificador de múltiplas alegações na mesma URL depende de qual aparece primeiro e de texto nas seguintes. Reordenação ou alteração textual pode criar duplicatas ou mudar a associação; resolver antes de reprocessar em massa. Revisões anteriores de um registro não têm histórico persistente garantido.

## Sequência de implementação

### 1. Inventário por fonte, época e acesso

Executar os spikes S6/S7 de `docs/PLANO.md`: levantar fontes, nomes e URLs históricos, datas comprovadas, sitemaps/listagens e layouts por época. Incluir Truco/Agência Pública e Preto no Branco/O Globo como candidatas a catalogação, sem atribuir a elas automaticamente os IDs atuais. Confirmar acesso, robots e permissões em cada domínio; registrar métodos, datas, amostras, falhas e o que não foi encontrado.

**Aceite:** matriz fonte × ano 2014–2026 com evidência, método viável, estado `não investigado`, `parcial`, `concluído para o universo identificado` ou `bloqueado`; o universo descoberto e suas limitações ficam explícitos. Verificar os pontos de corte dos sitemaps atuais e se há artigos anteriores fora deles.

### 2. Infraestrutura de lotes retomáveis

Criar manifesto persistente por fonte, URL e intervalo com status de descoberta, extração, ausência de marcação, falha e tentativa; salvar checkpoints em lotes pequenos e de forma atômica. Definir intervalo de publicação em vez de confundir `lastmod` com data de publicação; não descartar antes de extrair se a data não for confiável. Guardar diagnóstico e contagens de páginas descobertas, tentadas, sem dados e falhadas. Rever identidade para várias alegações por página, com migração idempotente e teste de reordenação, e preservar histórico de alterações de avaliação.

**Aceite:** interrupção e retomada reproduzidas em teste sem perda ou duplicação; falha de sitemap, limite de paginação e data desconhecida ficam visíveis; uma segunda execução não altera dados sem mudança na fonte. Estabelecer armazenamento privado durável para brutos e manifesto, com política de acesso e retenção, antes de usar runners efêmeros. Não enviar HTML bruto ao Git.

### 3. Completar fontes já ativas

Para Aos Fatos, Comprova e Estadão, inventariar sitemaps e listagens históricas por ano, inclusive URLs fora dos padrões atuais; começar com uma amostra pequena de cada layout e então executar lotes por domínio/intervalo com checkpoints. Preservar 1 requisição por segundo por domínio, robots, limites e retentativas graduais. Tratar matérias sem ClaimReview separadamente de falhas; decidir extração alternativa apenas com evidência de selo e alegação.

**Aceite:** para cada lote, comparar URLs descobertas, processadas, bloqueadas, sem marcação e com checagem; produzir relatório reproduzível, incluindo anos e páginas não descobertos. Sorteio de até 20 registros por checador × eleição, ou todos quando houver menos, conferindo alegação, avaliação, data, link e proveniência contra a fonte.

### 4. Adicionar fontes e layouts faltantes

Fazer adaptadores HTML versionados para Lupa e g1 somente depois de verificar o selo, a alegação e a data em fixtures reais de cada época. Investigar fontes primárias e arquivo do Truco e Preto no Branco; adicionar catálogo e IDs se identificados com evidência. Para UOL/AFP, verificar novamente acesso e buscar canal autorizado ou fonte alternativa; não contornar bloqueios nem se passar por navegador. Não transformar matéria comum em checagem por heurística de manchete.

**Aceite:** testes com exemplos reais reduzidos e negativos por layout, texto e avaliação originais preservados, vereditos não reconhecidos como `unknown`, e auditoria por amostra antes de cada lote.

### 5. Google Fact Check e arquivos históricos

Com chave própria, executar o spike S1: cobertura por domínio e época, paginação, limites, erros e correspondência com a fonte. Detectar explicitamente resultados truncados ao atingir o teto; não presumir que `maxAgeDays` segmenta um ano. Em paralelo, investigar Wayback/CDX e eventuais fontes autorizadas para URLs originais indisponíveis, limites e termos; verificar snapshots reais antes de planejar qualquer ingestão automática.

**Aceite:** API secundária não substitui revisão mais confiável; origem, data de coleta, hash e link de snapshot são preservados. Arquivo indisponível ou sem prova de alegação/veredito fica como lacuna, sem preencher dados por inferência.

### 6. Publicar cobertura e operar continuamente

Implementar relatório por checador × ano e por eleição: estado da investigação, universo descoberto, tentativas, sucessos, lacunas, data de atualização e método. Separar zero observado de ausência de investigação. Acrescentar alertas para falhas parciais, páginas sem ClaimReview e paginação truncada; um workflow verde isoladamente não comprova cobertura.

**Aceite:** `/cobertura` e dados abertos exibem estados auditáveis, sem transformar contagem em percentual de completude sem denominador confiável. Rodar testes, build e revisão manual; publicar lotes apenas após validação. Registrar contagens e mudanças por lote em commits pequenos, com push regular e sem sobrescrever coletas agendadas.

## Dependências e paralelismo

1 → 2; 3 depende de 2; 4 e 5 podem investigar em paralelo com 2–3, mas cargas completas dependem de 2; 6 integra os relatórios de todas as frentes. Três agentes podem cuidar de (A) inventário e fontes antigas, (B) retomada/identidade, (C) parsers e Google/Wayback, com arquivos e contratos combinados antes da integração.

## Primeira execução segura

Antes de executar rede em grande escala, confirmar o estado atualizado do remoto e guardar uma cópia recuperável da base. Implementar os checkpoints e testar um lote pequeno em diretório separado (`--data-dir`) para evitar concorrência com o arquivo de produção. Depois reconciliar e auditar antes de incorporar. Comando atual útil para explorar apenas um pequeno lote, **não para garantir um ano completo**:

```bash
npm run ingest:once -w @carimbo/worker -- --checker aos-fatos --since 2018-01-01 --max-pages 10 --data-dir /tmp/carimbo-piloto
```

O piloto isolado não recebe automaticamente os registros nem o índice existentes; portanto pode baixar páginas já conhecidas. Não usar `--refresh` em massa. O progresso histórico depende da disponibilidade das fontes, da chave Google quando aplicável e da persistência escolhida para dados brutos; duração e completude não são estimáveis antes do inventário.
