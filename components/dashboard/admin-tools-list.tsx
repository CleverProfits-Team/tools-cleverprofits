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
  DRAFT:    { label: 'Draft',    dot: 'bg-[rgba(15,0,56,0.32)]', pill: 'bg-[#E7E7E7]                  text-[rgba(15,0,56,0.40)] ring-1 ring-[rgba(15,0,56,0.20)]' },
  ACTIVE:   { label: 'Active',   dot: 'bg-[#10B981]',            pill: 'bg-[rgba(16,185,129,0.10)]    text-[#065F46]            ring-1 ring-emerald-600/20'      },
  PENDING:  { label: 'Pending',  dot: 'bg-[#F59E0B]',            pill: 'bg-[rgba(245,158,11,0.10)]    text-[#92400E]            ring-1 ring-amber-600/20'        },
  ARCHIVED: { label: 'Archived', dot: 'bg-[rgba(15,0,56,0.40)]', pill: 'bg-[#E7E7E7]                  text-[rgba(15,0,56,0.55)] ring-1 ring-[rgba(15,0,56,0.20)]' },
  REJECTED: { label: 'Rejected', dot: 'bg-[#EF4444]',            pill: 'bg-[rgba(239,68,68,0.10)]     text-[#991B1B]            ring-1 ring-red-600/20'          },
}

function StatusPill({ status }: { status: ToolStatus }) {
  const { label, dot, pill } = STATUS_CONFIG[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em] whitespace-nowrap', pill)}>
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

  const thCls = 'px-4 py-3 text-left text-xs font-semibold text-[rgba(15,0,56,0.55)] uppercase tracking-wider'
  const tdCls = 'px-4 py-3.5 text-sm text-[#0F0038] align-middle'

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
            'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
            pendingOnly
              ? 'bg-[rgba(245,158,11,0.10)] text-[#92400E] ring-1 ring-amber-200'
              : 'bg-[#FAFAFA] text-[rgba(15,0,56,0.65)] hover:bg-[#E7E7E7]',
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', pendingOnly ? 'bg-[#F59E0B]' : 'bg-[rgba(15,0,56,0.32)]')} aria-hidden />
          Needs review
          {pendingCount > 0 && (
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
              pendingOnly ? 'bg-[rgba(245,158,11,0.20)] text-[#92400E]' : 'bg-[#D6D6D6] text-[rgba(15,0,56,0.65)]',
            )}>
              {pendingCount}
            </span>
          )}
        </button>

        <span className="ml-auto text-xs text-[rgba(15,0,56,0.40)]">
          {filtered.length} tool{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-[#FAFAFA] py-16 text-center">
          <p className="text-sm text-[rgba(15,0,56,0.40)]">No tools match the current filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#E7E7E7] bg-white shadow-card">
          <table className="w-full text-left">
            <thead className="bg-[#FAFAFA]">
              <tr>
                <th className={thCls}>Tool</th>
                <th className={thCls}>Owner</th>
                <th className={thCls}>Team</th>
                <th className={thCls}>Status</th>
                <th className={cn(thCls, 'hidden lg:table-cell')}>Registered</th>
                <th className={thCls}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FAFAFA]">
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
                      isPending ? 'bg-[rgba(245,158,11,0.05)] hover:bg-[rgba(245,158,11,0.10)]' : 'hover:bg-[#FAFAFA]',
                    )}
                  >
                    {/* Left accent border via first cell */}
                    <td className={cn(tdCls, isPending && 'border-l-[3px] border-[#F59E0B]')}>
                      {isPending && (
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Clock className="h-3 w-3 text-[#F59E0B]" aria-hidden />
                          <span className="text-[10px] font-semibold text-[#92400E] uppercase tracking-wider">Needs review</span>
                        </div>
                      )}
                      <div className="font-semibold text-[#0F0038]">{tool.name}</div>
                      <div className="text-xs text-[rgba(15,0,56,0.40)] font-mono mt-0.5">/{tool.slug}</div>
                    </td>
                    <td className={tdCls}>
                      <div className="font-medium text-[#0F0038]">{tool.createdByName}</div>
                      <div className="text-xs text-[rgba(15,0,56,0.40)]">{tool.createdByEmail}</div>
                    </td>
                    <td className={cn(tdCls, 'text-[rgba(15,0,56,0.55)]')}>{tool.team ?? <span className="text-[rgba(15,0,56,0.32)]">—</span>}</td>
                    <td className={tdCls}>
                      <StatusPill status={tool.status} />
                    </td>
                    <td className={cn(tdCls, 'text-[rgba(15,0,56,0.40)] hidden lg:table-cell whitespace-nowrap')}>
                      {formatDate(tool.createdAt)}
                    </td>
                    <td className={cn(tdCls, 'text-right')}>
                      <Link
                        href={`/dashboard/admin/tools/${tool.id}`}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-150 whitespace-nowrap',
                          isPending
                            ? 'bg-[#F59E0B] text-white hover:opacity-90 shadow-md hover:scale-[1.03] active:scale-95'
                            : 'bg-[#FAFAFA] text-[rgba(15,0,56,0.65)] hover:bg-[#E7E7E7]',
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
