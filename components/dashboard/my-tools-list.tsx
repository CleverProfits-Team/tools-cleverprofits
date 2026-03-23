'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/badge'
import type { SerializedTool } from '@/types'
import type { ToolStatus } from '@prisma/client'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

type Filter = 'ALL' | ToolStatus

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: 'ALL',      label: 'All' },
  { value: 'ACTIVE',   label: 'Active' },
  { value: 'PENDING',  label: 'Pending' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ARCHIVED', label: 'Archived' },
]

interface Props {
  tools: SerializedTool[]
}

export function MyToolsList({ tools }: Props) {
  const [filter, setFilter] = useState<Filter>('ALL')

  const filtered = filter === 'ALL' ? tools : tools.filter((t) => t.status === filter)

  const counts: Partial<Record<Filter, number>> = {
    ALL:      tools.length,
    ACTIVE:   tools.filter((t) => t.status === 'ACTIVE').length,
    PENDING:  tools.filter((t) => t.status === 'PENDING').length,
    REJECTED: tools.filter((t) => t.status === 'REJECTED').length,
    ARCHIVED: tools.filter((t) => t.status === 'ARCHIVED').length,
  }

  if (tools.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <p className="text-slate-500 text-sm mb-3">You haven&apos;t registered any tools yet.</p>
        <Link
          href="/dashboard/register"
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Register your first tool
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap mb-5">
        {FILTER_OPTIONS.filter(o => (counts[o.value] ?? 0) > 0 || o.value === 'ALL').map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              filter === value
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            )}
          >
            {label}
            <span className={cn(
              'inline-flex items-center justify-center rounded-full min-w-[1.1rem] h-4 px-1 text-xs',
              filter === value ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600',
            )}>
              {counts[value] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-sm text-slate-500 py-8 text-center">No {filter.toLowerCase()} tools.</p>
        )}
        {filtered.map((tool) => (
          <div
            key={tool.id}
            className={cn(
              'rounded-xl border bg-white p-5 transition-colors',
              tool.status === 'REJECTED' ? 'border-red-200' : 'border-slate-200',
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-slate-900">{tool.name}</h3>
                  <StatusBadge status={tool.status} />
                </div>
                <p className="text-xs font-mono text-slate-400 mt-0.5">{tool.slug}</p>
                {tool.description && (
                  <p className="text-sm text-slate-500 mt-2 line-clamp-2">{tool.description}</p>
                )}
              </div>
              <div className="flex-shrink-0 text-xs text-slate-400 whitespace-nowrap">
                {formatDate(tool.createdAt)}
              </div>
            </div>

            {/* Rejection reason */}
            {tool.status === 'REJECTED' && tool.rejectionReason && (
              <div className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2">
                <p className="text-xs font-medium text-red-700 mb-0.5">Rejection reason</p>
                <p className="text-xs text-red-600">{tool.rejectionReason}</p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-3 flex items-center gap-3">
              <Link
                href={`/tools/${tool.slug}`}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
              >
                View details →
              </Link>
              {(tool.status === 'PENDING' || tool.status === 'REJECTED') && (
                <Link
                  href={`/dashboard/tools/${tool.id}/edit`}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline"
                >
                  Edit →
                </Link>
              )}
              {tool.status === 'ACTIVE' && (
                <a
                  href={`/${tool.slug}`}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-800 hover:underline"
                >
                  Launch →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
