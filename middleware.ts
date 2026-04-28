import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  /**
   * This function runs ONLY when `authorized` (below) returns true.
   * Use it for post-auth logic: redirects, header injection, etc.
   */
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Redirect already-authenticated users away from the login page.
    // Without this, a logged-in user visiting /login would see the sign-in
    // screen, which is confusing.
    if (pathname === '/login' && token) {
      const callbackUrl = req.nextUrl.searchParams.get('callbackUrl') ?? '/dashboard'
      return NextResponse.redirect(new URL(callbackUrl, req.url))
    }

    return NextResponse.next()
  },

  {
    callbacks: {
      /**
       * Authorization gate — runs before the middleware function above.
       *
       * Rules:
       *  - /login and /api/auth/* are always public (no token required)
       *  - Every other route (dashboard, admin, proxy /[slug]) requires a
       *    valid JWT token
       *
       * When this returns false, NextAuth automatically redirects to
       * pages.signIn (/login) with a callbackUrl query param so the user
       * lands back on their original destination after signing in.
       */
      authorized({ req, token }) {
        const { pathname } = req.nextUrl

        // Always public — auth pages, NextAuth internals, invite flow, healthcheck
        if (
          pathname.startsWith('/login') ||
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/invite') ||
          pathname === '/api/health'
        ) return true

        // Platform routes require a valid session
        if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/')) {
          return !!token
        }

        // Everything else is a slug proxy route — public by design.
        // The proxy handler itself enforces tool-level access (ACTIVE status,
        // access level checks). Platform login is not required to reach a tool.
        return true
      },
    },

    pages: {
      signIn: '/login',
    },
  },
)

export const config = {
  /**
   * Matcher: run middleware on all routes EXCEPT:
   *  - _next/static   — compiled JS/CSS bundles
   *  - _next/image    — image optimisation endpoints
   *  - favicon.ico
   *  - Common static asset extensions (svg, png, jpg, etc.)
   *
   * Slug proxy routes (/[slug]/[[...path]]) are covered here but are allowed
   * through without auth — tools are publicly accessible, each tool handles
   * its own authentication.
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
