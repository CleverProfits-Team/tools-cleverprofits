/**
 * app/[slug]/[[...path]]/route.ts — Dynamic reverse proxy
 *
 * This is the most critical route in the platform. Every request to
 * tools.cleverprofits.com/<slug>[/...path] lands here and is proxied
 * server-side to the corresponding Railway service. The browser URL never
 * changes — the Railway origin is never exposed.
 *
 * ── Routing priority ─────────────────────────────────────────────────────────
 * Next.js App Router resolves static segments before dynamic ones, so:
 *
 *   /dashboard          → app/dashboard/page.tsx       (static, wins)
 *   /admin              → app/admin/page.tsx            (static, wins)
 *   /api/tools          → app/api/tools/route.ts        (static, wins)
 *   /api/auth/...       → app/api/auth/[...nextauth]/   (static, wins)
 *   /login              → app/login/page.tsx            (static, wins)
 *   /leadership-kpis    → this file                     (dynamic, catch-all)
 *   /leadership-kpis/x  → this file                     (dynamic, catch-all)
 *
 * ── Runtime ──────────────────────────────────────────────────────────────────
 * Must use the Node.js runtime (not Edge) because:
 *  1. Prisma requires Node.js
 *  2. getToken (next-auth/jwt) requires Node.js
 *  3. fetch() with duplex: 'half' (for ReadableStream body) requires Node.js
 *  4. Edge runtime has a 4 MB response body limit; some tool responses exceed this
 *
 * ── WebSocket limitation ─────────────────────────────────────────────────────
 * HTTP Upgrade (WebSocket) is NOT supported. Route Handlers cannot intercept
 * the Upgrade handshake. Tools relying on WS need a separate proxy sidecar.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/db'
import {
  STRIP_RESPONSE_HEADERS,
  buildUpstreamUrl,
  buildForwardHeaders,
  rewriteLocation,
  rewriteSetCookie,
  forwardSetCookies,
  rewriteHtml,
  rewriteCss,
  rewriteJs,
  generateErrorPage,
} from '@/lib/proxy'

// Force dynamic — never statically optimise this route.
// Every request must go through auth check + DB lookup.
export const dynamic = 'force-dynamic'

// Node.js runtime required (see file header).
export const runtime = 'nodejs'

// ─────────────────────────────────────────────────────────────────────────────
// Analytics helper
// ─────────────────────────────────────────────────────────────────────────────

/** Fire-and-forget ProxyHit record. Never throws — errors are logged only. */
function recordHit(
  tool: { id: string; slug: string; name: string },
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
): void {
  prisma.proxyHit.create({
    data: {
      toolId:     tool.id,
      toolSlug:   tool.slug,
      toolName:   tool.name,
      method,
      path:       path.slice(0, 2048),
      statusCode,
      durationMs,
    },
  }).catch((err) => console.error('[Proxy] Failed to record hit:', err))
}

// ─────────────────────────────────────────────────────────────────────────────
// Core handler
// ─────────────────────────────────────────────────────────────────────────────

