# S11 — Sitemaps históricos das fontes ativas

Pesquisa em 04/11/2026. Escopo: Aos Fatos, Comprova e Estadão Verifica, configuradas como `active` em `apps/worker/src/checkers.ts`. Consultas pontuais, sem executar o worker, backfill ou alterar a base. As respostas diretas abaixo usaram `CarimboBot/0.1 (+https://github.com/Gaalbu/carimbo)`, sem redirecionamentos automáticos, com intervalo superior a um segundo entre requisições ao mesmo domínio; a consulta ao Aos Fatos foi feita após a espera pelo piloto informado pelo usuário. As contagens são instantâneos dos XMLs recebidos, não totais de checagens nem prova de cobertura eleitoral.

**Limite da investigação:** os robots de Aos Fatos e Estadão bloqueiam explicitamente `ChatGPT-User`; o Estadão também bloqueia `OAI-SearchBot`. Depois de observar essas regras, não foram feitas outras consultas diretas a esses domínios. As respostas iniciais obtidas com a identificação do worker são registradas para transparência, mas não constituem autorização para uma coleta posterior. O piloto é independente e seus resultados não foram usados.

## Rotas e janelas observadas

| Fonte | Índice e recorte | Observação direta | Limitação |
|---|---|---|---|
| Estadão | [Índice diário](https://www.estadao.com.br/arc/outboundfeeds/sitemap-index-by-day/?outputType=xml) | HTTP 200; **9.970 entradas**: 9.969 arquivos diários de 20/07/1999 a 03/11/2026 e um `latest`. O índice é geral do jornal. | A extensão da janela de arquivos não prova a existência do Verifica desde 1999, nem que os artigos de cada dia tenham sido todos incluídos. |
| Comprova | [Índice](https://projetocomprova.com.br/sitemap.xml) | HTTP 200; **80 entradas**: 78 arquivos mensais `sitemap-posttype-answer-french.AAAAMM.xml`, de 2019-07 a 2026-10, um arquivo anual `sitemap-posttype-archived-answer.2018.xml` e `sitemap-news.xml`. | Há meses sem arquivo no índice; os nomes não provam data de publicação ou inexistência de textos fora dele. |
| Aos Fatos | [robots](https://www.aosfatos.org/robots.txt) | HTTP 200; anuncia [sitemap.xml](https://www.aosfatos.org/sitemap.xml), mas bloqueia `ChatGPT-User` em `/`. | Índice e filho não foram consultados neste spike; anos, corte e contagens atuais desconhecidos. [S2](S2-fontes.md), de 26/10/2026, relata cerca de 7 mil URLs em `sitemap-noticias.xml` e `lastmod` desde 2020: é uma observação anterior, não uma janela de publicação nem resultado confirmado agora. |

No índice do Estadão, as entradas diárias são 165 em 1999, 365 ou 366 por ano de 2000 a 2025 e 307 em 2026, além de `latest`. Essa contagem corresponde a arquivos anunciados, não a URLs de matérias. No índice do Comprova, as entradas mensais são 6 em 2019, 10 em 2020, 12 em 2021, 12 em 2022, 10 em 2023, 12 em 2024, 12 em 2025 e 4 em 2026; 2018 é um arquivo anual separado. Não se inspecionou cada mês nem se deduziu que os meses ausentes estavam vazios.

### Filhos amostrados

| Arquivo consultado | HTTP | URLs no XML | Resultado do recorte |
|---|---:|---:|---|
| [Estadão, 07/10/2018](https://www.estadao.com.br/arc/outboundfeeds/sitemap/2018-10-07/?outputType=xml) | 200 | Não apurado | O processamento da resposta falhou ao sumarizar um caminho; não se infere zero nem total. |
| [Estadão, 02/10/2022](https://www.estadao.com.br/arc/outboundfeeds/sitemap/2022-10-02/?outputType=xml) | 200 | 218 | 12 URLs com caminho `/estadao-verifica/`. Uma delas tem `lastmod` em 28/08/2023, apesar do dia no nome do arquivo. |
| [Estadão, 04/10/2026](https://www.estadao.com.br/arc/outboundfeeds/sitemap/2026-10-04/?outputType=xml) | 200 | 197 | 3 URLs com caminho `/estadao-verifica/`. |
| [Comprova, arquivo 2018](https://projetocomprova.com.br/sitemap-posttype-archived-answer.2018.xml) | 200 | 153 | 153 URLs sob `/post/`; algumas possuem `lastmod` inválido começando por `-0001`. |
| [Comprova, julho de 2019](https://projetocomprova.com.br/sitemap-posttype-answer-french.201907.xml) | 200 | 9 | 9 URLs sob `/publicações/`; algumas têm `lastmod` em 2024. |
| [Comprova, outubro de 2026](https://projetocomprova.com.br/sitemap-posttype-answer-french.202610.xml) | 200 | 39 | 39 URLs sob `/publicações/`. |

Os totais dessa tabela são de entradas XML, não de alegações, páginas únicas após normalização, checagens eleitorais ou matérias com `ClaimReview`. A amostra de três dias do Estadão não estabelece o corte histórico da seção nem sua contagem anual. No Comprova, [uma das URLs de `/post/`](https://projetocomprova.com.br/post/re_2b5w8xz5jmvb/) respondeu HTTP 200 com título “Até logo!”, `datePublished` em 30/10/2018 e `dateModified` em 03/05/2024 no JSON-LD; seu `lastmod` no sitemap também é de 2024. É uma página de arquivo, não foi classificada aqui como checagem. Trata-se de uma verificação pontual de publicação anterior à modificação, não prova da data das outras 152 entradas.

## O que o código alcança

- O catálogo usa feed de notícias para Aos Fatos, feed da seção para Estadão e `sitemap-news.xml` para Comprova. Para descoberta histórica usa os índices acima; essas configurações são estado do código, não garantia atual de permissão ou disponibilidade.
- O Aos Fatos seleciona apenas o filho `sitemap-noticias.xml` e caminhos `/noticias/`. Qualquer outro filho ou rota fica fora; não houve verificação atual do conteúdo.
- O Estadão seleciona filhos com data `AAAA-MM-DD` na URL a partir de `--since` e páginas sob `/estadao-verifica/`. O filho `latest` não corresponde ao padrão diário. A seleção pela data do arquivo pode deixar de fora uma página antiga atualizada depois de `--since` que permaneça em um filho anterior; também não captura seções históricas com outro caminho.
- Na versão examinada antes da correção desta investigação, o Comprova selecionava filhos cujo nome termina em `.AAAAMM.xml`, por mês a partir de `--since`, e páginas sob `/publica%C3%A7%C3%B5es/`. O arquivo anual de 2018 não passa no filtro de filhos e suas URLs `/post/` tampouco passam no filtro de página. Logo, essas 153 entradas observadas não eram descobertas por essa rota. O filtro agora também aceita o arquivo anual e a rota `/post/`; a extração continua exigindo dados estruturados verificáveis. O índice mensal não prova ausência de outros arquivos históricos.
- `sitemapPages` percorre os filhos aceitos e coleta suas entradas; a fila ordena por `lastmod` decrescente. O código examinado não filtra as páginas por `lastmod` após baixar o filho: seleciona os filhos por data em seu nome. A execução posterior tem limite de páginas e deduplicação; ver `apps/worker/src/queues.ts` e `apps/worker/src/ingest.ts`. Há falhas de filhos que são registradas, portanto uma execução parcial não deve ser interpretada como inventário completo.

`lastmod` informa última modificação declarada, quando válida; não é data de publicação nem de checagem. A data no nome de um filho diário ou mensal tampouco substitui a data individual publicada no conteúdo. Para contagem por ano de publicação seria necessário verificar a data de cada página elegível, preservar datas desconhecidas e delimitar o universo; isso não foi feito aqui.

## Limites de acesso e uso

- [Robots do Estadão](https://www.estadao.com.br/robots.txt): HTTP 200; o grupo `*` anuncia os índices, restringe `/estadao` e inclui `Allow: /estadao-verifica`, enquanto grupos específicos bloqueiam `GPTBot`, `ChatGPT-User` e `OAI-SearchBot` em `/`. Respeitar a regra aplicável ao agente e à finalidade reais. A ferramenta de pesquisa também indicou bloqueio por robots no domínio. Termos gerais de reprodução e autorização para ingestão não foram confirmados; consultar o titular antes de uso sistemático.
- [Robots do Aos Fatos](https://www.aosfatos.org/robots.txt): HTTP 200; bloqueia, entre outros, `GPTBot` e `ChatGPT-User` em `/`. Os [termos de uso](https://www.aosfatos.org/termos-de-uso/) restringem cópia, transformação e distribuição de conteúdo, ressalvadas as funcionalidades de compartilhamento oferecidas. Esclarecer autorização específica para ingestão e reutilização; a existência de sitemap não a concede.
- [Robots do Comprova](https://projetocomprova.com.br/robots.txt): HTTP 200; `ChatGPT-User` está em grupo com `Allow: /`, enquanto `GPTBot` está em grupo com `Disallow: /`. O início do arquivo contém um hífen de formatação anômalo em `User-agent`; como leitura conservadora, respeitar também as restrições ali listadas, inclusive `/feed/`. A [metodologia e política de reprodução](https://projetocomprova.com.br/about/metodologia/) declara CC BY-ND 4.0 para material produzido pelo projeto, exigindo atribuição e vedando distribuição de material derivado; avaliar o uso pretendido e eventuais direitos de terceiros antes de publicar campos transformados.
- Robots não substitui licença, contrato, direito autoral ou permissão para armazenar e redistribuir. O limite operacional solicitado é **no máximo 1 requisição por segundo por domínio**, compartilhado entre processos, além de respeitar regras mais restritivas, respostas 429/403 e interrupções. Esta pesquisa não mediu quota contratual nem garante que essa cadência seja autorizada.

## Pendências

Obter acesso autorizado onde necessário; verificar o sitemap do Aos Fatos e sua eventual janela de publicação com amostras identificadas. Para o Estadão, verificar dias históricos e rotas anteriores em canal permitido. Para o Comprova, avaliar o arquivo de 2018 e meses não anunciados, a semântica e qualidade das datas, tipos de página e licença aplicável ao produto. Antes de qualquer lote, implementar ou validar retomada, registro de falhas e coordenação da cadência entre processos; não tratar esta amostra como autorização ou conclusão do inventário.
