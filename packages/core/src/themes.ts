import { tokenize } from './text.js'

/**
 * A topic used only to filter the feed. A theme says what a claim is about, never whether it is
 * true: the stamp always comes from the checker.
 */
export interface Theme {
  readonly slug: string
  readonly name: string
  /**
   * Accent-free, lower-case keywords matched against whole words of the folded text. A keyword
   * ending in `*` matches any word starting with it (`vacin*` → vacina, vacinação). Multi-word
   * keywords must appear in sequence.
   */
  readonly keywords: readonly string[]
}

export const THEMES: readonly Theme[] = [
  {
    slug: 'urna-e-eleicao',
    name: 'Urna e eleição',
    keywords: [
      'urna*',
      'eleicao',
      'eleicoes',
      'eleitor*',
      'tse',
      'tre',
      'apuracao',
      'voto',
      'votos',
      'votar',
      'votacao',
      'segundo turno',
      'primeiro turno',
      'boletim de urna',
      'fraude eleitoral',
      'biometria',
      'titulo de eleitor',
      'candidat*',
      'debate',
      'pesquisa eleitoral',
    ],
  },
  {
    slug: 'saude',
    name: 'Saúde',
    keywords: [
      'vacin*',
      'saude',
      'covid*',
      'coronavirus',
      'pandemia',
      'virus',
      'doenca*',
      'remedio*',
      'medicament*',
      'cancer',
      'hospital*',
      'sus',
      'anvisa',
      'dengue',
      'gripe',
      'medic*',
      'tratamento',
      'cura',
    ],
  },
  {
    slug: 'economia',
    name: 'Economia',
    keywords: [
      'economia',
      'inflacao',
      'imposto*',
      'pix',
      'salario*',
      'dolar',
      'juros',
      'pib',
      'desemprego',
      'emprego*',
      'gasolina',
      'combustive*',
      'preco*',
      'bolsa familia',
      'aposentadoria',
      'inss',
      'receita federal',
      'banco central',
      'tributa*',
    ],
  },
  {
    slug: 'clima-e-ambiente',
    name: 'Clima e meio ambiente',
    keywords: [
      'clima*',
      'aquecimento global',
      'desmatamento',
      'amazonia',
      'queimada*',
      'incendio*',
      'enchente*',
      'chuva*',
      'seca',
      'meio ambiente',
      'ambiental',
      'floresta*',
      'cop30',
      'cop 30',
      'carbono',
    ],
  },
  {
    slug: 'seguranca',
    name: 'Segurança pública',
    keywords: [
      'policia*',
      'policial',
      'crime*',
      'criminos*',
      'faccao',
      'faccoes',
      'pcc',
      'comando vermelho',
      'arma',
      'armas',
      'armamento*',
      'assassin*',
      'homicidio*',
      'violencia',
      'presidio*',
      'preso',
      'presos',
      'traficante*',
      'trafico',
      'seguranca publica',
    ],
  },
  {
    slug: 'politica',
    name: 'Política',
    keywords: [
      'lula',
      'bolsonaro',
      'presidente',
      'governador*',
      'prefeit*',
      'deputad*',
      'senador*',
      'senado',
      'camara',
      'congresso',
      'stf',
      'ministro*',
      'ministerio',
      'governo',
      'partido',
      'pt',
      'pl',
      'impeachment',
    ],
  },
  {
    slug: 'internacional',
    name: 'Internacional',
    keywords: [
      'eua',
      'estados unidos',
      'trump',
      'biden',
      'china',
      'russia',
      'ucrania',
      'israel',
      'gaza',
      'palestin*',
      'venezuela',
      'maduro',
      'argentina',
      'milei',
      'onu',
      'otan',
      'europa',
    ],
  },
]

export const THEME_SLUGS: readonly string[] = THEMES.map((theme) => theme.slug)

const PREFIX_MARK = '*'

function matchesAt(words: readonly string[], start: number, keyword: readonly string[]): boolean {
  return keyword.every((part, offset) => {
    const word = words[start + offset]
    if (word === undefined) return false
    return part.endsWith(PREFIX_MARK) ? word.startsWith(part.slice(0, -1)) : word === part
  })
}

function containsKeyword(words: readonly string[], keyword: string): boolean {
  const parts = keyword.split(' ')
  for (let start = 0; start < words.length; start += 1) {
    if (matchesAt(words, start, parts)) return true
  }
  return false
}

/** Slugs of every theme with at least one keyword in `text`, in catalog order. */
export function tagThemes(...texts: readonly (string | null)[]): string[] {
  const words = texts.flatMap((text) => (text === null ? [] : tokenize(text)))
  return THEMES.filter((theme) =>
    theme.keywords.some((keyword) => containsKeyword(words, keyword)),
  ).map((theme) => theme.slug)
}

export function findTheme(slug: string): Theme | undefined {
  return THEMES.find((theme) => theme.slug === slug)
}
