import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { BarChart2, TrendingUp, Zap } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Analytics' }
export const dynamic = 'force-dynamic'

function formatDuration(ms: number | null): string {
  if (ms === null) return '—'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') redirect('/dashboard')

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const tools = await prisma.tool.findMany({
    select: { id: true, name: true, slug: true, status: true },
    orderBy: { name: 'asc' },
  })

  const hits30d = await prisma.proxyHit.groupBy({
    by: ['toolId'],
    where: { createdAt: { gte: since30d } },
    _count: { id: true },
    _avg:   { durationMs: true },
  })

  const hitsAllTime = await prisma.proxyHit.groupBy({
    by: ['toolId'],
    _count: { id: true },
  })

  const hits30dMap     = new Map(hits30d.map((r) => [r.toolId, r]))
  const hitsAllTimeMap = new Map(hitsAllTime.map((r) => [r.toolId, r._count.id]))

  const toolStats = tools
    .map((t) => {
      const h30     = hits30dMap.get(t.id)
      const allTime = hitsAllTimeMap.get(t.id) ?? 0
      return {
        ...t,
        hits30d:       h30?._count.id ?? 0,
        hitsAllTime:   allTime,
        avgDurationMs: h30?._avg.durationMs ?? null,
      }
    })
    .sort((a, b) => b.hits30d - a.hits30d)

  const totalHits30d  = hits30d.reduce((s, r) => s + r._count.id, 0)
  const totalHitsAll  = hitsAllTime.reduce((s, r) => s + r._count.id, 0)
  const topTool       = toolStats[0]
  const activeTools   = toolStats.filter((t) => t.hits30d > 0).length

  // Daily hits last 30 days
  const dailyHits = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
    SELECT
      DATE_TRUNC('day', "createdAt") AS day,
      COUNT(*) AS count
    FROM proxy_hits
    WHERE "createdAt" >= ${since30d}
    GROUP BY DATE_TRUNC('day', "createdAt")
    ORDER BY day ASC
  `

  // Build a full 30-day array (fill missing days with 0)
  const dayMap = new Map(
    dailyHits.map((d) => [d.day.toISOString().slice(0, 10), Number(d.count)])
  )
  const days: { day: string; count: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d   = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    days.push({ day: key, count: dayMap.get(key) ?? 0 })
  }

  const maxCount = Math.max(...days.map((d) => d.count), 1)

  return (
    <div>
      {/* ── Stat cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 className="h-3.5 w-3.5 text-slate-400" aria-hidden />
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Hits (30d)</p>
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{totalHits30d.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-3.5 w-3.5 text-slate-400" aria-hidden />
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">All-time</p>
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{totalHitsAll.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-3.5 w-3.5 text-slate-400" aria-hidden />
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Active Tools</p>
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{activeTools}</p>
          {topTool && topTool.hits30d > 0 && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">Top: {topTool.name}</p>
          )}
        </div>
      </div>

      {/* ── 30-day sparkline ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Requests — last 30 days</h2>
        {totalHits30d === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No requests recorded yet.</p>
        ) : (
          <div className="flex items-end gap-0.5 h-24">
            {days.map(({ day, count }) => (
              <div
                key={day}
                title={`${day}: ${count} request${count !== 1 ? 's' : ''}`}
                className="flex-1 rounded-t-sm bg-blue-500 opacity-80 hover:opacity-100 transition-opacity min-h-[2px]"
                style={{ height: `${Math.max(2, (count / maxCount) * 100)}%` }}
              />
            ))}
          </div>
        )}
        <div className="flex justify-between mt-1.5 text-[10px] text-slate-300">
          <span>{days[0]?.day}</span>
          <span>{days[days.length - 1]?.day}</span>
        </div>
      </div>

      {/* ── Per-tool table ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Tool breakdown</h2>
        </div>

        {toolStats.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-12">No tools registered.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tool</th>
                <th className="text-right px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">30d hits</th>
                <th className="text-right px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">All-time</th>
                <th className="text-right px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Avg latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {toolStats.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3">
                    <Link href={`/tools/${t.slug}`} className="font-medium text-slate-900 hover:text-[#2605EF] transition-colors">
                      {t.name}
                    </Link>
                    <span className="ml-2 text-xs font-mono text-slate-400">/{t.slug}</span>
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums font-medium text-slate-700">
                    {t.hits30d > 0 ? t.hits30d.toLocaleString() : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums text-slate-500">
                    {t.hitsAllTime > 0 ? t.hitsAllTime.toLocaleString() : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-500">
                    {formatDuration(t.avgDurationMs)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
