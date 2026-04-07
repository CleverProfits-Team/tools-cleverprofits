import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AdminUsersPanel } from '@/components/dashboard/admin-users-panel'
import type { SerializedUser } from '@/types'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Admin — Users' }

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions)

  const rawUsers = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } })

  const users: SerializedUser[] = rawUsers.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-[#040B4D] tracking-tight">Users</h1>
        <p className="text-sm text-[#64748b] mt-1">Manage team members, roles, and access levels.</p>
      </div>
      <AdminUsersPanel
        initialUsers={users}
        currentUserId={session!.user.id}
        currentUserRole={session!.user.role}
      />
    </div>
  )
}
