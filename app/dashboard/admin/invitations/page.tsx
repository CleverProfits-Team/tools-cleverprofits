import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { AdminInvitationsList } from '@/components/dashboard/admin-invitations-list'
import type { SerializedInvitation } from '@/types'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Admin — Invitations' }

export default async function AdminInvitationsPage() {
  const rawInvitations = await prisma.invitation.findMany({ orderBy: { createdAt: 'desc' } })

  const invitations: SerializedInvitation[] = rawInvitations.map((inv) => ({
    ...inv,
    createdAt: inv.createdAt.toISOString(),
    expiresAt: inv.expiresAt.toISOString(),
    usedAt:    inv.usedAt?.toISOString() ?? null,
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-[#040B4D] tracking-tight">Invitations</h1>
        <p className="text-sm text-[#64748b] mt-1">Invite new team members and manage pending invitations.</p>
      </div>
      <AdminInvitationsList initialInvitations={invitations} />
    </div>
  )
}
