'use client'

import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Suspense } from 'react'

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  AccessDenied:
    'Access denied. Only @cleverprofits.com accounts are allowed.',
  Suspended:
    'Your account has been suspended. Contact your administrator.',
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

function LoginContent() {
  const params = useSearchParams()
  const errorCode = params.get('error') ?? undefined
  const callbackUrl = params.get('callbackUrl') ?? '/dashboard'

  function handleSignIn() {
    signIn('google', { callbackUrl })
  }

  return (
    <div className="w-full max-w-sm relative z-10">
      <div className="bg-white rounded-2xl shadow-xl px-8 py-10">

        {/* ── Logo lockup ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-[#E7E7E7]">
            <Image
              src="/cp-logo-circle.png"
              alt=""
              width={40}
              height={40}
              className="h-full w-full object-cover"
              aria-hidden
            />
          </div>
          <div className="leading-none">
            <Image
              src="/cp-logo-wordmark.png"
              alt="CleverProfits"
              width={140}
              height={18}
              className="h-[16px] w-auto"
            />
            <p className="text-[10px] text-[rgba(15,0,56,0.55)] mt-1.5 tracking-[0.18em] uppercase font-semibold">
              Tools Platform
            </p>
          </div>
        </div>

        {/* ── Heading ──────────────────────────────────────────────────── */}
        <h1 className="font-display font-bold text-[29px] text-[#0F0038] mb-1.5 tracking-[-0.02em] leading-[1.2]">
          Sign in to continue
        </h1>
        <p className="text-sm text-[rgba(15,0,56,0.55)] mb-7 leading-relaxed">
          Use your{' '}
          <span className="font-semibold text-[#0F0038]">@cleverprofits.com</span>{' '}
          Google Workspace account to access the tools platform.
        </p>

        {/* ── Error banner ─────────────────────────────────────────────── */}
        {errorCode && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-lg border-l-[3px] border-[#EF4444] bg-[rgba(239,68,68,0.06)] px-4 py-3"
          >
            <svg
              className="h-4 w-4 flex-shrink-0 mt-0.5 text-[#EF4444]"
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
            <p className="text-sm font-medium text-[#991B1B]">{errorMessage(errorCode)}</p>
          </div>
        )}

        {/* ── Google sign-in button ─────────────────────────────────────── */}
        <button
          onClick={handleSignIn}
          type="button"
          className="
            w-full flex items-center justify-center gap-3
            rounded-lg border-[1.5px] border-[#E7E7E7] bg-white
            px-4 py-3
            text-sm font-bold text-[#0F0038]
            hover:bg-[#FAFAFA] hover:border-[#D6D6D6]
            transition-all duration-150 shadow-xs
            focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2605EF] focus-visible:ring-offset-2
          "
        >
          <GoogleLogo />
          Continue with Google
        </button>

        {/* ── Divider ──────────────────────────────────────────────────── */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E7E7E7]" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-[11px] text-[rgba(15,0,56,0.40)] tracking-[0.10em] uppercase font-semibold">
              Secured by Google Workspace
            </span>
          </div>
        </div>

        {/* ── Fine print ───────────────────────────────────────────────── */}
        <p className="text-center text-[11px] text-[rgba(15,0,56,0.40)] leading-relaxed">
          Internal use only &mdash; CleverProfits.<br />
          Access restricted to @cleverprofits.com accounts.
        </p>
      </div>
    </div>
  )
}

function LoginSkeleton() {
  return (
    <div className="w-full max-w-sm relative z-10">
      <div className="bg-white border border-[#E7E7E7] rounded-2xl shadow-xl px-8 py-10 animate-pulse">
        <div className="flex items-center gap-3 mb-10">
          <div className="h-10 w-10 rounded-full bg-[#E7E7E7] flex-shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-28 bg-[#E7E7E7] rounded" />
            <div className="h-2.5 w-20 bg-[#FAFAFA] rounded" />
          </div>
        </div>
        <div className="h-6 w-44 bg-[#E7E7E7] rounded mb-2" />
        <div className="h-4 w-full bg-[#FAFAFA] rounded mb-6" />
        <div className="h-10 w-full bg-[#FAFAFA] rounded-lg" />
      </div>
    </div>
  )
}

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

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-hero-mesh px-4 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
        aria-hidden
      />
      <div className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full border border-white/[0.04] pointer-events-none" aria-hidden />
      <div className="absolute -bottom-24 -left-24 w-[360px] h-[360px] rounded-full border border-white/[0.03] pointer-events-none" aria-hidden />
      <div className="absolute top-1/3 right-1/4 w-[200px] h-[200px] rounded-full border border-white/[0.035] pointer-events-none" aria-hidden />
      <Suspense fallback={<LoginSkeleton />}>
        <LoginContent />
      </Suspense>
    </main>
  )
}
