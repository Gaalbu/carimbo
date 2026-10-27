import { readFileSync } from 'node:fs'

export function fixture(name: string): string {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
}

/** Wraps JSON-LD blocks in a minimal page, the way a checker's HTML carries them. */
export function pageWith(...blocks: string[]): string {
  const scripts = blocks
    .map((block) => `<script type="application/ld+json">${block}</script>`)
    .join('\n')
  return `<!doctype html><html><head>${scripts}</head><body><p>texto</p></body></html>`
}