async function handleProxy(
  request: NextRequest,
  params: { slug: string; path?: string[] },
): Promise<Response> {

  // ── Step 1: Tool lookup ────────────────────────────────────────────────────
  //
  // Auth is enforced by middleware (withAuth) before this handler runs.
  // Any request that reaches here has a valid JWT — no secondary check needed.
  //
  // We only select the four fields the proxy needs. Keeping the SELECT narrow
  // avoids pulling notes/description/etc. on every proxied request.

  type ToolRow = { id: string; slug: string; externalUrl: string; status: string; name: string }
  let tool: ToolRow | null

  try {
    tool = await prisma.tool.findUnique({
      where: { slug: params.slug },
      select: { id: true, slug: true, externalUrl: true, status: true, name: true },
    })
  } catch (err) {
    console.error(`[Proxy] DB lookup failed for slug "${params.slug}":`, err)
    return errPage(500, 'Internal Error', 'Failed to load tool configuration. Please try again.')
  }

  // ── Step 3: Status guards ──────────────────────────────────────────────────

  if (!tool) {
    // 404: no such slug registered
    return errPage(
      404,
      'Tool Not Found',
      // escapeHtml() is required here: params.slug comes from the URL, not the
      // DB. A request to /%3Cscript%3E... would decode to <script>... and render
      // as XSS in the error page without escaping.
      `No tool is registered with the slug <code>${escapeHtml(params.slug)}</code>. ` +
        `<a href="/dashboard">Browse registered tools →</a>`,
    )
  }

  if (tool.status === 'PENDING') {
    // 503: registered but not yet approved/deployed
    return errPage(
      503,
      'Tool Pending Approval',
      `<strong>${escapeHtml(tool.name)}</strong> is registered but not yet active. ` +
        `An administrator needs to approve it before it can be accessed. ` +
        `<a href="/dashboard">Back to dashboard →</a>`,
    )
  }

  if (tool.status === 'ARCHIVED') {
    // 503: soft-deleted; the proxy should not serve archived tools
    return errPage(
      503,
      'Tool Archived',
      `<strong>${escapeHtml(tool.name)}</strong> has been archived and is no longer accessible. ` +
        `Contact an administrator if you believe this is an error. ` +
        `<a href="/dashboard">Back to dashboard →</a>`,
    )
  }

  // Only ACTIVE tools reach here.
  //
  // V2 note: add access-level checks here for RESTRICTED / LEADERSHIP tools.
  // Example:
  //   if (tool.accessLevel === 'LEADERSHIP' && !isLeadership(session.user.email)) {
  //     return errPage(403, 'Access Restricted', '...')
  //   }

  // ── Step 4: Build upstream URL ─────────────────────────────────────────────

  const hitStart     = Date.now()
  const upstreamBase = tool.externalUrl.replace(/\/$/, '')
  const segments     = params.path ?? []
  const upstreamUrl  = buildUpstreamUrl(upstreamBase, segments, request.nextUrl.search)
  const hitPath      = '/' + segments.join('/') + (request.nextUrl.search ?? '')

  // ── Step 5: Build forwarded headers ───────────────────────────────────────

  const clientIp = (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'
  )
  const originalHost = request.headers.get('host') ?? ''

  const fwdHeaders = buildForwardHeaders(
    request.headers,
    upstreamBase,
    clientIp,
    originalHost,
  )

  // Inject authenticated user identity so upstream tools can trust who the
  // user is without running their own OAuth flow. The upstream app should
  // verify the presence of X-CP-Proxy-Secret before trusting these headers.
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (token) {
    fwdHeaders.set('x-cp-user-email', String(token.email ?? ''))
    fwdHeaders.set('x-cp-user-name',  String(token.name  ?? ''))
    fwdHeaders.set('x-cp-user-role',  String(token.role  ?? ''))
    fwdHeaders.set('x-cp-proxy-secret', process.env.CP_PROXY_SECRET ?? '')
  }

  // ── Step 6: Proxy the request ──────────────────────────────────────────────
  //
  // Key fetch options:
  //  - redirect: 'manual'   We handle 3xx ourselves to rewrite Location
  //  - duplex: 'half'       Required by Node.js 18+ when body is a ReadableStream
  //  - signal               AbortController gives us a hard 30 s ceiling so a
  //                         hung Railway service (cold start, OOM, infinite loop)
  //                         cannot hold the serverless function open indefinitely

  const method  = request.method.toUpperCase()
  const hasBody = !['GET', 'HEAD', 'OPTIONS'].includes(method)

  // 30 s is generous for internal tools; tighten in V2 if SLA requires it.
  const upstreamAbort   = new AbortController()
  const upstreamTimeout = setTimeout(() => upstreamAbort.abort(), 30_000)

  let upstream: Response

  try {
    upstream = await fetch(upstreamUrl, {
      method,
      headers: fwdHeaders,
      body:    hasBody && request.body ? (request.body as ReadableStream) : undefined,
      redirect: 'manual',
      signal:   upstreamAbort.signal,
      // @ts-expect-error — `duplex` is a Node.js-specific fetch option not
      // yet present in the TypeScript lib.dom types. Required when forwarding
      // a ReadableStream body; omitting it throws "RequestInit.duplex field
      // is required when body is ReadableStream".
      duplex: 'half',
    })
  } catch (err) {
    clearTimeout(upstreamTimeout)

    const isTimeout = err instanceof Error && err.name === 'AbortError'
    if (isTimeout) {
      console.warn(`[Proxy] Upstream timeout (30 s) → ${upstreamUrl}`)
      return errPage(
        504,
        'Tool Timed Out',
        `<strong>${escapeHtml(tool.name)}</strong> did not respond within 30 seconds. ` +
          `It may be cold-starting or overloaded. Please try again shortly.`,
      )
    }

    console.error(`[Proxy] Upstream fetch failed → ${upstreamUrl}:`, err)
    return errPage(
      502,
      'Tool Unreachable',
      `Could not connect to <strong>${escapeHtml(tool.name)}</strong>. ` +
        `The service may be temporarily down or still starting up. ` +
        `Please try again in a moment, or contact the tool owner if the problem persists.`,
    )
  } finally {
    clearTimeout(upstreamTimeout)
  }

  // ── Step 7: Handle upstream redirects ─────────────────────────────────────
  //
  // Upstream services commonly redirect internally (e.g. POST /form → GET /,
  // or /dashboard → /dashboard/). We intercept these and rewrite the Location
  // header so the browser never leaves tools.cleverprofits.com.

  if ([301, 302, 303, 307, 308].includes(upstream.status)) {
    const rawLocation = upstream.headers.get('location')

    if (rawLocation) {
      const rewritten = rewriteLocation(rawLocation, upstreamBase, params.slug)

      // NextResponse.redirect expects an absolute URL
      const absoluteTarget = rewritten.startsWith('http')
        ? rewritten
        : new URL(rewritten, request.url).toString()

      const redirectRes = NextResponse.redirect(absoluteTarget, {
        status: upstream.status,
      })

      // Forward any cookies set alongside the redirect (e.g. flash messages,
      // session cookies set before the redirect fires)
      forwardSetCookies(upstream.headers, redirectRes.headers, params.slug)

      return redirectRes
    }
  }

  // ── Step 8: Build response headers ────────────────────────────────────────

  const resHeaders = new Headers()

  upstream.headers.forEach((value, key) => {
    const lk = key.toLowerCase()

    // Drop headers that become invalid after the proxy hop
    if (STRIP_RESPONSE_HEADERS.has(lk)) return

    // Rewrite Set-Cookie to scope it to /slug and strip the upstream domain
    if (lk === 'set-cookie') {
      resHeaders.append('set-cookie', rewriteSetCookie(value, params.slug))
      return
    }

    resHeaders.set(key, value)
  })

  // X-Frame-Options: DENY would prevent the proxied page from rendering because
  // from the browser's perspective we ARE the frame host. Remove it.
  resHeaders.delete('x-frame-options')

  // Identify the proxy in server logs and DevTools without exposing the upstream URL.
  resHeaders.set('x-proxied-by',   'cp-tools')
  resHeaders.set('x-proxy-slug',   params.slug)

  // ── Step 9: Serve the response ─────────────────────────────────────────────

  const contentType = upstream.headers.get('content-type') ?? ''

  if (contentType.includes('text/html')) {
    // HTML responses are buffered so we can rewrite upstream URLs before the
    // bytes reach the browser. This is the only type we buffer; everything
    // else (CSS, JS, images, JSON, binary) is streamed directly.
    //
    // Consequence: the browser receives no bytes until the full HTML body has
    // been downloaded from the upstream and rewritten. For most internal tools
    // this is acceptable. For very large server-side-rendered pages the TTFB
    // will be visibly delayed — a V2 streaming HTML rewriter could fix this.

    let html: string
    try {
      html = await upstream.text()
    } catch (err) {
      console.error(`[Proxy] Failed to read HTML body from ${upstreamUrl}:`, err)
      return errPage(502, 'Tool Error', 'The tool returned a response that could not be read.')
    }

    const rewritten = rewriteHtml(html, upstreamBase, params.slug)

    // content-length is now invalid (byte count changed after rewriting)
    resHeaders.delete('content-length')
    resHeaders.set('content-type', 'text/html; charset=utf-8')

    recordHit(tool, request.method, hitPath, upstream.status, Date.now() - hitStart)
    return new Response(rewritten, {
      status:  upstream.status,
      headers: resHeaders,
    })
  }

  // ── CSS: buffer and rewrite ────────────────────────────────────────────────
  //
  // CSS files may contain url('/path') values that reference the upstream host
  // or root-relative paths. We buffer and rewrite them the same way we handle
  // HTML.

  if (contentType.includes('text/css')) {
    let css: string
    try {
      css = await upstream.text()
    } catch (err) {
      console.error(`[Proxy] Failed to read CSS body from ${upstreamUrl}:`, err)
      return errPage(502, 'Tool Error', 'The tool returned a response that could not be read.')
    }

    const rewritten = rewriteCss(css, upstreamBase, params.slug)
    resHeaders.delete('content-length')

    recordHit(tool, request.method, hitPath, upstream.status, Date.now() - hitStart)
    return new Response(rewritten, {
      status:  upstream.status,
      headers: resHeaders,
    })
  }

  // ── JavaScript: buffer and rewrite ────────────────────────────────────────
  //
  // JS bundles may contain hardcoded upstream origin strings (e.g. fetch base
  // URLs). We do a best-effort string replacement. Runtime-constructed URLs
  // remain a known limitation.

  if (contentType.includes('text/javascript') || contentType.includes('application/javascript')) {
    let js: string
    try {
      js = await upstream.text()
    } catch (err) {
      console.error(`[Proxy] Failed to read JS body from ${upstreamUrl}:`, err)
      return errPage(502, 'Tool Error', 'The tool returned a response that could not be read.')
    }

    const rewritten = rewriteJs(js, upstreamBase, params.slug)
    resHeaders.delete('content-length')

    recordHit(tool, request.method, hitPath, upstream.status, Date.now() - hitStart)
    return new Response(rewritten, {
      status:  upstream.status,
      headers: resHeaders,
    })
  }

  // ── All other content types: stream directly ───────────────────────────────
  //
  // Images, fonts, JSON API responses, binary downloads — piped from the
  // upstream ReadableStream to the browser without buffering.

  recordHit(tool, request.method, hitPath, upstream.status, Date.now() - hitStart)
  return new Response(upstream.body, {
    status:  upstream.status,
    headers: resHeaders,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Wraps generateErrorPage in a Response with the correct status + content-type. */
function errPage(status: number, title: string, body: string): Response {
  return new Response(generateErrorPage(status, title, body), {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}

/**
 * Escapes the five HTML special characters in a string.
 * Used when interpolating dynamic data (tool names, slugs) into error page HTML
 * to prevent XSS — even from our own database.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#x27;')
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP method exports
//
// Next.js App Router requires a named export for each HTTP verb. We route all
// of them through the same handleProxy() function — the upstream service
// receives the original method and handles it according to its own logic.
//
// Supported:  GET  POST  PUT  PATCH  DELETE  HEAD  OPTIONS
// Not supported: WebSocket (HTTP Upgrade) — see file header.
// ─────────────────────────────────────────────────────────────────────────────

type Ctx = { params: { slug: string; path?: string[] } }

export function GET    (req: NextRequest, ctx: Ctx) { return handleProxy(req, ctx.params) }
export function POST   (req: NextRequest, ctx: Ctx) { return handleProxy(req, ctx.params) }
export function PUT    (req: NextRequest, ctx: Ctx) { return handleProxy(req, ctx.params) }
export function PATCH  (req: NextRequest, ctx: Ctx) { return handleProxy(req, ctx.params) }
export function DELETE (req: NextRequest, ctx: Ctx) { return handleProxy(req, ctx.params) }
export function HEAD   (req: NextRequest, ctx: Ctx) { return handleProxy(req, ctx.params) }
export function OPTIONS(req: NextRequest, ctx: Ctx) { return handleProxy(req, ctx.params) }
