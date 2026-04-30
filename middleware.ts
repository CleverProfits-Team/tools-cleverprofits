import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Already-authenticated users hitting /login go straight to their callback.
    if (pathname === '/login' && token) {
      const callbackUrl = req.nextUrl.searchParams.get('callbackUrl') ?? '/dashboard'
      return NextResponse.redirect(new URL(callbackUrl, req.url))
    }

    return NextResponse.next()
  },

  {
    callbacks: {
      /**
       * Authorization gate.
       *
       * Each tool runs as its own Railway service on its own subdomain
       * (`calendar.cleverprofits.app`, `kpis.cleverprofits.app`, …) and is
       * never routed through this middleware. This middleware only sees
       * requests for the platform itself (`cleverprofits.app`).
       */
      authorized({ req, token }) {
        const { pathname } = req.nextUrl

        if (
          pathname.startsWith('/login') ||
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/invite') ||
          pathname === '/api/health'
        ) return true

        if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/')) {
          return !!token
        }

        return true
      },
    },

    pages: {
      signIn: '/login',
    },
  },
)

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
