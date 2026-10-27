# @carimbo/sources

Adapters que trazem checagens publicadas para dentro do Carimbo. Vazio até a F1.

Planejado (`docs/PLANO.md` §6, `tasks/tasks.md`):

- cliente da Google Fact Check Tools API (`claims:search`), depois do spike S1;
- leitor de RSS/Atom por checador;
- extrator de `ClaimReview` JSON-LD da página da checagem.

Toda entrada externa é validada com zod aqui na borda e sai como tipo do `@carimbo/core`.

## Fixtures

`test/fixtures/` guarda `ClaimReview` reais coletados no spike S2 (26/10/2026), reduzidos aos
campos estruturados: alegação, avaliação, datas, URL, editor e autor. Nenhum texto de checagem é
copiado (constituição, regra III). Cada arquivo cobre um caso que o extrator precisa tratar:

| Arquivo | Caso |
|---|---|
| `aosfatos-claimreview-falso.json` | `@type` em lista (`["Review", "ClaimReview"]`), avaliação em minúsculas, números como número |
| `comprova-claimreview-rating-with-explanation.json` | explicação colada na avaliação (`"Falso: …"`), sem `ratingValue`; checagem de 2024 que a home destacava em 2026 |
| `estadao-claimreview-enganoso.json` | sem `datePublished` no `ClaimReview` (só no `NewsArticle` da mesma página), `url` relativa, `ratingValue` como texto |

Detalhes em `docs/spikes/S2-fontes.md`.
