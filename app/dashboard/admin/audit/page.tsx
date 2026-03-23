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

  return <AdminAuditLog logs={serialized} />
}
