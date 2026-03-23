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
      return NextResponse.redirect(new URL('/dashboard', req.url))
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

        const isPublicRoute =
          pathname.startsWith('/login') ||
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/invite') ||
          pathname === '/api/health'

        if (isPublicRoute) return true

        return !!token
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
   * This is intentionally broad so that the proxy route /[slug]/[[...path]]
   * is also covered — unauthenticated requests to tool URLs get redirected
   * to /login rather than reaching the proxy handler.
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
