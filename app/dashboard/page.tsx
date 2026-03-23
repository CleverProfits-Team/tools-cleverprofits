import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ToolsGrid } from '@/components/dashboard/tools-grid'
import { Button } from '@/components/ui/button'
import { PlusCircle } from 'lucide-react'
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Tools
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse and launch your team&apos;s registered tools.
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
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card px-5 py-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Active</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{activeCount}</p>
          </div>
          <div className={cn(
            'rounded-2xl border shadow-card px-5 py-4',
            pendingCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200/80',
          )}>
            <p className={cn(
              'text-[11px] font-semibold uppercase tracking-widest mb-1.5',
              pendingCount > 0 ? 'text-amber-500' : 'text-slate-400',
            )}>Pending</p>
            <p className={cn(
              'text-2xl font-bold tabular-nums',
              pendingCount > 0 ? 'text-amber-700' : 'text-slate-900',
            )}>{pendingCount}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card px-5 py-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Registered</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{tools.length}</p>
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
