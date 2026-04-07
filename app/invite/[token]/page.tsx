import type { Metadata } from 'next'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { cn } from '@/lib/utils'
import type { Role } from '@prisma/client'

export const metadata: Metadata = { title: 'Invitation' }

function RoleBadge({ role }: { role: Role }) {
  const styles: Record<Role, string> = {
    SUPER_ADMIN: 'bg-violet-100 text-violet-700',
    ADMIN:       'bg-[#eeeeff] text-[#2605EF]',
    BUILDER:     'bg-amber-100 text-amber-700',
    VIEWER:      'bg-[#f4f3f3] text-[#64748b]',
  }
  return (
    <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold', styles[role])}>
      {role.replace('_', ' ')}
    </span>
  )
}

export default async function InvitePage({ params }: { params: { token: string } }) {
  const session    = await getServerSession(authOptions)
  const invitation = await prisma.invitation.findUnique({ where: { token: params.token } })

  const isInvalid =
    !invitation ||
    invitation.status === 'USED' ||
    invitation.expiresAt < new Date()

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EEF2FB] p-4">
      <div className="w-full max-w-md rounded-xl border border-[#e2e8f0] bg-white shadow-card p-8">

        {isInvalid ? (
          <>
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-5">
              <span className="text-xl">✗</span>
            </div>
            <h1 className="text-lg font-bold font-display text-[#040B4D] mb-2">
              {!invitation
                ? 'Invitation not found'
                : invitation.status === 'USED'
                ? 'Invitation already used'
                : 'Invitation expired'}
            </h1>
            <p className="text-sm text-[#64748b] mb-6">
              {!invitation
                ? 'This invitation link is invalid or does not exist.'
                : invitation.status === 'USED'
                ? 'This invitation has already been accepted.'
                : 'This invitation link has expired. Ask an admin to send a new one.'}
            </p>
            <Link
              href="/dashboard"
              className="text-sm text-[#2605EF] hover:underline"
            >
              Go to dashboard →
            </Link>
          </>
        ) : (
          <>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-5">
              <span className="text-xl">✉</span>
            </div>
            <h1 className="text-lg font-bold font-display text-[#040B4D] mb-1">You&apos;ve been invited</h1>
            <p className="text-sm text-[#64748b] mb-4">
              You&apos;ve been invited to the CleverProfits Tools platform as{' '}
              <RoleBadge role={invitation.role} />.
            </p>

            {session ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-semibold mb-1">You&apos;re already signed in as {session.user.email}</p>
                <p className="text-xs text-amber-700 mb-3">
                  To apply this invitation, sign out and sign back in with{' '}
                  <strong>{invitation.email}</strong>.
                </p>
                <Link
                  href="/api/auth/signout"
                  className="inline-block rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-amber-700 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
                >
                  Sign out
                </Link>
              </div>
            ) : (
              <>
                <p className="text-xs text-[#94a3b8] mb-5">
                  Sign in with your <strong>@cleverprofits.com</strong> Google account to accept
                  this invitation. Your role will be applied automatically.
                </p>
                <Link
                  href={`/api/auth/signin/google?callbackUrl=/dashboard`}
                  className="block w-full text-center rounded-lg bg-[#2605EF] px-4 py-2.5 text-sm font-semibold font-display text-white hover:bg-[#1e04cc] active:bg-[#1803b3] active:scale-[0.97] shadow-xs transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2605EF] focus-visible:ring-offset-2"
                >
                  Sign in with Google
                </Link>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
