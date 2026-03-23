import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics
//
// Returns usage analytics for all tools. Admin only.
//
// Response:
//   {
//     totalHits30d: number
//     tools: {
//       toolId:    string
//       toolName:  string
//       toolSlug:  string
//       hits30d:   number
//       hitsAllTime: number
//       avgDurationMs: number | null
//     }[]
//   }
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  // All tools (for the table)
  const tools = await prisma.tool.findMany({
    where:   { status: { not: 'DRAFT' } },
    select:  { id: true, name: true, slug: true, status: true },
    orderBy: { name: 'asc' },
  })

  // Hits grouped by toolId in last 30 days
  const hits30d = await prisma.proxyHit.groupBy({
    by: ['toolId'],
    where: { createdAt: { gte: since30d } },
    _count: { id: true },
    _avg:   { durationMs: true },
  })

  // Hits grouped by toolId all time
  const hitsAllTime = await prisma.proxyHit.groupBy({
    by: ['toolId'],
    _count: { id: true },
  })

  // Index for quick lookup
  const hits30dMap     = new Map(hits30d.map((r) => [r.toolId, r]))
  const hitsAllTimeMap = new Map(hitsAllTime.map((r) => [r.toolId, r._count.id]))

  const toolStats = tools.map((t) => {
    const h30     = hits30dMap.get(t.id)
    const allTime = hitsAllTimeMap.get(t.id) ?? 0
    return {
      toolId:        t.id,
      toolName:      t.name,
      toolSlug:      t.slug,
      toolStatus:    t.status,
      hits30d:       h30?._count.id ?? 0,
      hitsAllTime:   allTime,
      avgDurationMs: h30?._avg.durationMs ?? null,
    }
  })

  // Sort by 30d hits descending
  toolStats.sort((a, b) => b.hits30d - a.hits30d)

  const totalHits30d = hits30d.reduce((sum, r) => sum + r._count.id, 0)

  // Daily hit counts for the last 30 days (for a sparkline / chart)
  const dailyHits = await prisma.$queryRaw<{ day: string; count: bigint }[]>`
    SELECT
      DATE_TRUNC('day', "createdAt")::text AS day,
      COUNT(*) AS count
    FROM proxy_hits
    WHERE "createdAt" >= ${since30d}
    GROUP BY DATE_TRUNC('day', "createdAt")
    ORDER BY day ASC
  `

  return NextResponse.json({
    totalHits30d,
    tools: toolStats,
    dailyHits: dailyHits.map((d) => ({
      day:   d.day.slice(0, 10),
      count: Number(d.count),
    })),
  })
}
