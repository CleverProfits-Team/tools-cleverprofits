import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { AdminInvitationsList } from '@/components/dashboard/admin-invitations-list'
import { PageHeader } from '@/components/dashboard/page-header'
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
    <div className="animate-in">
      <PageHeader
        title="Invitations"
        subtitle="Invite new team members and manage pending invitations."
      />
      <AdminInvitationsList initialInvitations={invitations} />
    </div>
  )
}
