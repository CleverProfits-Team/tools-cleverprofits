import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ToolsGrid } from '@/components/dashboard/tools-grid'
import { PlusCircle } from 'lucide-react'
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
      {/* Full-bleed hero: negative margins break out of the layout padding,
          hero fills the full content-area width flush with the sidebar. */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-8 mb-8 bg-hero-mesh relative overflow-hidden">
        {/* Subtle dot-grid overlay on dark background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
          aria-hidden
        />

        <div className="relative px-4 sm:px-6 lg:px-8 pt-9 pb-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              {firstName && (
                <p className="text-white/40 text-[11px] font-medium uppercase tracking-[0.12em] mb-1.5">
                  Welcome back, {firstName}
                </p>
              )}
              <h1 className="font-display font-bold text-[28px] text-white tracking-tight leading-none">
                Your tools
              </h1>
              <p className="text-white/45 text-sm mt-1.5">
                Launch, manage, and scale internal tools across CleverProfits.
              </p>
            </div>

            <Link
              href="/dashboard/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white/[0.1] border border-white/[0.15] px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.18] hover:border-white/25 transition-all duration-150 self-start sm:self-end flex-shrink-0 backdrop-blur-sm"
            >
              <PlusCircle className="h-4 w-4" aria-hidden />
              Register Tool
            </Link>
          </div>

          {/* ── Inline stats row ─────────────────────────────── */}
          {tools.length > 0 && (
            <div className="flex items-stretch mt-7 pt-5 border-t border-white/[0.08]">
              <div className="pr-7">
                <p className="text-[26px] font-display font-bold text-white tabular-nums leading-none">
                  {activeCount}
                </p>
                <p className="text-white/35 text-[11px] mt-1.5 uppercase tracking-[0.1em]">Active</p>
              </div>

              <div className="w-px bg-white/[0.1] self-stretch" />

              <div className="px-7">
                <p className={`text-[26px] font-display font-bold tabular-nums leading-none ${pendingCount > 0 ? 'text-amber-400' : 'text-white'}`}>
                  {pendingCount}
                </p>
                <p className="text-white/35 text-[11px] mt-1.5 uppercase tracking-[0.1em]">Pending</p>
              </div>

              <div className="w-px bg-white/[0.1] self-stretch" />

              <div className="pl-7">
                <p className="text-[26px] font-display font-bold text-white tabular-nums leading-none">
                  {tools.length}
                </p>
                <p className="text-white/35 text-[11px] mt-1.5 uppercase tracking-[0.1em]">Total</p>
              </div>
            </div>
          )}
        </div>
      </div>

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
