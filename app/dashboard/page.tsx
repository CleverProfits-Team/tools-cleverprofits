import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ToolsGrid } from '@/components/dashboard/tools-grid'
import { Button } from '@/components/ui/button'
import { PlusCircle, CheckCircle2, Clock, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SerializedTool } from '@/types'

export const metadata: Metadata = { title: 'Dashboard' }

// Revalidate every 60 s so the list stays fresh without needing a full
// navigation. Individual tool state changes are reflected within a minute.
export const revalidate = 60

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  // Fetch all tools, newest first.
  // Querying directly from Prisma (not via the API route) avoids a round-trip
  // HTTP call and is faster for server-rendered pages.
  const rawTools = await prisma.tool.findMany({
    where:   { status: { not: 'DRAFT' } },
    include: { tags: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  // Serialize Date → string before passing to Client Components
  const tools: SerializedTool[] = rawTools.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }))

  // Pre-compute unique teams for the filter dropdown (avoids re-computing in client)
  const teams = [
    ...new Set(rawTools.map((t) => t.team).filter(Boolean)),
  ].sort() as string[]

  // Quick stats for the header
  const activeCount  = rawTools.filter((t) => t.status === 'ACTIVE').length
  const pendingCount = rawTools.filter((t) => t.status === 'PENDING').length

  return (
    <div>
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-[#040B4D] tracking-tight">
            Your tools
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Launch, manage, and scale internal tools across CleverProfits teams.
          </p>
        </div>

        <Button asChild size="md">
          <Link href="/dashboard/register">
            <PlusCircle className="h-4 w-4" aria-hidden />
            Register Tool
          </Link>
        </Button>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────── */}
      {tools.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          {/* Active */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Active</p>
              <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 tabular-nums">{activeCount}</p>
            <p className="text-xs text-slate-400 mt-1">tools live</p>
          </div>

          {/* Pending */}
          <div className={cn(
            'rounded-2xl border shadow-card p-5',
            pendingCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200/80',
          )}>
            <div className="flex items-center justify-between mb-3">
              <p className={cn(
                'text-xs font-semibold uppercase tracking-widest',
                pendingCount > 0 ? 'text-amber-500' : 'text-slate-400',
              )}>Pending</p>
              <div className={cn(
                'h-8 w-8 rounded-lg flex items-center justify-center',
                pendingCount > 0 ? 'bg-amber-100' : 'bg-slate-50',
              )}>
                <Clock className={cn('h-4 w-4', pendingCount > 0 ? 'text-amber-500' : 'text-slate-400')} aria-hidden />
              </div>
            </div>
            <p className={cn(
              'text-3xl font-bold tabular-nums',
              pendingCount > 0 ? 'text-amber-700' : 'text-slate-900',
            )}>{pendingCount}</p>
            <p className={cn('text-xs mt-1', pendingCount > 0 ? 'text-amber-500' : 'text-slate-400')}>
              awaiting review
            </p>
          </div>

          {/* Total */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Total</p>
              <div className="h-8 w-8 rounded-lg bg-[#040B4D]/5 flex items-center justify-center">
                <Package className="h-4 w-4 text-[#040B4D]/60" aria-hidden />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 tabular-nums">{tools.length}</p>
            <p className="text-xs text-slate-400 mt-1">registered</p>
          </div>
        </div>
      )}

      {/* ── Tools grid (client component for search + filter) ────────── */}
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
