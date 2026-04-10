import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ToolsGrid } from '@/components/dashboard/tools-grid'
import { HeroBanner } from '@/components/dashboard/hero-banner'
import { RecentTools } from '@/components/dashboard/recent-tools'
import { OnboardingCard } from '@/components/dashboard/onboarding-card'
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

  // Fetch usage stats: last accessed + 7-day hit count per tool
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const toolIds = rawTools.map((t) => t.id)

  const [lastHits, hitCounts] = await Promise.all([
    // Last hit per tool
    prisma.proxyHit.findMany({
      where: { toolId: { in: toolIds } },
      orderBy: { createdAt: 'desc' },
      distinct: ['toolId'],
      select: { toolId: true, createdAt: true },
    }),
    // 7-day hit counts
    prisma.proxyHit.groupBy({
      by: ['toolId'],
      where: { toolId: { in: toolIds }, createdAt: { gte: sevenDaysAgo } },
      _count: { id: true },
    }),
  ])

  const lastHitMap = new Map(lastHits.map((h) => [h.toolId, h.createdAt.toISOString()]))
  const hitCountMap = new Map(hitCounts.map((h) => [h.toolId, h._count.id]))

  const tools: SerializedTool[] = rawTools.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    lastAccessedAt: lastHitMap.get(t.id) ?? null,
    recentHitCount: hitCountMap.get(t.id) ?? 0,
  }))

  // Recent tools — last 5 distinct tools accessed via proxy
  const recentHits = await prisma.proxyHit.findMany({
    where: { tool: { status: 'ACTIVE' } },
    orderBy: { createdAt: 'desc' },
    distinct: ['toolId'],
    take: 5,
    select: {
      toolId: true,
      toolName: true,
      toolSlug: true,
      createdAt: true,
    },
  })
  const recentTools = recentHits.map((h) => ({
    id: h.toolId,
    name: h.toolName,
    slug: h.toolSlug,
    lastAccessedAt: h.createdAt.toISOString(),
  }))

  // User's own tools count (for onboarding card)
  const userEmail = session?.user?.email ?? ''
  const userToolCount = await prisma.tool.count({
    where: { createdByEmail: userEmail },
  })

  // Favorites for the current user
  const favorites = await prisma.favorite.findMany({
    where: { userEmail },
    select: { toolId: true },
  })
  const favoriteIds = favorites.map((f) => f.toolId)

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

      {/* ── First-time onboarding ─────────────────────────────────────── */}
      <OnboardingCard firstName={firstName} toolCount={userToolCount} />

      {/* ── Recently used tools ─────────────────────────────────────────── */}
      <RecentTools tools={recentTools} />

      {/* ── Tools grid ──────────────────────────────────────────────────── */}
      <Suspense>
        <ToolsGrid
          tools={tools}
          teams={teams}
          currentUserEmail={userEmail}
          favoriteIds={favoriteIds}
        />
      </Suspense>
    </div>
  )
}
