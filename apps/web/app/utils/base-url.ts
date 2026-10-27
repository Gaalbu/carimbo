/** Joins the app base (`/`, `/carimbo/`) and a public path, with exactly one slash between. */
export function withAppBase(base: string, path: string): string {
  return `${base.replace(/\/?$/, '/')}${path.replace(/^\/+/, '')}`
}
