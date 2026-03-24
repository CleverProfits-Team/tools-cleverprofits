import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { AdminAuditLog } from '@/components/dashboard/admin-audit-log'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Admin — Audit Log' }

export default async function AdminAuditPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  const serialized = logs.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-[#040B4D] tracking-tight">Audit Log</h1>
        <p className="text-sm text-slate-500 mt-1">Immutable record of all significant platform actions.</p>
      </div>
      <AdminAuditLog logs={serialized} />
    </div>
  )
}
