import { describe, expect, it } from 'vitest'

import { extractClaimReviews, isoDate } from '../src/index.js'
import { fixture, pageWith } from './helpers.js'

const ESTADAO_PAGE =
  'https://www.estadao.com.br/estadao-verifica/queda-porcentagem-flavio-bolsonaro-apuracao-nao-e-erro/'

describe('extractClaimReviews', () => {
  it('reads an Aos Fatos ClaimReview typed as a list', () => {
    const page = fixture('aosfatos-claimreview-falso.json')
    const { reviews, errors } = extractClaimReviews(
      pageWith(page),
      'https://www.aosfatos.org/noticias/falso-que-lula-passou-mal-nao-vai-debate-globo/',
    )

    expect(errors).toEqual([])
    expect(reviews).toEqual([
      {
        claimText: 'Lula passou mal e não irá ao debate da Globo no dia 23 de outubro de 2026',
        claimant: 'desinformação',
        claimDate: '2026-10-23',
        reviewDate: '2026-10-23',
        reviewUrl:
          'https://www.aosfatos.org/noticias/falso-que-lula-passou-mal-nao-vai-debate-globo/',
        headline: null,
        textualRating: 'falso',
        ratingValue: '1',
      },
    ])
  })

  it('keeps Comprova’s explanation verbatim in the rating', () => {
    const { reviews } = extractClaimReviews(
      pageWith(fixture('comprova-claimreview-rating-with-explanation.json')),
      'https://projetocomprova.com.br/',
    )

    expect(reviews[0]?.textualRating).toBe(
      'Falso: O aviso de “Confira seu voto” foi implementado nas últimas eleições gerais para permitir que o eleitor revise o voto antes da confirmação.',
    )
    expect(reviews[0]?.ratingValue).toBeNull()
    expect(reviews[0]?.reviewUrl).toBe(
      'https://projetocomprova.com.br/publica%C3%A7%C3%B5es/eleitor-nao-perde-voto-ao-apertar-confirma-durante-aviso-para-conferir-escolha-na-urna-eletronica/',
    )
  })

  it('resolves a relative url and leaves a missing date missing', () => {
    const { reviews } = extractClaimReviews(
      pageWith(fixture('estadao-claimreview-enganoso.json')),
      ESTADAO_PAGE,
    )

    expect(reviews[0]).toMatchObject({
      reviewUrl: ESTADAO_PAGE,
      reviewDate: null,
      claimDate: '2026-10-09',
      claimant: 'Redes Sociais',
      textualRating: 'Enganoso',
      ratingValue: '2',
    })
  })

  it('falls back to the date and headline of the page’s NewsArticle', () => {
    const url =
      'https://www.estadao.com.br/estadao-verifica/falso-prorrogacao-horario-votacao-2-milhoes-votos-lula/'
    const { reviews, errors } = extractClaimReviews(
      fixture('estadao-page-falso-prorrogacao.html'),
      url,
    )

    expect(errors).toEqual([])
    expect(reviews).toHaveLength(1)
    expect(reviews[0]).toMatchObject({
      reviewUrl: url,
      reviewDate: '2026-10-26',
      claimDate: '2026-10-26',
      headline:
        'É falso que extensão do horário de votação tenha dado 2 milhões de votos a mais para Lula na Bahia',
      textualRating: 'Falso',
    })
  })

  it('does not take a date from a WebPage, only from an Article', () => {
    const webPage = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [{ '@type': 'WebPage', datePublished: '2026-10-23T21:22:59+00:00' }],
    })
    const review = JSON.stringify({
      '@type': 'ClaimReview',
      claimReviewed: 'Alegação',
      reviewRating: { alternateName: 'Falso' },
    })
    const { reviews } = extractClaimReviews(pageWith(webPage, review), 'https://example.org/a')

    expect(reviews[0]?.reviewDate).toBeNull()
    expect(reviews[0]?.reviewUrl).toBe('https://example.org/a')
  })

  it('ignores the Article date when the page has two different ones', () => {
    const article = (date: string): string =>
      JSON.stringify({ '@type': 'NewsArticle', datePublished: date })
    const review = JSON.stringify({
      '@type': 'ClaimReview',
      claimReviewed: 'Alegação',
      reviewRating: { alternateName: 'Falso' },
    })
    const { reviews } = extractClaimReviews(
      pageWith(review, article('2026-10-01'), article('2026-10-02')),
      'https://example.org/a',
    )

    expect(reviews[0]?.reviewDate).toBeNull()
  })

  it('reads a real Comprova page: @graph next to a top-level array', () => {
    const { reviews, errors } = extractClaimReviews(
      fixture('comprova-page-audio-flavio.html'),
      'https://projetocomprova.com.br/publica%C3%A7%C3%B5es/e-falso-audio-de-suposto-membro-da-equipe-de-flavio-bolsonaro-sobre-corte-do-bolsa-familia-e-de-aposentadorias/',
    )

    expect(errors).toEqual([])
    expect(reviews).toHaveLength(1)
    expect(reviews[0]).toMatchObject({
      reviewDate: '2026-10-23',
      claimDate: '2026-10-19',
      claimant: 'redes sociais',
      textualRating: 'Falso',
      headline: null,
    })
  })

  it('finds a ClaimReview nested in @graph and accepts ratingValue as a number', () => {
    const graph = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebSite', name: 'Checador' },
        {
          '@type': ['ClaimReview'],
          url: 'https://example.org/checagem',
          datePublished: '2026-09-01T10:00:00-03:00',
          claimReviewed: '  Alegação com espaço  ',
          reviewRating: [{ ratingValue: 3, name: 'Sem contexto' }],
          itemReviewed: { author: [{ name: '' }, 'Fulano'] },
        },
      ],
    })
    const { reviews } = extractClaimReviews(pageWith(graph), 'https://example.org/outra')

    expect(reviews[0]).toMatchObject({
      claimText: 'Alegação com espaço',
      reviewUrl: 'https://example.org/checagem',
      reviewDate: '2026-09-01',
      textualRating: 'Sem contexto',
      ratingValue: '3',
      claimant: 'Fulano',
    })
  })

  it('reports broken JSON and invalid ClaimReviews instead of guessing', () => {
    const noRating = JSON.stringify({ '@type': 'ClaimReview', claimReviewed: 'Alegação' })
    const emptyLabel = JSON.stringify({
      '@type': 'ClaimReview',
      claimReviewed: 'Alegação',
      reviewRating: { ratingValue: 1 },
    })
    const { reviews, errors } = extractClaimReviews(
      pageWith('{ "@type": "ClaimReview", ', noRating, emptyLabel),
      'https://example.org/a',
    )

    expect(reviews).toEqual([])
    expect(errors).toHaveLength(3)
    expect(errors[0]).toMatch(/^JSON-LD inválido/)
    expect(errors[1]).toMatch(/^ClaimReview fora do formato/)
    expect(errors[2]).toMatch(/sem avaliação textual/)
  })

  it('returns nothing for a page without JSON-LD', () => {
    expect(extractClaimReviews('<html></html>', 'https://example.org/')).toEqual({
      reviews: [],
      errors: [],
    })
  })
})

describe('isoDate', () => {
  it('keeps the calendar date the publisher wrote', () => {
    expect(isoDate('2026-10-26T23:30:00-03:00')).toBe('2026-10-26')
    expect(isoDate('2026-10-09T18:02:50.648Z')).toBe('2026-10-09')
  })

  it('rejects anything that is not a real date', () => {
    expect(isoDate('26/10/2026')).toBeNull()
    expect(isoDate('2026-02-30')).toBeNull()
    expect(isoDate(undefined)).toBeNull()
  })
})
