/**
 * lib/tool-url.ts — Builders for tool URLs on the platform.
 *
 * Tools live on subdomains: `<slug>.cleverprofits.app`. The platform itself
 * (dashboard, login, admin) lives on the apex `cleverprofits.app`.
 *
 * In dev, both work via `<slug>.localhost:3000` and `localhost:3000` — modern
 * browsers resolve any-level `*.localhost` to 127.0.0.1.
 */

const PLATFORM_HOST = process.env.NEXT_PUBLIC_PLATFORM_HOST ?? 'cleverprofits.app'

function platformHost(): string {
  // On the client, derive from the current host so dev (localhost:3000) and
  // any future preview deploys "just work" without env config.
  if (typeof window !== 'undefined') {
    const host = window.location.host
    const platformBare = PLATFORM_HOST.split(':')[0]
    // If we're already on a tool subdomain (e.g. clever-calendar.cleverprofits.app),
    // strip it so we recover the apex.
    const i = host.indexOf(`.${platformBare}`)
    if (i > 0) return host.slice(i + 1)
    return host
  }
  return PLATFORM_HOST
}

function isInsecureDev(host: string): boolean {
  return host.startsWith('localhost') || host.includes('.localhost')
}

/** Full URL to launch a tool — e.g. `https://clever-calendar.cleverprofits.app`. */
export function toolUrl(slug: string): string {
  const host = platformHost()
  const protocol = isInsecureDev(host) ? 'http' : 'https'
  return `${protocol}://${slug}.${host}`
}

/** Host-only display string — e.g. `clever-calendar.cleverprofits.app`. No protocol. */
export function toolDisplayUrl(slug: string): string {
  return `${slug}.${platformHost()}`
}
