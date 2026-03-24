import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ToolsGrid } from '@/components/dashboard/tools-grid'
import { HeroBanner } from '@/components/dashboard/hero-banner'
import type { SerializedTool } from '@/types'

export const metadata: Metadata = { title: 'Dashboard' }
export const revalidate = 60

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  const rawTools = await prisma.tool.findMany({
    where:   { status: { not: 'DRAFT' } },
    include: { tags: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const tools: SerializedTool[] = rawTools.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }))

  const teams        = [...new Set(rawTools.map((t) => t.team).filter(Boolean))].sort() as string[]
  const activeCount  = rawTools.filter((t) => t.status === 'ACTIVE').length
  const pendingCount = rawTools.filter((t) => t.status === 'PENDING').length
  const firstName    = session?.user?.name?.split(' ')[0] ?? ''

  return (
    <div className="animate-in">
      <HeroBanner
        firstName={firstName}
        activeCount={activeCount}
        pendingCount={pendingCount}
        totalCount={tools.length}
      />

      {/* ── Tools grid ──────────────────────────────────────────────────── */}
      <Suspense>
        <ToolsGrid
          tools={tools}
          teams={teams}
          currentUserEmail={session?.user?.email ?? ''}
        />
      </Suspense>
    </div>
  )
}
