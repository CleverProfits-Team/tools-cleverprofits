import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AdminToolsList } from '@/components/dashboard/admin-tools-list'
import type { SerializedTool } from '@/types'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Admin — Tools' }

export default async function AdminToolsPage() {
  const session = await getServerSession(authOptions)

  const rawTools = await prisma.tool.findMany({
    include: { tags: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const tools: SerializedTool[] = rawTools.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }))

  const teams = [...new Set(rawTools.map((t) => t.team).filter(Boolean))] as string[]

  return <AdminToolsList initialTools={tools} teams={teams} />
}
