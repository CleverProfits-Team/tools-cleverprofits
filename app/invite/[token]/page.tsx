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
    ADMIN:       'bg-blue-100 text-blue-700',
    BUILDER:     'bg-amber-100 text-amber-700',
    VIEWER:      'bg-slate-100 text-slate-600',
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-sm p-8">

        {isInvalid ? (
          <>
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-5">
              <span className="text-xl">✗</span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 mb-2">
              {!invitation
                ? 'Invitation not found'
                : invitation.status === 'USED'
                ? 'Invitation already used'
                : 'Invitation expired'}
            </h1>
            <p className="text-sm text-slate-500 mb-6">
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
            <h1 className="text-lg font-bold text-slate-900 mb-1">You&apos;ve been invited</h1>
            <p className="text-sm text-slate-500 mb-4">
              You&apos;ve been invited to the CleverProfits Tools platform as{' '}
              <RoleBadge role={invitation.role} />.
            </p>

            {session ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-medium mb-1">You&apos;re already signed in as {session.user.email}</p>
                <p className="text-xs text-amber-700 mb-3">
                  To apply this invitation, sign out and sign back in with{' '}
                  <strong>{invitation.email}</strong>.
                </p>
                <Link
                  href="/api/auth/signout"
                  className="inline-block rounded-md bg-amber-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors"
                >
                  Sign out
                </Link>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-400 mb-5">
                  Sign in with your <strong>@cleverprofits.com</strong> Google account to accept
                  this invitation. Your role will be applied automatically.
                </p>
                <Link
                  href={`/api/auth/signin/google?callbackUrl=/dashboard`}
                  className="block w-full text-center rounded-md bg-[#2605EF] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1e04cc] transition-colors"
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
