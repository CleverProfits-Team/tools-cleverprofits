/**
 * lib/proxy.ts — Reverse proxy helpers for tools.cleverprofits.com
 *
 * This module contains every piece of proxy logic that can be tested
 * independently of Next.js. The route handler imports from here and stays thin.
 *
 * ── Known limitations (V1) ────────────────────────────────────────────────────
 *
 * 1. WebSocket / HTTP Upgrade
 *    Next.js Route Handlers do not support the HTTP Upgrade mechanism, so tools
 *    that rely on WebSocket connections will not work through this proxy.
 *    Workaround: deploy a standalone Node/Express sidecar as a WS gateway.
 *
 * 2. JavaScript that constructs absolute URLs at runtime
 *    URLs that are assembled inside JS (e.g. `const url = BACKEND_URL + path`)
 *    are not reachable by string-replacement passes. Those requests will bypass
 *    the proxy and hit the upstream domain directly. Hardcoded string constants
 *    ARE rewritten by rewriteJs(); only runtime-constructed values are missed.
 *
 * 4. Streaming body size
 *    Request bodies are streamed through without buffering. The default Node.js
 *    memory ceiling still applies for response bodies that are buffered (HTML).
 *    Very large HTML documents (> ~50 MB) may cause memory pressure.
 *
 * 5. Request timeouts
 *    The proxy sets a 30 s AbortController timeout on the upstream fetch.
 *    Railway cold-starts can take 10–20 s; 30 s is generous but safe.
 *    Tighten in V2 if a stricter SLA is required.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hop-by-hop headers — connection-scoped, must NOT be forwarded.
 * RFC 2616 §13.5.1 + common non-standard additions.
 *
 * `host` is included here because buildForwardHeaders() replaces it with the
 * upstream host explicitly after the copy loop.
 */
export const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'proxy-connection', // non-standard but widely sent
  'host',             // replaced with upstream host in buildForwardHeaders()
])

/**
 * Response headers from the upstream that must be stripped before the proxy
 * forwards the response to the browser.
 *
 * - content-encoding: Node's fetch() auto-decompresses gzip / br / deflate.
 *   The body we receive is already plain text. Re-sending the original
 *   content-encoding header would tell the browser to decompress already-
 *   decompressed bytes, producing garbage output.
 *
 * - transfer-encoding: meaningful only within a single HTTP/1.1 connection.
 *   After the stream is decoded by the Node.js HTTP stack it loses meaning.
 */
export const STRIP_RESPONSE_HEADERS = new Set([
  'content-encoding',
  'transfer-encoding',
  'connection',
  'keep-alive',
])

/**
 * Cookie name prefixes owned by this platform (NextAuth).
 *
 * These MUST NOT be forwarded to upstream Railway services. Leaking our
 * session token to a third-party service would be a critical security flaw —
 * the upstream app would be able to impersonate authenticated users on the
 * CleverProfits platform.
 */
const NEXTAUTH_COOKIE_PREFIXES = [
  'next-auth.',
  '__Secure-next-auth.',
  '__Host-next-auth.',
]

// ─────────────────────────────────────────────────────────────────────────────
// URL helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Constructs the full upstream URL by joining:
 *   - The tool's external base URL     (e.g. "https://abc.up.railway.app")
 *   - The path segments from [[...path]]  (e.g. ["reports", "q1"])
 *   - The original query string           (e.g. "?format=pdf&page=2")
 *
 * The trailing slash on externalUrl (if any) is stripped to avoid double
 * slashes when path is non-empty.
 *
 * @example
 *   buildUpstreamUrl("https://abc.up.railway.app/", ["reports","q1"], "?pdf")
 *   // → "https://abc.up.railway.app/reports/q1?pdf"
 *
 *   buildUpstreamUrl("https://abc.up.railway.app", [], "")
 *   // → "https://abc.up.railway.app"
 */
export function buildUpstreamUrl(
  externalUrl: string,
  segments: string[],
  search: string,
): string {
  const base = externalUrl.replace(/\/$/, '')
  const path = segments.length > 0 ? '/' + segments.join('/') : ''
  return base + path + search
}

// ─────────────────────────────────────────────────────────────────────────────
// Request header helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the Headers object to forward to the upstream service.
 *
 * Actions performed (in order):
 *  1. Copy all incoming headers, skipping hop-by-hop headers
 *  2. Strip NextAuth session/CSRF cookies from the Cookie header
 *  3. Set Host to the upstream hostname (required by many frameworks)
 *  4. Inject X-Forwarded-* headers so the upstream knows the real client info
 */
