# S3: vocabulário de avaliações

Levantado em 26/10/2026 a partir das 341 checagens coletadas na primeira ingestão
(`data/reviews.json`: Aos Fatos, Estadão Verifica, Comprova).

## Versão 2 do mapa (`RATING_MAP_VERSION = 2`)

| Avaliação original | Checador | Ocorrências | Carimbo | Por quê |
|---|---|---:|---|---|
| Falta contexto | Comprova | 10 | fora de contexto | sinônimo direto de "sem contexto", já no mapa |
| Comprovado | Comprova | 1 | verdadeiro | o selo do Comprova para conteúdo confirmado |

## Continuam como "veja a checagem" (decisão pendente)

| Avaliação original | Checador | Ocorrências | Motivo |
|---|---|---:|---|
| não é bem assim | Aos Fatos | 13 | pode significar impreciso ou exagerado; mapear exige ler a definição publicada pelo Aos Fatos |
| Sátira | Comprova | 2 | não é falso nem fora de contexto; merece carimbo próprio ou fica como está |

Regra: só entra no mapa avaliação cujo sentido não depende de interpretação. O resto fica em
"veja a checagem", com a avaliação original visível.
