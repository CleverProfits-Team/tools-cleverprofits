import { cn } from '@/lib/utils'
import type { AccessLevel, ToolStatus } from '@prisma/client'

// ─────────────────────────────────────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<ToolStatus, string> = {
  ACTIVE:   'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
  PENDING:  'bg-amber-50  text-amber-700  ring-1 ring-amber-600/20',
  ARCHIVED: 'bg-slate-100 text-slate-500  ring-1 ring-slate-500/20',
  REJECTED: 'bg-red-50    text-red-700    ring-1 ring-red-600/20',
}

const STATUS_LABELS: Record<ToolStatus, string> = {
  ACTIVE:   'Active',
  PENDING:  'Pending',
  ARCHIVED: 'Archived',
  REJECTED: 'Rejected',
}

export function StatusBadge({ status }: { status: ToolStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
        STATUS_STYLES[status],
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'ACTIVE'   && 'bg-emerald-500',
          status === 'PENDING'  && 'bg-amber-500',
          status === 'ARCHIVED' && 'bg-slate-400',
          status === 'REJECTED' && 'bg-red-500',
        )}
        aria-hidden
      />
      {STATUS_LABELS[status]}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Access level badge
// ─────────────────────────────────────────────────────────────────────────────

const ACCESS_STYLES: Record<AccessLevel, string> = {
  INTERNAL:   'bg-blue-50   text-blue-700   ring-1 ring-blue-700/20',
  RESTRICTED: 'bg-orange-50 text-orange-700 ring-1 ring-orange-600/20',
  LEADERSHIP: 'bg-violet-50 text-violet-700 ring-1 ring-violet-700/20',
}

const ACCESS_LABELS: Record<AccessLevel, string> = {
  INTERNAL:   'Internal',
  RESTRICTED: 'Restricted',
  LEADERSHIP: 'Leadership',
}

export function AccessBadge({ level }: { level: AccessLevel }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        ACCESS_STYLES[level],
      )}
    >
      {ACCESS_LABELS[level]}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic badge
// ─────────────────────────────────────────────────────────────────────────────

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        'bg-slate-100 text-slate-600 ring-1 ring-slate-500/20',
        className,
      )}
    >
      {children}
    </span>
  )
}
