'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Select } from '@/components/ui/select'
import type { SerializedTool } from '@/types'
import type { ToolStatus } from '@prisma/client'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const STATUS_CONFIG: Record<ToolStatus, { label: string; dot: string; pill: string }> = {
  DRAFT:    { label: 'Draft',    dot: 'bg-slate-300',   pill: 'bg-slate-100  text-slate-400   ring-1 ring-slate-400/20'   },
  ACTIVE:   { label: 'Active',   dot: 'bg-emerald-500', pill: 'bg-emerald-50  text-emerald-700 ring-1 ring-emerald-600/20' },
  PENDING:  { label: 'Pending',  dot: 'bg-amber-500',   pill: 'bg-amber-50   text-amber-700   ring-1 ring-amber-600/20'   },
  ARCHIVED: { label: 'Archived', dot: 'bg-slate-400',   pill: 'bg-slate-100  text-slate-500   ring-1 ring-slate-500/20'   },
  REJECTED: { label: 'Rejected', dot: 'bg-red-500',     pill: 'bg-red-50     text-red-700     ring-1 ring-red-600/20'     },
}

function StatusPill({ status }: { status: ToolStatus }) {
  const { label, dot, pill } = STATUS_CONFIG[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap', pill)}>
      <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', dot)} aria-hidden />
      {label}
    </span>
  )
}

interface Props {
  initialTools: SerializedTool[]
  teams: string[]
}

type StatusFilter = 'ALL' | ToolStatus

export function AdminToolsList({ initialTools, teams }: Props) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [teamFilter,   setTeamFilter]   = useState<string>('ALL')
  const [pendingOnly,  setPendingOnly]  = useState(false)

  const filtered = initialTools.filter((t) => {
    if (pendingOnly && t.status !== 'PENDING') return false
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false
    if (teamFilter   !== 'ALL' && t.team    !== teamFilter)   return false
    return true
  })

  const pendingCount = initialTools.filter((t) => t.status === 'PENDING').length

  const thCls = 'px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider'
  const tdCls = 'px-4 py-3.5 text-sm text-slate-700 align-middle'

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Select
          value={pendingOnly ? 'PENDING' : statusFilter}
          disabled={pendingOnly}
          options={[
            { value: 'ALL',      label: 'All statuses' },
            { value: 'ACTIVE',   label: 'Active' },
            { value: 'PENDING',  label: 'Pending' },
            { value: 'ARCHIVED', label: 'Archived' },
            { value: 'REJECTED', label: 'Rejected' },
          ]}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="w-40"
        />

        {teams.length > 0 && (
          <Select
            value={teamFilter}
            options={[
              { value: 'ALL', label: 'All teams' },
              ...teams.map((t) => ({ value: t, label: t })),
            ]}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="w-40"
          />
        )}

        <button
          onClick={() => { setPendingOnly((v) => !v); if (!pendingOnly) setStatusFilter('ALL') }}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
            pendingOnly
              ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
              : 'bg-[#f4f3f3] text-slate-600 hover:bg-[#eeeeee]',
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', pendingOnly ? 'bg-amber-500' : 'bg-slate-300')} aria-hidden />
          Needs review
          {pendingCount > 0 && (
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
              pendingOnly ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-600',
            )}>
              {pendingCount}
            </span>
          )}
        </button>

        <span className="ml-auto text-xs text-slate-400">
          {filtered.length} tool{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-[#f4f3f3] py-16 text-center">
          <p className="text-sm text-slate-400">No tools match the current filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-[0_20px_40px_rgba(4,11,77,0.06)]">
          <table className="w-full text-left">
            <thead className="bg-[#f4f3f3]">
              <tr>
                <th className={thCls}>Tool</th>
                <th className={thCls}>Owner</th>
                <th className={thCls}>Team</th>
                <th className={thCls}>Status</th>
                <th className={cn(thCls, 'hidden lg:table-cell')}>Registered</th>
                <th className={thCls}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f4f3f3]">
              {filtered.map((tool) => {
                const isPending = tool.status === 'PENDING'
                return (
                  <tr
                    key={tool.id}
                    onClick={() => router.push(`/dashboard/admin/tools/${tool.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        router.push(`/dashboard/admin/tools/${tool.id}`)
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`View ${tool.name}`}
                    className={cn(
                      'transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2605EF]',
                      isPending ? 'bg-amber-50/40 hover:bg-amber-50' : 'hover:bg-slate-50',
                    )}
                  >
                    {/* Left accent border via first cell */}
                    <td className={cn(tdCls, isPending && 'border-l-2 border-amber-400')}>
                      {isPending && (
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Clock className="h-3 w-3 text-amber-500" aria-hidden />
                          <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">Needs review</span>
                        </div>
                      )}
                      <div className="font-semibold text-[#040B4D]">{tool.name}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">/{tool.slug}</div>
                    </td>
                    <td className={tdCls}>
                      <div className="font-medium text-slate-800">{tool.createdByName}</div>
                      <div className="text-xs text-slate-400">{tool.createdByEmail}</div>
                    </td>
                    <td className={cn(tdCls, 'text-slate-500')}>{tool.team ?? <span className="text-slate-300">—</span>}</td>
                    <td className={tdCls}>
                      <StatusPill status={tool.status} />
                    </td>
                    <td className={cn(tdCls, 'text-slate-400 hidden lg:table-cell whitespace-nowrap')}>
                      {formatDate(tool.createdAt)}
                    </td>
                    <td className={cn(tdCls, 'text-right')}>
                      <Link
                        href={`/dashboard/admin/tools/${tool.id}`}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-150 whitespace-nowrap',
                          isPending
                            ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-xs hover:scale-[1.03] active:scale-95'
                            : 'bg-[#f4f3f3] text-slate-600 hover:bg-[#eeeeee]',
                        )}
                      >
                        {isPending ? 'Review' : 'View'}
                        <ArrowRight className="h-3 w-3" aria-hidden />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
