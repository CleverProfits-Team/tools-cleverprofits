import { cn } from '@/lib/utils'
import type { AccessLevel, ToolStatus } from '@prisma/client'

// ─────────────────────────────────────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<ToolStatus, string> = {
  DRAFT:    'bg-[#f4f3f3] text-[#94a3b8]  ring-1 ring-[#94a3b8]/20',
  ACTIVE:   'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
  PENDING:  'bg-amber-50  text-amber-700  ring-1 ring-amber-600/20',
  ARCHIVED: 'bg-[#f4f3f3] text-[#64748b]  ring-1 ring-[#64748b]/20',
  REJECTED: 'bg-red-50    text-red-700    ring-1 ring-red-600/20',
}

const STATUS_LABELS: Record<ToolStatus, string> = {
  DRAFT:    'Draft',
  ACTIVE:   'Active',
  PENDING:  'Pending',
  ARCHIVED: 'Archived',
  REJECTED: 'Rejected',
}

export function StatusBadge({ status }: { status: ToolStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium font-display',
        STATUS_STYLES[status],
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'ACTIVE'   && 'bg-emerald-500',
          status === 'PENDING'  && 'bg-amber-500',
          status === 'ARCHIVED' && 'bg-[#64748b]',
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
  INTERNAL:   'bg-[#eeeeff]   text-[#2605EF]  ring-1 ring-[#2605EF]/20',
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
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium font-display',
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
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium font-display',
        'bg-[#f4f3f3] text-[#64748b] ring-1 ring-[#64748b]/20',
        className,
      )}
    >
      {children}
    </span>
  )
}
