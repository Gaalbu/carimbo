import type { FactChecker } from './review.js'

/**
 * Fact-checking agencies covered by the Carimbo. Homepages and submission channels checked on
 * 26/10/2026:
 *
 * - Comprova: its homepage lists the WhatsApp tip line +55 11 97045-4984 for "sugestões de
 *   verificação" (https://projetocomprova.com.br/).
 * - Aos Fatos: the homepage points readers to Fátima, its checker bot ("Fale com a nossa robô
 *   checadora", https://www.aosfatos.org/fatima/).
 * - Lupa, Estadão Verifica, g1 Fato ou Fake and AFP Checamos run WhatsApp tip lines according to
 *   press coverage from 2019-2022, but their own sites could not be read to confirm the current
 *   numbers, so `submitUrl` stays null rather than risk sending people to a stale number.
 * - UOL Confere: no submission channel found.
 */
export const FACT_CHECKERS: readonly FactChecker[] = [
  {
    id: 'lupa',
    name: 'Agência Lupa',
    homepage: 'https://lupa.uol.com.br/',
    submitUrl: null,
  },
  {
    id: 'aos-fatos',
    name: 'Aos Fatos',
    homepage: 'https://www.aosfatos.org/',
    submitUrl: 'https://www.aosfatos.org/fatima/',
  },
  {
    id: 'estadao-verifica',
    name: 'Estadão Verifica',
    homepage: 'https://www.estadao.com.br/estadao-verifica/',
    submitUrl: null,
  },
  {
    id: 'uol-confere',
    name: 'UOL Confere',
    homepage: 'https://noticias.uol.com.br/confere/',
    submitUrl: null,
  },
  {
    id: 'afp-checamos',
    name: 'AFP Checamos',
    homepage: 'https://checamos.afp.com/',
    submitUrl: null,
  },
  {
    id: 'comprova',
    name: 'Projeto Comprova',
    homepage: 'https://projetocomprova.com.br/',
    submitUrl: 'https://wa.me/5511970454984',
  },
  {
    id: 'g1-fato-ou-fake',
    name: 'g1 Fato ou Fake',
    homepage: 'https://g1.globo.com/fato-ou-fake/',
    submitUrl: null,
  },
]

export const CHECKER_IDS: readonly string[] = FACT_CHECKERS.map((checker) => checker.id)

const CHECKERS_BY_ID: ReadonlyMap<string, FactChecker> = new Map(
  FACT_CHECKERS.map((checker) => [checker.id, checker]),
)

export function findChecker(id: string): FactChecker | undefined {
  return CHECKERS_BY_ID.get(id)
}
