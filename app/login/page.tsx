'use client'

/**
 * Login page — public route, no auth required.
 *
 * This file is a Client Component because it uses:
 *  - useSearchParams() to read ?error= and ?callbackUrl= from the URL
 *  - signIn() from next-auth/react to trigger the Google OAuth flow
 *
 * It is wrapped in a <Suspense> boundary because Next.js 14 suspends
 * components that call useSearchParams() during server-side rendering.
 * The fallback is a skeleton that matches the card's dimensions to
 * prevent layout shift.
 */

import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Error message map
//
// NextAuth sets ?error=<code> on OAuth failure. These codes are documented at:
// https://next-auth.js.org/configuration/pages#error-page
// ─────────────────────────────────────────────────────────────────────────────

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  AccessDenied:
    'Access denied. Only @cleverprofits.com accounts are allowed.',
  OAuthSignin:
    'Could not start the sign-in flow. Please try again.',
  OAuthCallback:
    'OAuth callback error. Please try again.',
  OAuthAccountNotLinked:
    'This email address is linked to a different sign-in method.',
  SessionRequired:
    'You must be signed in to access that page.',
  Default:
    'Sign-in failed. Please try again or contact your administrator.',
}

function errorMessage(code: string): string {
  return AUTH_ERROR_MESSAGES[code] ?? AUTH_ERROR_MESSAGES.Default
}

// ─────────────────────────────────────────────────────────────────────────────
// LoginContent — inner component that reads URL search params
// ─────────────────────────────────────────────────────────────────────────────

function LoginContent() {
  const params = useSearchParams()
  const errorCode = params.get('error') ?? undefined
  const callbackUrl = params.get('callbackUrl') ?? '/dashboard'

  function handleSignIn() {
    signIn('google', { callbackUrl })
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-white border border-slate-200 rounded-xl shadow-card px-8 py-10">

        {/* ── Logotype ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-10">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-base tracking-tight select-none">
              CP
            </span>
          </div>
          <div className="leading-none">
            <p className="font-semibold text-slate-900 text-sm">CleverProfits</p>
            <p className="text-[11px] text-slate-400 mt-0.5 tracking-wide uppercase">
              Tools Platform
            </p>
          </div>
        </div>

        {/* ── Heading ──────────────────────────────────────────────────── */}
        <h1 className="text-xl font-semibold text-slate-900 mb-1">
          Sign in to continue
        </h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Use your{' '}
          <span className="font-medium text-slate-700">@cleverprofits.com</span>{' '}
          Google account to access the tools platform.
        </p>

        {/* ── Error banner ─────────────────────────────────────────────── */}
        {errorCode && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-200 px-3.5 py-3"
          >
            <svg
              className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-red-700">{errorMessage(errorCode)}</p>
          </div>
        )}

        {/* ── Google sign-in button ─────────────────────────────────────── */}
        <button
          onClick={handleSignIn}
          type="button"
          className="
            w-full flex items-center justify-center gap-3
            rounded-lg border border-slate-200 bg-white
            px-4 py-2.5
            text-sm font-medium text-slate-700
            hover:bg-slate-50 active:bg-slate-100
            transition-colors duration-150
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
          "
        >
          <GoogleLogo />
          Sign in with Google
        </button>

        {/* ── Fine print ───────────────────────────────────────────────── */}
        <p className="mt-8 text-center text-[11px] text-slate-400">
          Internal use only &mdash; CleverProfits
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton — shown during Suspense fallback
// ─────────────────────────────────────────────────────────────────────────────

function LoginSkeleton() {
  return (
    <div className="w-full max-w-sm">
      <div className="bg-white border border-slate-200 rounded-xl shadow-card px-8 py-10 animate-pulse">
        <div className="flex items-center gap-3 mb-10">
          <div className="h-10 w-10 rounded-xl bg-slate-200 flex-shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-28 bg-slate-200 rounded" />
            <div className="h-2.5 w-20 bg-slate-100 rounded" />
          </div>
        </div>
        <div className="h-6 w-44 bg-slate-200 rounded mb-2" />
        <div className="h-4 w-full bg-slate-100 rounded mb-6" />
        <div className="h-10 w-full bg-slate-100 rounded-lg" />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Google "G" logo (inline SVG — no extra network request)
// ─────────────────────────────────────────────────────────────────────────────

function GoogleLogo() {
  return (
    <svg
      className="h-[18px] w-[18px] flex-shrink-0"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page export
// ─────────────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Suspense fallback={<LoginSkeleton />}>
        <LoginContent />
      </Suspense>
    </main>
  )
}
