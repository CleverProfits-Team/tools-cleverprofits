'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Clock, SearchX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Select } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/badge'
import type { SerializedTool } from '@/types'
import type { ToolStatus } from '@prisma/client'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface Props {
  initialTools: SerializedTool[]
  teams: string[]
}

type StatusFilter = 'ALL' | ToolStatus

export function AdminToolsList({ initialTools, teams }: Props) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [teamFilter, setTeamFilter] = useState<string>('ALL')
  const [pendingOnly, setPendingOnly] = useState(false)

  const filtered = initialTools.filter((t) => {
    if (pendingOnly && t.status !== 'PENDING') return false
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false
    if (teamFilter !== 'ALL' && t.team !== teamFilter) return false
    return true
  })

  const pendingCount = initialTools.filter((t) => t.status === 'PENDING').length

  const thCls =
    'px-5 py-4 text-left text-[10px] font-bold font-display text-white uppercase tracking-[0.10em]'
  const tdCls = 'px-4 py-3.5 text-sm text-[#040B4D] align-middle'

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Select
          value={pendingOnly ? 'PENDING' : statusFilter}
          disabled={pendingOnly}
          options={[
            { value: 'ALL', label: 'All statuses' },
            { value: 'ACTIVE', label: 'Active' },
            { value: 'PENDING', label: 'Pending' },
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
          onClick={() => {
            setPendingOnly((v) => !v)
            if (!pendingOnly) setStatusFilter('ALL')
          }}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-[20px] border px-3 py-1.5 text-xs font-medium font-display transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#2605EF]/30 focus-visible:ring-offset-2',
            pendingOnly
              ? 'border-amber-300 bg-amber-50 text-amber-700'
              : 'border-[#E7E7E7] text-[rgba(4,11,77,0.55)] hover:bg-[#FAFAFA]',
          )}
        >
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full flex-shrink-0',
              pendingOnly ? 'bg-amber-500' : 'bg-[rgba(4,11,77,0.40)]',
            )}
            aria-hidden
          />
          Needs review
          {pendingCount > 0 && (
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                pendingOnly
                  ? 'bg-amber-200 text-amber-800'
                  : 'bg-[#FAFAFA] text-[rgba(4,11,77,0.55)]',
              )}
            >
              {pendingCount}
            </span>
          )}
        </button>

        <span className="ml-auto text-xs text-[rgba(4,11,77,0.40)]">
          {filtered.length} tool{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[#E7E7E7] bg-white flex flex-col items-center justify-center py-20 text-center">
          <div className="h-12 w-12 rounded-full bg-[#FAFAFA] flex items-center justify-center mb-4">
            <SearchX className="h-5 w-5 text-[rgba(4,11,77,0.40)]" aria-hidden />
          </div>
          <p className="font-display font-semibold text-[#040B4D] text-sm mb-1">
            No tools match your filters
          </p>
          <p className="text-xs text-[rgba(4,11,77,0.40)] font-sans">
            Adjust the filters above or clear them to see all tools
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#E7E7E7] bg-white shadow-card">
          <table className="w-full text-left">
            <thead className="bg-[#040B4D]">
              <tr>
                <th className={thCls}>Tool</th>
                <th className={thCls}>Owner</th>
                <th className={thCls}>Team</th>
                <th className={thCls}>Status</th>
                <th className={cn(thCls, 'hidden lg:table-cell')}>Registered</th>
                <th className={thCls}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E7E7]/60">
              {filtered.map((tool) => {
                const isPending = tool.status === 'PENDING'
                return (
                  <tr
                    key={tool.id}
                    onClick={() => router.push(`/dashboard/admin/tools/${tool.id}`)}
                    tabIndex={0}
                    role="link"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ')
                        router.push(`/dashboard/admin/tools/${tool.id}`)
                    }}
                    className={cn(
                      'transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2605EF]/30 outline-none',
                      isPending
                        ? 'bg-amber-50/40 hover:bg-amber-50'
                        : 'hover:bg-[rgba(38,5,239,0.03)]',
                    )}
                  >
                    {/* Left accent border via first cell */}
                    <td className={cn(tdCls, isPending && 'border-l-2 border-amber-400')}>
                      {isPending && (
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Clock className="h-3 w-3 text-amber-500" aria-hidden />
                          <span className="text-[10px] font-semibold font-display text-amber-600 uppercase tracking-wider">
                            Needs review
                          </span>
                        </div>
                      )}
                      <div className="font-semibold font-display text-[#040B4D]">{tool.name}</div>
                    </td>
                    <td className={tdCls}>
                      <div className="font-medium text-[#040B4D]">{tool.createdByName}</div>
                      <div className="text-xs text-[rgba(4,11,77,0.40)]">{tool.createdByEmail}</div>
                    </td>
                    <td className={cn(tdCls, 'text-[rgba(4,11,77,0.55)]')}>
                      {tool.team ?? <span className="text-[rgba(4,11,77,0.40)]">—</span>}
                    </td>
                    <td className={tdCls}>
                      <StatusBadge status={tool.status} />
                    </td>
                    <td
                      className={cn(
                        tdCls,
                        'text-[rgba(4,11,77,0.40)] hidden lg:table-cell whitespace-nowrap',
                      )}
                    >
                      {formatDate(tool.createdAt)}
                    </td>
                    <td className={cn(tdCls, 'text-right')}>
                      <Link
                        href={`/dashboard/admin/tools/${tool.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-[20px] px-2.5 py-1.5 text-xs font-medium font-display transition-all duration-150 whitespace-nowrap min-h-[36px]',
                          'focus-visible:ring-2 focus-visible:ring-[#2605EF]/30 focus-visible:ring-offset-2',
                          isPending
                            ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-xs hover:scale-[1.03] active:scale-95'
                            : 'border border-[#E7E7E7] text-[rgba(4,11,77,0.55)] hover:bg-[#FAFAFA] hover:border-[#D6D6D6]',
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
