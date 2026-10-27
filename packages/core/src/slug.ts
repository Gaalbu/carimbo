import { tokenize } from './text.js'

const MAX_SLUG_WORDS = 8
const MAX_SLUG_LENGTH = 60
const SUFFIX_LENGTH = 8
const FALLBACK_SLUG = 'alegacao'

/** Readable, URL-safe part of a slug: the first words of the text, folded to ASCII. */
export function slugify(text: string): string {
  let slug = ''
  for (const token of tokenize(text).slice(0, MAX_SLUG_WORDS)) {
    const next = slug === '' ? token : `${slug}-${token}`
    if (next.length > MAX_SLUG_LENGTH) break
    slug = next
  }
  return slug === '' ? FALLBACK_SLUG : slug
}

/**
 * Stable slug for a claim group: readable text plus the first hex chars of a review id. The review
 * id is already a SHA-256 prefix of its URL, so the suffix is a short hash without needing crypto
 * here (this package must stay browser-safe).
 */
export function claimSlug(claimText: string, reviewId: string): string {
  const suffix = reviewId
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, SUFFIX_LENGTH)
  return suffix === '' ? slugify(claimText) : `${slugify(claimText)}-${suffix}`
}
