import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, Users, Layers, TrendingDown, GitBranch, Cpu } from 'lucide-react'
import { prisma } from '@/lib/db'
import { BubbleMap } from '@/components/dashboard/bubble-map'
import { PageHeader } from '@/components/dashboard/page-header'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Insights · Admin' }

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─────────────────────────────────────────────────────────────────────────────
// Data fetching
// ─────────────────────────────────────────────────────────────────────────────

async function getInsightsData() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [
    allActiveTools,
    recentHitToolIds,
    ownerlessTools,
    categoryRows,
    frameworkRows,
    toolsWithOverlap,
  ] = await Promise.all([

    // All ACTIVE tools
    prisma.tool.findMany({
      where:   { status: 'ACTIVE' },
      select:  { id: true, name: true, slug: true, team: true, createdByName: true, createdByEmail: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),

    // Tool IDs with at least 1 hit in the last 30 days
    prisma.proxyHit.findMany({
      where:    { createdAt: { gte: thirtyDaysAgo } },
      select:   { toolId: true },
      distinct: ['toolId'],
    }),

    // ACTIVE or PENDING tools without a team
    prisma.tool.findMany({
      where:   { status: { in: ['ACTIVE', 'PENDING'] }, team: null },
      select:  { id: true, name: true, slug: true, status: true, createdByName: true, createdByEmail: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),

    // Category breakdown
    prisma.tool.groupBy({
      by:      ['aiCategory'],
      where:   { status: { not: 'DRAFT' }, aiCategory: { not: null } },
      _count:  { aiCategory: true },
      orderBy: { _count: { aiCategory: 'desc' } },
    }),

    // Framework/Tech breakdown
    prisma.tool.groupBy({
      by:      ['aiFrameworkGuess'],
      where:   { status: { not: 'DRAFT' }, aiFrameworkGuess: { not: null } },
      _count:  { aiFrameworkGuess: true },
      orderBy: { _count: { aiFrameworkGuess: 'desc' } },
    }),

    // Tools with AI overlap warnings
    prisma.tool.findMany({
      where:   { status: { not: 'DRAFT' } },
      select:  { id: true, name: true, slug: true, aiOverlapWarnings: true },
    }),
  ])

  const activeWithHitsSet = new Set(recentHitToolIds.map((h) => h.toolId))
  const abandonedTools    = allActiveTools.filter((t) => !activeWithHitsSet.has(t.id))

  const overlapClusters = toolsWithOverlap
    .filter((t) => Array.isArray(t.aiOverlapWarnings) && (t.aiOverlapWarnings as string[]).length > 0)
    .map((t) => ({ id: t.id, name: t.name, slug: t.slug, overlaps: t.aiOverlapWarnings as string[] }))

  return {
    allActiveTools,
    activeHitIds:  [...activeWithHitsSet],
    abandonedTools,
    ownerlessTools,
    overlapClusters,
    categoryRows:  categoryRows.map((r) => ({ name: r.aiCategory!, count: r._count.aiCategory })),
    frameworkRows: frameworkRows.map((r) => ({ name: r.aiFrameworkGuess!, count: r._count.aiFrameworkGuess })),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SummaryCard({
  label, value, description, icon: Icon, color,
}: {
  label: string
  value: number
  description: string
  icon: React.FC<{ className?: string }>
  color: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E7E7E7] shadow-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover group">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-[rgba(15,0,56,0.40)] uppercase tracking-widest">{label}</p>
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="font-display text-3xl font-bold text-[#0F0038] tracking-[-0.02em] tabular-nums">{value}</p>
      <p className="text-xs text-[rgba(15,0,56,0.40)] mt-1">{description}</p>
    </div>
  )
}

function DistributionBar({
  rows, maxCount, colorClass,
}: {
  rows: { name: string; count: number }[]
  maxCount: number
  colorClass: string
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-[rgba(15,0,56,0.40)] py-4 text-center">No data yet</p>
  }
  return (
    <div className="space-y-2.5">
      {rows.map(({ name, count }) => (
        <div key={name} className="flex items-center gap-3">
          <span className="text-sm text-[#0F0038] capitalize w-36 flex-shrink-0 truncate">{name}</span>
          <div className="flex-1 bg-[#E7E7E7] rounded-full h-2">
            <div
              className={`h-2 rounded-full ${colorClass}`}
              style={{ width: `${Math.round((count / maxCount) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-[rgba(15,0,56,0.40)] w-6 text-right tabular-nums">{count}</span>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function InsightsPage() {
  const { allActiveTools, activeHitIds, abandonedTools, ownerlessTools, overlapClusters, categoryRows, frameworkRows } = await getInsightsData()

  const maxCategoryCount  = Math.max(1, ...categoryRows.map((r) => r.count))
  const maxFrameworkCount = Math.max(1, ...frameworkRows.map((r) => r.count))
  const activeHitSet      = new Set(activeHitIds)

  const bubbleTools = allActiveTools.map((t) => ({
    id:           t.id,
    name:         t.name,
    slug:         t.slug,
    hasRecentHit: activeHitSet.has(t.id),
  }))

  return (
    <div className="space-y-8 animate-in">
      <PageHeader
        label="INTELLIGENCE LAYER"
        title="Insights"
        subtitle="Organizational intelligence — tool health, usage patterns, and gaps."
      />

      {/* Tool ecosystem map */}
      {allActiveTools.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E7E7E7] shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#0F0038]">Tool Ecosystem</h2>
              <p className="text-xs text-[rgba(15,0,56,0.40)] mt-0.5">
                {activeHitIds.length} of {allActiveTools.length} tools active in the last 30 days
              </p>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(15,0,56,0.32)]">Live map</span>
          </div>
          <BubbleMap
            tools={bubbleTools}
            activeHitIds={activeHitIds}
          />
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Abandoned"
          value={abandonedTools.length}
          description="active, 0 hits in 30d"
          icon={TrendingDown}
          color="bg-[rgba(245,158,11,0.10)] text-[#F59E0B]"
        />
        <SummaryCard
          label="Ownerless"
          value={ownerlessTools.length}
          description="no team assigned"
          icon={Users}
          color="bg-[rgba(245,158,11,0.10)] text-[#F59E0B]"
        />
        <SummaryCard
          label="Overlap Clusters"
          value={overlapClusters.length}
          description="AI-flagged duplicates"
          icon={Layers}
          color="bg-[rgba(38,5,239,0.10)] text-[#2605EF]"
        />
        <SummaryCard
          label="Frameworks"
          value={frameworkRows.length}
          description="distinct tech detected"
          icon={Cpu}
          color="bg-[rgba(38,5,239,0.10)] text-[#2605EF]"
        />
      </div>

      {/* Category + Framework distributions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-2xl border border-[#E7E7E7] shadow-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <GitBranch className="h-4 w-4 text-[rgba(15,0,56,0.40)]" aria-hidden />
            <h2 className="text-sm font-semibold text-[#0F0038]">Tool Categories</h2>
          </div>
          <DistributionBar rows={categoryRows} maxCount={maxCategoryCount} colorClass="bg-[#2605EF]" />
        </div>
        <div className="bg-white rounded-2xl border border-[#E7E7E7] shadow-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Cpu className="h-4 w-4 text-[rgba(15,0,56,0.40)]" aria-hidden />
            <h2 className="text-sm font-semibold text-[#0F0038]">Frameworks & Tech</h2>
          </div>
          <DistributionBar rows={frameworkRows} maxCount={maxFrameworkCount} colorClass="bg-[#2605EF]" />
        </div>
      </div>

      {/* Abandoned tools */}
      <div className="bg-white rounded-2xl border border-[#E7E7E7] shadow-card p-6">
        <div className="flex items-center gap-2 mb-1">
          <TrendingDown className="h-4 w-4 text-[#F59E0B]" aria-hidden />
          <h2 className="text-sm font-semibold text-[#0F0038]">Abandoned Tools</h2>
          {abandonedTools.length > 0 && (
            <span className="ml-auto text-xs text-[#92400E] font-medium bg-[rgba(245,158,11,0.10)] rounded-full px-2 py-0.5">
              {abandonedTools.length} tools
            </span>
          )}
        </div>
        <p className="text-xs text-[rgba(15,0,56,0.40)] mb-4">Active tools with no proxy hits in the last 30 days</p>

        {abandonedTools.length === 0 ? (
          <p className="text-sm text-[rgba(15,0,56,0.40)] py-4 text-center">All active tools have recent activity.</p>
        ) : (
          <div className="divide-y divide-[#FAFAFA]">
            {abandonedTools.map((tool) => (
              <div key={tool.id} className="py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/dashboard/admin/tools/${tool.id}`}
                    className="text-sm font-medium text-[#0F0038] hover:text-[#2605EF] hover:underline"
                  >
                    {tool.name}
                  </Link>
                  <p className="text-xs text-[rgba(15,0,56,0.40)] mt-0.5">
                    {tool.team ? `Team: ${tool.team}` : 'No team'} · {tool.createdByName} · since {formatDate(tool.createdAt)}
                  </p>
                </div>
                <Link
                  href={`/dashboard/admin/tools/${tool.id}`}
                  className="text-xs font-medium text-[rgba(15,0,56,0.40)] hover:text-[#2605EF] flex-shrink-0"
                >
                  Review →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ownerless tools */}
      <div className="bg-white rounded-2xl border border-[#E7E7E7] shadow-card p-6">
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-4 w-4 text-[#F59E0B]" aria-hidden />
          <h2 className="text-sm font-semibold text-[#0F0038]">Ownerless Tools</h2>
          {ownerlessTools.length > 0 && (
            <span className="ml-auto text-xs text-[#92400E] font-medium bg-[rgba(245,158,11,0.10)] rounded-full px-2 py-0.5">
              {ownerlessTools.length} tools
            </span>
          )}
        </div>
        <p className="text-xs text-[rgba(15,0,56,0.40)] mb-4">Active or pending tools with no team assigned</p>

        {ownerlessTools.length === 0 ? (
          <p className="text-sm text-[rgba(15,0,56,0.40)] py-4 text-center">All tools have a team assigned.</p>
        ) : (
          <div className="divide-y divide-[#FAFAFA]">
            {ownerlessTools.map((tool) => (
              <div key={tool.id} className="py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/admin/tools/${tool.id}`}
                      className="text-sm font-medium text-[#0F0038] hover:text-[#2605EF] hover:underline"
                    >
                      {tool.name}
                    </Link>
                    <span className={`text-[11px] rounded-full px-1.5 py-0.5 font-semibold uppercase tracking-[0.04em] whitespace-nowrap ${
                      tool.status === 'ACTIVE' ? 'bg-[rgba(16,185,129,0.10)] text-[#065F46]' : 'bg-[rgba(245,158,11,0.10)] text-[#92400E]'
                    }`}>
                      {tool.status}
                    </span>
                  </div>
                  <p className="text-xs text-[rgba(15,0,56,0.40)] mt-0.5">
                    {tool.createdByName} ({tool.createdByEmail})
                  </p>
                </div>
                <Link
                  href={`/dashboard/tools/${tool.id}/edit`}
                  className="text-xs font-medium text-[#2605EF] hover:underline flex-shrink-0"
                >
                  Assign team →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Overlap clusters */}
      {overlapClusters.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E7E7E7] shadow-card p-6">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-[#2605EF]" aria-hidden />
            <h2 className="text-sm font-semibold text-[#0F0038]">Potential Overlap Clusters</h2>
            <span className="ml-auto text-xs text-[#2605EF] font-medium bg-[rgba(38,5,239,0.10)] rounded-full px-2 py-0.5">
              {overlapClusters.length} tools
            </span>
          </div>
          <p className="text-xs text-[rgba(15,0,56,0.40)] mb-4">Tools that AI flagged as potentially duplicating existing tools</p>
          <div className="divide-y divide-[#FAFAFA]">
            {overlapClusters.map((tool) => (
              <div key={tool.id} className="py-3">
                <div className="flex items-center gap-3 mb-1">
                  <Link
                    href={`/dashboard/admin/tools/${tool.id}`}
                    className="text-sm font-medium text-[#0F0038] hover:text-[#2605EF] hover:underline"
                  >
                    {tool.name}
                  </Link>
                  <span className="text-xs text-[rgba(15,0,56,0.40)]">may overlap with:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tool.overlaps.map((name, i) => (
                    <span key={i} className="text-xs bg-[rgba(38,5,239,0.10)] text-[#2605EF] rounded-md px-2 py-0.5 font-medium">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
