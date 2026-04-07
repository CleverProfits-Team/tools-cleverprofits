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
  DRAFT:    { label: 'Draft',    dot: 'bg-[#94a3b8]',   pill: 'bg-[#f4f3f3]  text-[#94a3b8]  ring-1 ring-[#94a3b8]/20'  },
  ACTIVE:   { label: 'Active',   dot: 'bg-emerald-500', pill: 'bg-emerald-50  text-emerald-700 ring-1 ring-emerald-600/20' },
  PENDING:  { label: 'Pending',  dot: 'bg-amber-500',   pill: 'bg-amber-50   text-amber-700   ring-1 ring-amber-600/20'   },
  ARCHIVED: { label: 'Archived', dot: 'bg-[#64748b]',   pill: 'bg-[#f4f3f3]  text-[#64748b]  ring-1 ring-[#64748b]/20'  },
  REJECTED: { label: 'Rejected', dot: 'bg-red-500',     pill: 'bg-red-50     text-red-700     ring-1 ring-red-600/20'     },
}

function StatusPill({ status }: { status: ToolStatus }) {
  const { label, dot, pill } = STATUS_CONFIG[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium font-display whitespace-nowrap', pill)}>
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

  const thCls = 'px-4 py-3 text-left text-xs font-semibold font-display text-[#94a3b8] uppercase tracking-widest'
  const tdCls = 'px-4 py-3.5 text-sm text-[#040B4D] align-middle'

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
            'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium font-display transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#2605EF]/30 focus-visible:ring-offset-2',
            pendingOnly
              ? 'border-amber-300 bg-amber-50 text-amber-700'
              : 'border-[#e2e8f0] text-[#64748b] hover:bg-[#f4f3f3]',
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', pendingOnly ? 'bg-amber-500' : 'bg-[#94a3b8]')} aria-hidden />
          Needs review
          {pendingCount > 0 && (
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
              pendingOnly ? 'bg-amber-200 text-amber-800' : 'bg-[#f4f3f3] text-[#64748b]',
            )}>
              {pendingCount}
            </span>
          )}
        </button>

        <span className="ml-auto text-xs text-[#94a3b8]">
          {filtered.length} tool{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[#e2e8f0] bg-white py-16 text-center">
          <p className="text-sm text-[#94a3b8]">No tools match the current filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#e2e8f0] bg-white shadow-card">
          <table className="w-full text-left">
            <thead className="border-b border-[#e2e8f0] bg-[#f4f3f3]/60">
              <tr>
                <th className={thCls}>Tool</th>
                <th className={thCls}>Owner</th>
                <th className={thCls}>Team</th>
                <th className={thCls}>Status</th>
                <th className={cn(thCls, 'hidden lg:table-cell')}>Registered</th>
                <th className={thCls}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]/60">
              {filtered.map((tool) => {
                const isPending = tool.status === 'PENDING'
                return (
                  <tr
                    key={tool.id}
                    onClick={() => router.push(`/dashboard/admin/tools/${tool.id}`)}
                    tabIndex={0}
                    role="link"
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push(`/dashboard/admin/tools/${tool.id}`) }}
                    className={cn(
                      'transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2605EF]/30 outline-none',
                      isPending ? 'bg-amber-50/40 hover:bg-amber-50' : 'hover:bg-[#f4f3f3]',
                    )}
                  >
                    {/* Left accent border via first cell */}
                    <td className={cn(tdCls, isPending && 'border-l-2 border-amber-400')}>
                      {isPending && (
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Clock className="h-3 w-3 text-amber-500" aria-hidden />
                          <span className="text-[10px] font-semibold font-display text-amber-600 uppercase tracking-wider">Needs review</span>
                        </div>
                      )}
                      <div className="font-semibold font-display text-[#040B4D]">{tool.name}</div>
                      <div className="text-xs text-[#94a3b8] font-mono mt-0.5">/{tool.slug}</div>
                    </td>
                    <td className={tdCls}>
                      <div className="font-medium text-[#040B4D]">{tool.createdByName}</div>
                      <div className="text-xs text-[#94a3b8]">{tool.createdByEmail}</div>
                    </td>
                    <td className={cn(tdCls, 'text-[#64748b]')}>{tool.team ?? <span className="text-[#94a3b8]">—</span>}</td>
                    <td className={tdCls}>
                      <StatusPill status={tool.status} />
                    </td>
                    <td className={cn(tdCls, 'text-[#94a3b8] hidden lg:table-cell whitespace-nowrap')}>
                      {formatDate(tool.createdAt)}
                    </td>
                    <td className={cn(tdCls, 'text-right')}>
                      <Link
                        href={`/dashboard/admin/tools/${tool.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium font-display transition-all duration-150 whitespace-nowrap min-h-[36px]',
                          'focus-visible:ring-2 focus-visible:ring-[#2605EF]/30 focus-visible:ring-offset-2',
                          isPending
                            ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-xs hover:scale-[1.03] active:scale-95'
                            : 'border border-[#e2e8f0] text-[#64748b] hover:bg-[#f4f3f3] hover:border-[#94a3b8]',
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
