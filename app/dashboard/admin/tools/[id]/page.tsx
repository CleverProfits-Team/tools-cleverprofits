import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AdminToolDetail } from '@/components/dashboard/admin-tool-detail'
import type { SerializedTool } from '@/types'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Admin — Tool Review' }

export default async function AdminToolDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  const raw = await prisma.tool.findUnique({ where: { id: params.id } })
  if (!raw) notFound()

  const tool: SerializedTool = {
    ...raw,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
  }

  return (
    <AdminToolDetail
      tool={tool}
      currentUserEmail={session!.user.email}
      currentUserRole={session!.user.role}
    />
  )
}
