# Cobertura histórica: relatório futuro

O endpoint `/v1/coverage` conta checagens datadas presentes no arquivo, por checador e ano civil.
`updatedAt` é a geração desse arquivo; não é a data de uma avaliação de cobertura. Registros sem
data não entram na tabela. A ausência de linha não prova que não houve investigação. Os campos
`investigation` e `failures` são nulos enquanto não houver relatório persistido por fonte e ano.

Para ampliar o contrato, o manifesto durável dos lotes deve registrar fonte, intervalo, data,
origem e tentativas, incluindo falhas de descoberta e extração. Um relatório versionado deve
identificar sua evidência, critérios e data de atualização por fonte e ano, distinguindo universo
descoberto, tentativas, resultados e falhas. Cada contagem desconhecida deve continuar nula.
Status como não investigado, parcial, concluído ou bloqueado exigem evidência específica e
critérios explícitos; uma lista vazia, uma falha isolada ou registros indexados não os comprovam.
Um estado concluído deve descrever o escopo investigado, sem prometer completude histórica geral.

Ainda não há relatório gerado e publicado: os totais exibidos pelo worker são de execução e não
fornecem uma relação persistida por ano. Sua geração, validação, publicação e integração nas
versões API e estática dependem de evidências por ano e das investigações das tarefas 1–7. Até então, não há
contagem pública de falhas nem situação atribuível a cada célula.

## Agregador do manifesto

`buildCoverageReport(manifest, evidence)`, em `apps/worker/src/coverage-report.ts`, produz um
objeto JSON serializável de versão 1. A evidência deve conter `checkerId`, `url` exatamente igual
à URL da entrada de página do manifesto e `year`, o ano civil de publicação confirmado por fonte
confiável. O responsável pela integração deve obter e validar essa evidência; o agregador não a
verifica nem consulta páginas. Evidências iguais repetidas são aceitas; anos conflitantes ou
inválidos deixam a página sem atribuição. `since`, `lastmod`, data da execução e data de atualização
não são evidência de ano de publicação.

Cada linha contém o número de **entradas do manifesto**, distribuídas pelos seus estados atuais.
Uma mesma página pode aparecer em mais de um escopo `since`, portanto esses números não são páginas
únicas, tentativas, checagens publicadas ou universo completo. Entradas de página sem ano,
entradas de descoberta e execuções são contadas separadamente em `unattributed`, sem associá-las a
um ano. A saída não inclui URLs, diagnósticos ou identificadores de execução; `investigation` é
sempre `null`. A ausência de linha ou de falha atribuída não comprova que nada ocorreu. O chamador
deve garantir que os identificadores dos checadores sejam próprios para divulgação.

Exemplo de uso interno:

```ts
const report = buildCoverageReport(rawStore.getManifest(), verifiedYears)
const json = JSON.stringify(report, null, 2)
```

Para publicação efetiva ainda é necessário reunir evidências verificáveis com proveniência por
página, conectá-las ao manifesto e persistir o relatório gerado, definir atualização e validação,
e integrar seu consumo à API e à versão estática. Esse módulo não altera a ingestão nem publica
arquivos; o contrato atual de `/v1/coverage` continua inalterado.
