import type { Review } from './review.js'

/** Columns of the open-data CSV: every review field, provenance flattened. */
export const CSV_COLUMNS = [
  'id',
  'checkerId',
  'claimText',
  'claimant',
  'claimDate',
  'reviewDate',
  'reviewUrl',
  'headline',
  'textualRating',
  'verdict',
  'ratingMapVersion',
  'archivedUrl',
  'sourceUrl',
  'fetchedAt',
  'method',
  'parserVersion',
  'rawSha256',
] as const

type CsvColumn = (typeof CSV_COLUMNS)[number]

/** Lets spreadsheet software (Excel in pt-BR) detect UTF-8. */
const UTF8_BOM = '﻿'
const NEEDS_QUOTING = /[",\r\n]/

function csvValue(review: Review, column: CsvColumn): string {
  const { provenance } = review
  switch (column) {
    case 'sourceUrl':
    case 'fetchedAt':
    case 'method':
    case 'parserVersion':
    case 'rawSha256':
      return provenance[column]
    case 'ratingMapVersion':
      return String(review.ratingMapVersion)
    default:
      return review[column] ?? ''
  }
}

/** RFC 4180: quote fields containing comma, quote or line break; double inner quotes. */
export function escapeCsv(value: string): string {
  return NEEDS_QUOTING.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

/** The whole export as CSV: UTF-8 BOM, CRLF line endings, header row first. */
export function toCsv(reviews: readonly Review[]): string {
  const lines = [CSV_COLUMNS.join(',')]
  for (const review of reviews) {
    lines.push(CSV_COLUMNS.map((column) => escapeCsv(csvValue(review, column))).join(','))
  }
  return `${UTF8_BOM}${lines.join('\r\n')}\r\n`
}
