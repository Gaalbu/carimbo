/** One JSON-LD node, as found in the page: untyped until a zod schema validates it. */
export type JsonLdNode = Readonly<Record<string, unknown>>

export interface JsonLdScan {
  /** Every top-level node, with `@graph` members and arrays flattened out. */
  readonly nodes: readonly JsonLdNode[]
  /** One message per `<script type="application/ld+json">` block that is not valid JSON. */
  readonly errors: readonly string[]
}

// The type attribute may be quoted or not and may carry parameters (`application/ld+json; charset=utf-8`).
const JSON_LD_SCRIPT =
  /<script\b[^>]*\btype\s*=\s*["']?application\/ld\+json\b[^>]*>([\s\S]*?)<\/script\s*>/gi
const HTML_COMMENT_WRAPPER = /^\s*<!--|-->\s*$/g
const BLOCK_PREVIEW_LENGTH = 60

/** Finds and parses every JSON-LD block of an HTML page. Never throws on bad markup. */
export function scanJsonLd(html: string): JsonLdScan {
  const nodes: JsonLdNode[] = []
  const errors: string[] = []
  for (const match of html.matchAll(JSON_LD_SCRIPT)) {
    const block = (match[1] ?? '').replace(HTML_COMMENT_WRAPPER, '').trim()
    if (block === '') continue
    let parsed: unknown
    try {
      parsed = JSON.parse(block)
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      errors.push(`JSON-LD inválido (${reason}): ${block.slice(0, BLOCK_PREVIEW_LENGTH)}`)
      continue
    }
    collectNodes(parsed, nodes)
  }
  return { nodes, errors }
}

function collectNodes(value: unknown, into: JsonLdNode[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectNodes(item, into)
    return
  }
  if (!isNode(value)) return
  const graph = value['@graph']
  if (graph !== undefined) {
    collectNodes(graph, into)
    // A node with `@graph` is only a container unless it also declares its own type.
    if (value['@type'] === undefined) return
  }
  into.push(value)
}

function isNode(value: unknown): value is JsonLdNode {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** `@type` may be a string or a list (`["Review", "ClaimReview"]`). */
export function nodeTypes(node: JsonLdNode): readonly string[] {
  const type = node['@type']
  if (typeof type === 'string') return [type]
  if (Array.isArray(type)) return type.filter((item): item is string => typeof item === 'string')
  return []
}

export function hasType(node: JsonLdNode, type: string): boolean {
  return nodeTypes(node).includes(type)
}
