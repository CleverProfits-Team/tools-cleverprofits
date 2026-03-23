import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AdminSubNav } from '@/components/dashboard/admin-sub-nav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role

  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    redirect('/dashboard')
  }

  const pendingCount = await prisma.tool.count({ where: { status: 'PENDING' } })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admin</h1>
        <p className="text-sm text-slate-500 mt-1">Manage tools, users, and invitations</p>
      </div>
      <AdminSubNav pendingCount={pendingCount} />
      {children}
    </div>
  )
}
