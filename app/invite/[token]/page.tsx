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
    SUPER_ADMIN: 'bg-[rgba(38,5,239,0.10)] text-[#2605EF]',
    ADMIN:       'bg-[rgba(38,5,239,0.10)] text-[#2605EF]',
    BUILDER:     'bg-[rgba(245,158,11,0.10)] text-[#92400E]',
    VIEWER:      'bg-[#E7E7E7] text-[rgba(15,0,56,0.65)]',
  }
  return (
    <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em] whitespace-nowrap', styles[role])}>
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
      <div className="w-full max-w-md rounded-2xl border border-[#E7E7E7] bg-white shadow-card p-8">

        {isInvalid ? (
          <>
            <div className="h-12 w-12 rounded-full bg-[rgba(239,68,68,0.10)] flex items-center justify-center mb-5">
              <span className="text-xl text-[#EF4444]">✗</span>
            </div>
            <h1 className="text-lg font-bold text-[#0F0038] tracking-[-0.02em] mb-2">
              {!invitation
                ? 'Invitation not found'
                : invitation.status === 'USED'
                ? 'Invitation already used'
                : 'Invitation expired'}
            </h1>
            <p className="text-sm text-[rgba(15,0,56,0.55)] mb-6">
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
            <div className="h-12 w-12 rounded-full bg-[rgba(38,5,239,0.10)] flex items-center justify-center mb-5">
              <span className="text-xl text-[#2605EF]">✉</span>
            </div>
            <h1 className="text-lg font-bold text-[#0F0038] tracking-[-0.02em] mb-1">You&apos;ve been invited</h1>
            <p className="text-sm text-[rgba(15,0,56,0.55)] mb-4">
              You&apos;ve been invited to the CleverProfits Tools platform as{' '}
              <RoleBadge role={invitation.role} />.
            </p>

            {session ? (
              <div className="rounded-lg border border-amber-200 bg-[rgba(245,158,11,0.10)] p-4 text-sm text-[#92400E]">
                <p className="font-medium mb-1">You&apos;re already signed in as {session.user.email}</p>
                <p className="text-xs text-[#92400E] mb-3">
                  To apply this invitation, sign out and sign back in with{' '}
                  <strong>{invitation.email}</strong>.
                </p>
                <Link
                  href="/api/auth/signout"
                  className="inline-block rounded-lg bg-[#F59E0B] px-4 py-1.5 text-xs font-bold text-white hover:opacity-90 shadow-md transition-colors whitespace-nowrap"
                >
                  Sign out
                </Link>
              </div>
            ) : (
              <>
                <p className="text-xs text-[rgba(15,0,56,0.40)] mb-5">
                  Sign in with your <strong>@cleverprofits.com</strong> Google account to accept
                  this invitation. Your role will be applied automatically.
                </p>
                <Link
                  href={`/api/auth/signin/google?callbackUrl=/dashboard`}
                  className="block w-full text-center rounded-lg bg-[#2605EF] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1E04C7] shadow-md transition-colors"
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
