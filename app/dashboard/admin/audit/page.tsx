import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { AdminAuditLog } from '@/components/dashboard/admin-audit-log'
import { PageHeader } from '@/components/dashboard/page-header'

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
    <div className="animate-in">
      <PageHeader
        title="Audit Log"
        subtitle="Immutable record of all significant platform actions."
      />
      <AdminAuditLog logs={serialized} />
    </div>
  )
}
