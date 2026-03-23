'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Select } from '@/components/ui/select'
import type { SerializedTool } from '@/types'
import type { ToolStatus } from '@prisma/client'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function ToolStatusBadge({ status }: { status: ToolStatus }) {
  const styles: Record<ToolStatus, string> = {
    ACTIVE:   'bg-emerald-100 text-emerald-700',
    PENDING:  'bg-amber-100 text-amber-700',
    ARCHIVED: 'bg-slate-100 text-slate-500',
    REJECTED: 'bg-red-100 text-red-700',
  }
  return (
    <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', styles[status])}>
      {status}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  initialTools: SerializedTool[]
  teams: string[]
}

type StatusFilter = 'ALL' | ToolStatus

export function AdminToolsList({ initialTools, teams }: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [teamFilter, setTeamFilter]     = useState<string>('ALL')
  const [pendingOnly, setPendingOnly]   = useState(false)

  const filtered = initialTools.filter((t) => {
    if (pendingOnly && t.status !== 'PENDING') return false
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false
    if (teamFilter !== 'ALL' && t.team !== teamFilter) return false
    return true
  })

  const thCls = 'px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider'
  const tdCls = 'px-3 py-3 text-sm text-slate-700 align-top'

  return (
    <div>
      {/* Filter row */}
      <div className="flex flex-wrap gap-3 mb-4">
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
          onClick={() => {
            setPendingOnly((v) => !v)
            if (!pendingOnly) setStatusFilter('ALL')
          }}
          className={cn(
            'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
            pendingOnly
              ? 'border-amber-500 bg-amber-50 text-amber-700'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50',
          )}
        >
          Pending only
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500 py-12 text-center">No tools match the current filters</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className={thCls}>Name / Slug</th>
                <th className={thCls}>Owner</th>
                <th className={thCls}>Team</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Created</th>
                <th className={thCls}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((tool) => (
                <tr key={tool.id} className="hover:bg-slate-50/50">
                  <td className={tdCls}>
                    <div className="font-medium text-slate-900">{tool.name}</div>
                    <div className="text-xs text-slate-400">{tool.slug}</div>
                  </td>
                  <td className={tdCls}>
                    <div>{tool.createdByName}</div>
                    <div className="text-xs text-slate-400">{tool.createdByEmail}</div>
                  </td>
                  <td className={tdCls}>{tool.team ?? '—'}</td>
                  <td className={tdCls}><ToolStatusBadge status={tool.status} /></td>
                  <td className={tdCls}>{formatDate(tool.createdAt)}</td>
                  <td className={tdCls}>
                    <Link
                      href={`/dashboard/admin/tools/${tool.id}`}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Review →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
