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

O relatório ainda não existe: os totais exibidos pelo worker são de execução e não fornecem uma
relação persistida por ano. Sua criação, validação, publicação e integração nas versões API e
estática dependem dos lotes retomáveis e das investigações das tarefas 1–7. Até então, não há
contagem pública de falhas nem situação atribuível a cada célula.
