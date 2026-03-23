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

  return <AdminInvitationsList initialInvitations={invitations} />
}
