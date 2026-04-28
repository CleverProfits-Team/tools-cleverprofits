import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { BarChart2, TrendingUp, Zap, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/dashboard/page-header'

export const metadata: Metadata = { title: 'Analytics' }
export const dynamic = 'force-dynamic'

function formatDuration(ms: number | null): string {
  if (ms === null) return '—'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatChartDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function TrendBadge({ curr, prev }: { curr: number; prev: number }) {
  if (prev === 0 && curr === 0) return null
  if (prev === 0) return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 rounded-full px-1.5 py-0.5">
      New
    </span>
  )
  const pct = Math.round(((curr - prev) / prev) * 100)
  if (pct === 0) return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-400 bg-slate-100 rounded-full px-1.5 py-0.5">
      <Minus className="h-2.5 w-2.5" />
      0%
    </span>
  )
  const up = pct > 0
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-[10px] font-semibold rounded-full px-1.5 py-0.5',
      up ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50',
    )}>
      {up ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
      {up ? '+' : ''}{pct}%
    </span>
  )
}

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') redirect('/dashboard')

  const now = Date.now()
  const since30d = new Date(now - 30 * 24 * 60 * 60 * 1000)
  const since60d = new Date(now - 60 * 24 * 60 * 60 * 1000)

  const tools = await prisma.tool.findMany({
    select: { id: true, name: true, slug: true, status: true },
    orderBy: { name: 'asc' },
  })

  const [hits30d, hitsPrev30d, hitsAllTime] = await Promise.all([
    prisma.proxyHit.groupBy({
      by: ['toolId'],
      where: { createdAt: { gte: since30d } },
      _count: { id: true },
      _avg:   { durationMs: true },
    }),
    prisma.proxyHit.groupBy({
      by: ['toolId'],
      where: { createdAt: { gte: since60d, lt: since30d } },
      _count: { id: true },
    }),
    prisma.proxyHit.groupBy({
      by: ['toolId'],
      _count: { id: true },
    }),
  ])

  const hits30dMap     = new Map(hits30d.map((r) => [r.toolId, r]))
  const hitsPrev30dMap = new Map(hitsPrev30d.map((r) => [r.toolId, r._count.id]))
  const hitsAllTimeMap = new Map(hitsAllTime.map((r) => [r.toolId, r._count.id]))

  const toolStats = tools
    .map((t) => {
      const h30     = hits30dMap.get(t.id)
      const allTime = hitsAllTimeMap.get(t.id) ?? 0
      const prev    = hitsPrev30dMap.get(t.id) ?? 0
      return {
        ...t,
        hits30d:       h30?._count.id ?? 0,
        hitsPrev30d:   prev,
        hitsAllTime:   allTime,
        avgDurationMs: h30?._avg.durationMs ?? null,
      }
    })
    .sort((a, b) => b.hits30d - a.hits30d)

  const totalHits30d  = hits30d.reduce((s, r) => s + r._count.id, 0)
  const totalPrev30d  = hitsPrev30d.reduce((s, r) => s + r._count.id, 0)
  const totalHitsAll  = hitsAllTime.reduce((s, r) => s + r._count.id, 0)
  const topTool       = toolStats[0]
  const activeTools   = toolStats.filter((t) => t.hits30d > 0).length
  const prevActive    = toolStats.filter((t) => t.hitsPrev30d > 0).length

  const dailyHits = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
    SELECT
      DATE_TRUNC('day', "createdAt") AS day,
      COUNT(*) AS count
    FROM proxy_hits
    WHERE "createdAt" >= ${since30d}
    GROUP BY DATE_TRUNC('day', "createdAt")
    ORDER BY day ASC
  `

  const dayMap = new Map(
    dailyHits.map((d) => [d.day.toISOString().slice(0, 10), Number(d.count)])
  )
  const days: { day: string; count: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d   = new Date(now - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    days.push({ day: key, count: dayMap.get(key) ?? 0 })
  }

  const maxCount = Math.max(...days.map((d) => d.count), 1)
  const maxHits30d = Math.max(...toolStats.map((t) => t.hits30d), 1)

  return (
    <div className="animate-in">
      <PageHeader
        label="OPERATIONAL INTELLIGENCE"
        title="Usage Analytics"
        subtitle="Track tool adoption and performance across CleverProfits teams."
      />

      {/* ── KPI cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-2xl shadow-[0_20px_40px_rgba(15,0,56,0.06)] p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Hits (30d)</p>
            <div className="h-8 w-8 rounded-lg bg-[#eeeeff] flex items-center justify-center">
              <BarChart2 className="h-4 w-4 text-[#2605EF]" aria-hidden />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-slate-900 tabular-nums">{totalHits30d.toLocaleString()}</p>
            <div className="mb-1">
              <TrendBadge curr={totalHits30d} prev={totalPrev30d} />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">vs prior 30 days</p>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_20px_40px_rgba(15,0,56,0.06)] p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">All-time</p>
            <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center">
              <Zap className="h-4 w-4 text-slate-500" aria-hidden />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 tabular-nums">{totalHitsAll.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">total requests</p>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_20px_40px_rgba(15,0,56,0.06)] p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Active Tools</p>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-emerald-500" aria-hidden />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-slate-900 tabular-nums">{activeTools}</p>
            <div className="mb-1">
              <TrendBadge curr={activeTools} prev={prevActive} />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">used in last 30 days</p>
        </div>
      </div>

      {/* ── Top tool insight ────────────────────────────────────────── */}
      {topTool && topTool.hits30d > 0 && (
        <div className="flex items-center gap-3 bg-[#0F0038]/[0.03] border border-[#0F0038]/[0.08] rounded-xl px-4 py-3 mb-8">
          <div className="h-7 w-7 rounded-lg bg-[#2605EF] flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-3.5 w-3.5 text-white" aria-hidden />
          </div>
          <p className="text-sm text-slate-600">
            <span className="text-slate-400">Most used in last 30 days — </span>
            <Link href={`/tools/${topTool.slug}`} className="font-semibold text-[#0F0038] hover:text-[#2605EF] transition-colors">
              {topTool.name}
            </Link>
            <span className="text-slate-400"> with </span>
            <span className="font-semibold text-slate-700">{topTool.hits30d.toLocaleString()} requests</span>
          </p>
        </div>
      )}

      {/* ── 30-day chart ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-[0_20px_40px_rgba(15,0,56,0.06)] p-6 mb-6">
        <h2 className="text-sm font-semibold text-[#0F0038] mb-5">Requests — last 30 days</h2>
        {totalHits30d === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No requests recorded yet.</p>
        ) : (
          <div className="flex items-end gap-[3px] h-36">
            {days.map(({ day, count }) => (
              <div
                key={day}
                title={`${formatChartDate(day)}: ${count.toLocaleString()} request${count !== 1 ? 's' : ''}`}
                className="flex-1 rounded-t bg-[#2605EF] opacity-60 hover:opacity-100 transition-opacity duration-100 min-h-[2px] cursor-default"
                style={{ height: `${Math.max(2, (count / maxCount) * 100)}%` }}
              />
            ))}
          </div>
        )}
        <div className="flex justify-between mt-2 text-[10px] text-slate-300 font-medium">
          <span>{formatChartDate(days[0]?.day ?? '')}</span>
          <span>{formatChartDate(days[days.length - 1]?.day ?? '')}</span>
        </div>
      </div>

      {/* ── Per-tool table ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-[0_20px_40px_rgba(15,0,56,0.06)] overflow-hidden">
        <div className="px-6 py-4 bg-[#f4f3f3] rounded-t-2xl">
          <h2 className="text-sm font-semibold text-[#0F0038]">Tool breakdown</h2>
          <p className="text-xs text-slate-400 mt-0.5">Sorted by 30-day activity</p>
        </div>

        {toolStats.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-12">No tools registered.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f9f9f9]">
                <th className="text-left px-6 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tool</th>
                <th className="text-right px-6 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">30d activity</th>
                <th className="text-right px-6 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">All-time</th>
                <th className="text-right px-6 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Avg latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f4f3f3]">
              {toolStats.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-3.5">
                    <Link href={`/tools/${t.slug}`} className="font-semibold text-[#0F0038] hover:text-[#2605EF] transition-colors">
                      {t.name}
                    </Link>
                    <span className="ml-2 text-xs font-mono text-slate-300">/{t.slug}</span>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center justify-end gap-3">
                      {t.hits30d > 0 && (
                        <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden hidden sm:block">
                          <div
                            className="h-full rounded-full bg-[#2605EF]"
                            style={{ width: `${(t.hits30d / maxHits30d) * 100}%` }}
                          />
                        </div>
                      )}
                      <span className="tabular-nums font-semibold text-slate-700 w-12 text-right">
                        {t.hits30d > 0 ? t.hits30d.toLocaleString() : <span className="text-slate-300 font-normal">—</span>}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-right tabular-nums text-slate-400">
                    {t.hitsAllTime > 0 ? t.hitsAllTime.toLocaleString() : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-6 py-3.5 text-right text-slate-400">
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