export function buildForwardHeaders(
  incoming: Headers,
  upstreamBase: string,
  clientIp: string,
  originalHost: string,
): Headers {
  const out = new Headers()

  incoming.forEach((value, key) => {
    const lk = key.toLowerCase()

    // 1. Skip hop-by-hop (includes 'host' — we set it explicitly below)
    if (HOP_BY_HOP.has(lk)) return

    // 2. Sanitise Cookie: strip platform auth cookies before forwarding
    if (lk === 'cookie') {
      const sanitised = stripNextAuthCookies(value)
      if (sanitised) out.set('cookie', sanitised)
      return
    }

    out.set(key, value)
  })

  // 3. Set the upstream's own hostname as the Host header.
  //    Frameworks like Django, Rails, and Express use Host for:
  //      - generating absolute redirect URLs
  //      - CSRF origin validation
  //      - virtual hosting
  out.set('host', new URL(upstreamBase).host)

  // 4. Standard reverse-proxy identification headers.
  //
  // NOTE: x-forwarded-host is intentionally NOT set here.
  //
  // Setting x-forwarded-host to tools.cleverprofits.com causes upstream
  // apps (e.g. NextAuth-based tools) to construct their redirect URLs
  // using our platform domain instead of their own — e.g.:
  //   https://tools.cleverprofits.com/login
  // rather than:
  //   https://growth-system.up.railway.app/api/auth/signin
  //
  // rewriteLocation() can only rewrite redirects that point at the upstream
  // host, so a redirect to tools.cleverprofits.com bypasses rewriting and
  // sends the user to the platform's own /login page.
  //
  // Without x-forwarded-host, the upstream app uses its own Host header
  // (set above) when constructing absolute URLs, so its redirects point at
  // the upstream domain and are correctly rewritten by rewriteLocation().
  out.set('x-forwarded-for',   clientIp)
  out.set('x-forwarded-proto', 'https')
  out.set('x-real-ip',         clientIp)

  return out
}

/**
 * Removes NextAuth-owned cookies from a Cookie header string.
 *
 * Returns the sanitised cookie string (may be empty if all cookies belonged
 * to NextAuth — in that case the caller should omit the header entirely).
 */
function stripNextAuthCookies(cookieHeader: string): string {
  return cookieHeader
    .split(';')
    .map((c) => c.trim())
    .filter((cookie) => {
      const name = cookie.split('=')[0].trim().toLowerCase()
      return !NEXTAUTH_COOKIE_PREFIXES.some((prefix) =>
        name.startsWith(prefix.toLowerCase()),
      )
    })
    .join('; ')
    .trim()
}

// ─────────────────────────────────────────────────────────────────────────────
// Redirect rewriting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rewrites an upstream 3xx Location header so that the redirect stays on the
 * proxy domain. Without this, a redirect would expose the Railway URL to the
 * browser.
 *
 * Three cases:
 *
 *   Case 1 — Absolute URL pointing at the upstream service (http or https):
 *     "https://abc.up.railway.app/dashboard" → "/my-tool/dashboard"
 *     "http://abc.up.railway.app/dashboard"  → "/my-tool/dashboard"
 *
 *   Case 2 — Absolute path (same-origin redirect from the upstream):
 *     "/dashboard"     → "/my-tool/dashboard"
 *     "/api/v1/users"  → "/my-tool/api/v1/users"
 *
 *   Case 3 — External URL (different domain) or a relative path:
 *     "https://other.com/page"  → unchanged
 *     "relative/page"           → unchanged (browser resolves against current URL)
 */
export function rewriteLocation(
  location: string,
  upstreamBase: string,
  slug: string,
): string {
  const base = upstreamBase.replace(/\/$/, '')
  const upstreamHost = new URL(upstreamBase).host

  // Case 1: Absolute URL — check both https:// and http:// variants
  for (const scheme of ['https://', 'http://']) {
    const prefix = scheme + upstreamHost
    if (location.startsWith(prefix)) {
      const rest = location.slice(prefix.length)
      return `/${slug}${rest || '/'}`
    }
  }

  // Case 1b: Full base match (handles ports or non-standard paths in base URL)
  if (location.startsWith(base)) {
    const rest = location.slice(base.length)
    return `/${slug}${rest || '/'}`
  }

  // Case 2: Absolute path
  if (location.startsWith('/')) {
    return `/${slug}${location}`
  }

  // Case 3: Leave unchanged
  return location
}

