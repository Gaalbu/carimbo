/** Rules of one robots.txt, already narrowed to one user agent (RFC 9309). */
export interface RobotsRules {
  isAllowed(url: string): boolean
}

interface Rule {
  readonly allow: boolean
  readonly pattern: string
  readonly regex: RegExp
}

interface Group {
  readonly agents: string[]
  readonly rules: Rule[]
}

const WILDCARD_AGENT = '*'
// Some files carry invisible soft hyphens inside field names (`User­-agent`); dropping them reads
// the line the way its author meant it, which is the stricter reading for a polite crawler.
const SOFT_HYPHEN = /­/g
const REGEX_SPECIALS = /[.+?^{}()|[\]\\]/g

export const ALLOW_ALL: RobotsRules = { isAllowed: () => true }
export const DISALLOW_ALL: RobotsRules = { isAllowed: (url) => isRobotsFile(url) }

/**
 * Parses robots.txt for `userAgent` (its product token, e.g. `CarimboBot`). Groups naming the
 * agent win over `*`; inside the chosen groups the longest matching rule decides and `Allow`
 * wins a tie.
 */
export function parseRobots(text: string, userAgent: string): RobotsRules {
  const groups = parseGroups(text)
  const token = productToken(userAgent)
  const specific = groups.filter((group) => group.agents.includes(token))
  const chosen =
    specific.length > 0 ? specific : groups.filter((group) => group.agents.includes(WILDCARD_AGENT))
  const rules = chosen.flatMap((group) => group.rules)
  return { isAllowed: (url) => isRobotsFile(url) || decide(rules, pathOf(url)) }
}

function parseGroups(text: string): Group[] {
  const groups: Group[] = []
  let current: Group | null = null
  let lastWasAgent = false
  for (const rawLine of text.split(/\r\n|\r|\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim()
    const separator = line.indexOf(':')
    if (separator < 0) continue
    const field = line.slice(0, separator).replace(SOFT_HYPHEN, '').trim().toLowerCase()
    const value = line
      .slice(separator + 1)
      .replace(SOFT_HYPHEN, '')
      .trim()
    if (field === 'user-agent') {
      if (current === null || !lastWasAgent) {
        current = { agents: [], rules: [] }
        groups.push(current)
      }
      current.agents.push(value.toLowerCase())
      lastWasAgent = true
      continue
    }
    lastWasAgent = false
    if (current === null || (field !== 'allow' && field !== 'disallow')) continue
    // An empty Disallow allows everything, which is the same as having no rule.
    if (value === '') continue
    const pattern = normalizePattern(value)
    current.rules.push({ allow: field === 'allow', pattern, regex: toRegex(pattern) })
  }
  return groups
}

function decide(rules: readonly Rule[], path: string): boolean {
  let best: Rule | null = null
  for (const rule of rules) {
    if (!rule.regex.test(path)) continue
    const longer = best === null || rule.pattern.length > best.pattern.length
    const tieGoesToAllow =
      best !== null && rule.pattern.length === best.pattern.length && rule.allow
    if (longer || tieGoesToAllow) best = rule
  }
  return best?.allow ?? true
}

function toRegex(pattern: string): RegExp {
  const anchored = pattern.endsWith('$')
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .replace(REGEX_SPECIALS, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\$/g, '\\$')
  return new RegExp(`^${body}${anchored ? '$' : ''}`)
}

/** Patterns may be written with raw UTF-8; URLs are compared percent-encoded. */
function normalizePattern(value: string): string {
  try {
    return encodeURI(decodeURI(value))
  } catch {
    return value
  }
}

function pathOf(url: string): string {
  const parsed = new URL(url)
  return `${parsed.pathname}${parsed.search}`
}

function isRobotsFile(url: string): boolean {
  return new URL(url).pathname === '/robots.txt'
}

/** `CarimboBot/0.1 (+https://…)` → `carimbobot`. */
export function productToken(userAgent: string): string {
  return (userAgent.split(/[/\s]/, 1)[0] ?? userAgent).toLowerCase()
}
