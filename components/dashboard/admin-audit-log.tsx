'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

type AuditAction =
  | 'TOOL_REGISTERED'
  | 'TOOL_APPROVED'
  | 'TOOL_REJECTED'
  | 'TOOL_ARCHIVED'
  | 'TOOL_RESTORED'
  | 'ROLE_CHANGED'
  | 'USER_SUSPENDED'
  | 'USER_ACTIVATED'

interface Log {
  id: string
  action: string
  actorEmail: string
  actorName: string
  toolId: string | null
  toolName: string | null
  targetEmail: string | null
  detail: string | null
  createdAt: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const ACTION_STYLES: Record<AuditAction, { label: string; className: string }> = {
  TOOL_REGISTERED: { label: 'Registered',  className: 'bg-blue-100 text-blue-700' },
  TOOL_APPROVED:   { label: 'Approved',    className: 'bg-emerald-100 text-emerald-700' },
  TOOL_REJECTED:   { label: 'Rejected',    className: 'bg-red-100 text-red-700' },
  TOOL_ARCHIVED:   { label: 'Archived',    className: 'bg-slate-100 text-slate-600' },
  TOOL_RESTORED:   { label: 'Restored',    className: 'bg-violet-100 text-violet-700' },
  ROLE_CHANGED:    { label: 'Role changed', className: 'bg-amber-100 text-amber-700' },
  USER_SUSPENDED:  { label: 'Suspended',   className: 'bg-red-100 text-red-700' },
  USER_ACTIVATED:  { label: 'Activated',   className: 'bg-emerald-100 text-emerald-700' },
}

function ActionBadge({ action }: { action: string }) {
  const style = ACTION_STYLES[action as AuditAction] ?? { label: action, className: 'bg-slate-100 text-slate-600' }
  return (
    <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap', style.className)}>
      {style.label}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const CATEGORY_OPTIONS = [
  { value: '',       label: 'All actions' },
  { value: 'tools',  label: 'Tools' },
  { value: 'users',  label: 'Users' },
]

const TOOL_ACTIONS  = new Set(['TOOL_REGISTERED','TOOL_APPROVED','TOOL_REJECTED','TOOL_ARCHIVED','TOOL_RESTORED'])
const USER_ACTIONS  = new Set(['ROLE_CHANGED','USER_SUSPENDED','USER_ACTIVATED'])

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function AdminAuditLog({ logs }: { logs: Log[] }) {
  const [category, setCategory] = useState('')
  const [query, setQuery]       = useState('')

  const filtered = logs.filter((l) => {
    if (category === 'tools' && !TOOL_ACTIONS.has(l.action)) return false
    if (category === 'users' && !USER_ACTIONS.has(l.action)) return false
    if (query) {
      const q = query.toLowerCase()
      const hay = [l.actorEmail, l.toolName ?? '', l.targetEmail ?? '', l.detail ?? ''].join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  const thCls = 'px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider'
  const tdCls = 'px-3 py-3 text-sm text-slate-700 align-top'

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex rounded-md border border-slate-200 overflow-hidden">
          {CATEGORY_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setCategory(value)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors',
                category === value
                  ? 'bg-[#2605EF] text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search actor, tool, user…"
          className="rounded-md border border-slate-200 px-3 py-1.5 text-sm flex-1 min-w-[180px] focus:outline-none focus:ring-2 focus:ring-[#2605EF]"
        />
        <span className="self-center text-xs text-slate-400">
          {filtered.length} event{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500 py-12 text-center">No events match your filters.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className={thCls}>Time</th>
                <th className={thCls}>Action</th>
                <th className={thCls}>Subject</th>
                <th className={thCls}>By</th>
                <th className={thCls}>Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50">
                  <td className={cn(tdCls, 'whitespace-nowrap text-xs text-slate-400')}>
                    {formatDate(log.createdAt)}
                  </td>
                  <td className={tdCls}>
                    <ActionBadge action={log.action} />
                  </td>
                  <td className={tdCls}>
                    {log.toolName ? (
                      <div className="font-medium text-slate-900">{log.toolName}</div>
                    ) : log.targetEmail ? (
                      <div className="text-slate-600">{log.targetEmail}</div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className={tdCls}>
                    <div className="text-slate-700">{log.actorName}</div>
                    <div className="text-xs text-slate-400">{log.actorEmail}</div>
                  </td>
                  <td className={cn(tdCls, 'text-slate-500 max-w-xs')}>
                    {log.detail ?? <span className="text-slate-300">—</span>}
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