// ─────────────────────────────────────────────────────────────────────────────
// Cookie rewriting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rewrites a single Set-Cookie value from an upstream response so the cookie
 * is scoped to the proxy path rather than the upstream domain.
 *
 * Transformations applied:
 *
 *  Domain=...    → stripped entirely
 *    Removing Domain lets the browser default to the current domain
 *    (tools.cleverprofits.com), which is what we want.
 *
 *  Path=<p>      → Path=/slug<p>
 *    Scopes the cookie to this specific tool's path so tools can't read
 *    each other's cookies.
 *
 *  SameSite=Strict → SameSite=Lax
 *    Strict prevents the cookie from being sent on cross-site navigation
 *    (e.g. following a link from Slack to the tool). Since the upstream's
 *    "site" is now our proxy domain, Lax is the safe and compatible choice.
 *
 *  HttpOnly, Secure, Max-Age, Expires → preserved as-is
 *
 * @example
 *   Input:  "session=abc; Domain=abc.up.railway.app; Path=/; HttpOnly; Secure"
 *   Output: "session=abc; Path=/my-tool; HttpOnly; Secure"
 */
export function rewriteSetCookie(raw: string, slug: string): string {
  const parts = raw.split(/;\s*/)
  const output: string[] = []
  let hasPath = false

  for (const part of parts) {
    const lower = part.toLowerCase().trimStart()

    // Strip Domain — cookie will default to the proxy's domain
    if (lower.startsWith('domain=')) continue

    if (lower.startsWith('path=')) {
      // Preserve the original path suffix under /slug
      const originalPath = part.split('=').slice(1).join('=').trim()
      const newPath =
        !originalPath || originalPath === '/'
          ? `/${slug}`
          : `/${slug}${originalPath.startsWith('/') ? originalPath : '/' + originalPath}`
      output.push(`Path=${newPath}`)
      hasPath = true
      continue
    }

    // Relax SameSite=Strict so cookies are sent on navigations from Slack, email, etc.
    if (lower === 'samesite=strict') {
      output.push('SameSite=Lax')
      continue
    }

    output.push(part)
  }

  // If the upstream omitted Path, default the cookie to the tool's root
  if (!hasPath) {
    output.push(`Path=/${slug}`)
  }

  return output.join('; ')
}

/**
 * Returns true if a Set-Cookie header string is setting a cookie whose name
 * belongs to NextAuth. These must never be forwarded from an upstream service
 * to the browser, because they would conflict with the platform's own NextAuth
 * session cookie (same name, different encryption secret) and break auth.
 *
 * A Set-Cookie header looks like:
 *   "next-auth.session-token=abc; Path=/; HttpOnly; Secure"
 * The cookie name is everything before the first "=".
 */
export function isNextAuthSetCookie(setCookieHeader: string): boolean {
  const name = setCookieHeader.split('=')[0].trim().toLowerCase()
  return NEXTAUTH_COOKIE_PREFIXES.some((prefix) =>
    name.startsWith(prefix.toLowerCase()),
  )
}

/**
 * Copies all Set-Cookie headers from srcHeaders to dstHeaders, rewriting
 * each one via rewriteSetCookie(). NextAuth-named cookies are silently
 * dropped to prevent name collisions with the platform's own session cookie.
 */
