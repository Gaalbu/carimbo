# S9 — Auditoria automatizada inicial do arquivo

Executada em 04/11/2026 sobre `data/reviews.json` do commit `ad53094` e os brutos locais disponíveis em `data/raw/`. O script `apps/worker/scripts/historical-audit.ts` ordena deterministicamente pelo SHA-256 de checador, eleição e identificador, selecionando até 20 por checador × campanha eleitoral cadastrada. Compara hash do bruto, URL, alegação, avaliação textual e data extraídos do ClaimReview. Não verifica a interpretação do parser de modo independente; não substitui conferência humana da página.

| Checador / eleição | Elegíveis | Amostra | Conferem | Divergentes | Bruto ausente |
|---|---:|---:|---:|---:|---:|
| Aos Fatos / 2018 | 1 | 1 | 1 | 0 | 0 |
| Aos Fatos / 2022 | 247 | 20 | 0 | 0 | 20 |
| Aos Fatos / 2024 | 370 | 20 | 0 | 0 | 20 |
| Aos Fatos / 2026 | 169 | 20 | 20 | 0 | 0 |
| Comprova / 2020 | 7 | 7 | 0 | 0 | 7 |
| Comprova / 2022 | 126 | 20 | 0 | 0 | 20 |
| Comprova / 2024 | 66 | 20 | 0 | 0 | 20 |
| Comprova / 2026 | 42 | 20 | 20 | 0 | 0 |
| Estadão Verifica / 2026 | 132 | 20 | 20 | 0 | 0 |
| **Total** | **1.160** | **148** | **61** | **0** | **87** |

Os registros ausentes não foram conferidos e não contam como erro nem como acerto. As contagens dizem respeito aos recortes oficiais de campanha e ao estado do arquivo e brutos neste computador naquela data; não medem completude histórica nem refletem alterações posteriores. Falta conferência humana de até 20 por grupo, incluindo as fontes e anos sem brutos locais.

Reprodução: `npx tsx apps/worker/scripts/historical-audit.ts > /tmp/carimbo-auditoria-historica.json`. O resultado detalhado contém URLs e identificadores, mas não HTML nem texto das alegações. Em outra máquina, os resultados dependerão da presença dos brutos privados correspondentes.