export function forwardSetCookies(
  srcHeaders: Headers,
  dstHeaders: Headers,
  slug: string,
): void {
  srcHeaders.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      if (isNextAuthSetCookie(value)) return   // drop — would collide with platform cookie
      dstHeaders.append('set-cookie', rewriteSetCookie(value, slug))
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML rewriting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rewrites an HTML document so that upstream-origin URLs are replaced with
 * proxy-relative equivalents and relative asset paths resolve correctly.
 *
 * ── Strategy ─────────────────────────────────────────────────────────────────
 *
 * Pass 1 — String replacement
 *   Every occurrence of the upstream origin (both https:// and http:// variants,
 *   plus the protocol-relative //host form) is replaced with /slug.
 *   This covers: href, src, action, fetch() calls in inline scripts, meta
 *   redirects, Open Graph tags, canonical links, etc.
 *
 * Pass 2 — <base> tag injection
 *   A <base href="/slug/"> element is injected immediately after <head> if none
 *   exists. This instructs the browser to resolve relative paths like
 *   src="static/app.js" as /slug/static/app.js rather than /static/app.js,
 *   which would miss the proxy entirely.
 *
 * ── What this does NOT handle ────────────────────────────────────────────────
 *   - URLs constructed at runtime in JavaScript (not reachable by regex)
 *   - External CSS files (streamed without buffering — see proxy.ts header)
 *   - srcset attribute values (best-effort: covered if they use absolute URLs)
 *   - data: URIs, blob: URIs (irrelevant — not pointing at upstream)
 *
 * @param html         Raw HTML string from upstream
 * @param upstreamBase Upstream base URL (e.g. "https://abc.up.railway.app")
 * @param slug         Tool slug (e.g. "leadership-kpis")
 */
export function rewriteHtml(
  html: string,
  upstreamBase: string,
  slug: string,
): string {
  const host = new URL(upstreamBase).host
  const internalBase = `/${slug}`

  // Pass 1: Replace all URL forms pointing at the upstream host
  let result = html
    .replace(new RegExp(`https://${escapeRegExp(host)}`, 'gi'), internalBase)
    .replace(new RegExp(`http://${escapeRegExp(host)}`,  'gi'), internalBase)
    .replace(new RegExp(`//${escapeRegExp(host)}`,       'gi'), internalBase)

  // Pass 2: Inject <base> tag for relative path resolution
  const hasBase = /<base[\s>]/i.test(result)
  const hasHead = /<head[\s>]/i.test(result)

  if (hasHead && !hasBase) {
    result = result.replace(
      /(<head[^>]*>)/i,
      `$1\n  <base href="${internalBase}/" />`,
    )
  }

  // Pass 3: Rewrite root-relative absolute paths in HTML attributes.
  //
  // Frameworks like Next.js emit asset paths as root-relative URLs, e.g.:
  //   <link href="/_next/static/css/app.css" ...>
  //   <script src="/_next/static/js/main.js" ...>
  //
  // These start with "/" so the <base> tag (which only affects relative paths)
  // does not help. The browser requests tools.cleverprofits.com/_next/... and
  // gets a 404 instead of tools.cleverprofits.com/kpis-dashboard/_next/...
  //
  // We prepend /slug to any root-relative path in href/src/action attributes,
  // UNLESS the path:
  //   - already starts with /slug (already rewritten by Pass 1)
  //   - starts with // (protocol-relative, handled by Pass 1)
  const escapedSlug = escapeRegExp(slug)
  result = result.replace(
    new RegExp(
      `((?:href|src|action)\\s*=\\s*["'])(\\/)`
      + `(?!\\/)` // skip protocol-relative //...
      + `(?!${escapedSlug}(?:\\/|['"]))`, // skip already-prefixed /slug/...
      'gi',
    ),
    `$1/${slug}/`,
  )

  // Pass 4: patch assetPrefix in inline __NEXT_DATA__ JSON (Pages Router).
  // Next.js injects <script id="__NEXT_DATA__" type="application/json">{"assetPrefix":"", ...}
  // Setting assetPrefix to /<slug> makes the client load all /_next/ chunks
  // via the proxy path instead of the platform's own /_next/ directory.
  result = result.replace(
    /"assetPrefix"\s*:\s*""/g,
    `"assetPrefix":"/${slug}"`,
  )

  return result
}

/**
 * Rewrites a CSS document so that upstream-origin URLs and root-relative
 * paths inside url(...) expressions resolve through the proxy.
 *
 * Pass 1: Replace upstream origin (https://host, http://host, //host) → /slug
 * Pass 2: Rewrite root-relative url('/path') → url('/slug/path')
 *         - Skips protocol-relative //...
 *         - Skips paths already prefixed with /slug
 */
export function rewriteCss(css: string, upstreamBase: string, slug: string): string {
  const host = new URL(upstreamBase).host
  const internalBase = `/${slug}`

  // Pass 1: upstream origin replacement (same as HTML Pass 1)
  let result = css
    .replace(new RegExp(`https://${escapeRegExp(host)}`, 'gi'), internalBase)
    .replace(new RegExp(`http://${escapeRegExp(host)}`,  'gi'), internalBase)
    .replace(new RegExp(`//${escapeRegExp(host)}`,       'gi'), internalBase)

  // Pass 2: root-relative paths inside url(...)
  const escapedSlug = escapeRegExp(slug)
  result = result.replace(
    new RegExp(
      `(url\\s*\\(\\s*['"]?)(\\/)` +
      `(?!\\/)` +                              // skip protocol-relative //...
      `(?!${escapedSlug}(?:\\/|['")]))`,       // skip already-prefixed /slug/...
      'gi',
    ),
    `$1/${slug}/`,
  )

  return result
}

/**
 * Rewrites a JS bundle so that upstream-origin strings and root-relative
 * asset paths are replaced with proxy-relative equivalents.
 *
 * Pass 1: Replace https://host, http://host, //host → /slug
 *
 * Pass 2: Rewrite the webpack public path and any quoted "/_next/" string
 *   literals so that dynamically-loaded chunks (lazy routes, code-split
 *   bundles) are fetched through the proxy instead of hitting the platform's
 *   own /_next/ directory and returning 404.
 *
 *   Next.js sets the webpack public path as a string constant in the webpack
 *   runtime bundle, e.g.:
 *     __webpack_require__.p = "/_next/"
 *   After rewriting:
 *     __webpack_require__.p = "/growth-system/_next/"
 *
 *   This covers both App Router and Pages Router Next.js builds. Non-Next.js
 *   apps with root-relative asset paths also benefit.
 *
 * Pass 3: Rewrite assetPrefix in __NEXT_DATA__ JSON embedded in JS payloads
 *   (Pages Router RSC / inline data).
 *
 * Runtime-constructed URLs (e.g. variable + "/_next/") are not reachable —
 * known limitation for dynamically assembled paths.
 */
export function rewriteJs(js: string, upstreamBase: string, slug: string): string {
  const host = new URL(upstreamBase).host
  const internalBase = `/${slug}`

  // Pass 1: upstream origin replacement
  let result = js
    .replace(new RegExp(`https://${escapeRegExp(host)}`, 'gi'), internalBase)
    .replace(new RegExp(`http://${escapeRegExp(host)}`,  'gi'), internalBase)
    .replace(new RegExp(`//${escapeRegExp(host)}`,       'gi'), internalBase)

  // Pass 2: rewrite quoted "/_next/" string literals → "/<slug>/_next/"
  // Matches single-quoted, double-quoted, and template-literal occurrences.
  // Skips occurrences already prefixed with the slug (idempotent).
  const escapedSlug = escapeRegExp(slug)
  result = result.replace(
    new RegExp(
      `(["'\`])\\/_next\\/(?!${escapedSlug}(?:\\/|["'\`]))`,
      'g',
    ),
    `$1/${slug}/_next/`,
  )

  // Pass 3: patch assetPrefix in any embedded __NEXT_DATA__ JSON
  // so Next.js Pages Router uses the proxy-relative prefix.
  result = result.replace(
    /"assetPrefix"\s*:\s*""/g,
    `"assetPrefix":"/${slug}"`,
  )

  return result
}

/**
 * Escapes special regex metacharacters in a literal string so it can be
 * safely embedded inside a RegExp pattern.
 *
 * e.g. "abc.up.railway.app" → "abc\\.up\\.railway\\.app"
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ─────────────────────────────────────────────────────────────────────────────
// Error page generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a self-contained HTML error page for proxy failures.
 *
 * Deliberately avoids all external dependencies (no CDN CSS, no JS): the page
 * must render correctly even when the upstream service is entirely unreachable
 * and when the browser has no cached assets.
 *
 * @param httpStatus  HTTP status code (404, 503, 502, etc.)
 * @param title       Short human-readable title
 * @param body        Description HTML (may contain <a>, <strong>, <code>)
 */
export function generateErrorPage(
  httpStatus: number,
  title: string,
  body: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — CleverProfits Tools</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; padding: 2rem; color: #1e293b;
    }
    .card {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 3rem 2.5rem; max-width: 480px; width: 100%; text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,.07);
    }
    .badge {
      display: inline-block; font-size: .7rem; font-weight: 700;
      letter-spacing: .08em; text-transform: uppercase; color: #94a3b8;
      background: #f1f5f9; border-radius: 999px;
      padding: .25rem .75rem; margin-bottom: 1.25rem;
    }
    h1  { font-size: 1.375rem; font-weight: 700; margin-bottom: .625rem; }
    p   { font-size: .9375rem; color: #64748b; line-height: 1.6; }
    a   { color: #3b82f6; text-decoration: none; }
    a:hover { text-decoration: underline; }
    code {
      background: #f1f5f9; padding: .1em .4em;
      border-radius: 4px; font-size: .875em;
    }
    .footer {
      margin-top: 2rem; padding-top: 1.25rem;
      border-top: 1px solid #f1f5f9;
      font-size: .75rem; color: #cbd5e1;
    }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">HTTP ${httpStatus}</span>
    <h1>${title}</h1>
    <p>${body}</p>
    <div class="footer">CleverProfits Tools Platform</div>
  </div>
</body>
</html>`
}
