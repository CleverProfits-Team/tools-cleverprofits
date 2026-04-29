import { cn } from '@/lib/utils'
import type { AccessLevel, ToolStatus } from '@prisma/client'

// ─────────────────────────────────────────────────────────────────────────────
// Status badge — brand-kit functional colors
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<ToolStatus, string> = {
  DRAFT:    'bg-[rgba(15,0,56,0.06)] text-[rgba(15,0,56,0.55)]',
  ACTIVE:   'bg-[rgba(16,185,129,0.10)] text-[#065F46]',
  PENDING:  'bg-[rgba(245,158,11,0.10)] text-[#92400E]',
  ARCHIVED: 'bg-[rgba(15,0,56,0.06)] text-[rgba(15,0,56,0.40)]',
  REJECTED: 'bg-[rgba(239,68,68,0.10)] text-[#991B1B]',
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
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em] whitespace-nowrap',
        STATUS_STYLES[status],
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'ACTIVE'   && 'bg-[#10B981]',
          status === 'PENDING'  && 'bg-[#F59E0B]',
          status === 'ARCHIVED' && 'bg-[rgba(15,0,56,0.40)]',
          status === 'REJECTED' && 'bg-[#EF4444]',
          status === 'DRAFT'    && 'bg-[rgba(15,0,56,0.40)]',
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
  INTERNAL:   'bg-[rgba(38,5,239,0.10)] text-[#2605EF]',
  RESTRICTED: 'bg-[rgba(245,158,11,0.10)] text-[#92400E]',
  LEADERSHIP: 'bg-[#0F0038] text-white',
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
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em] whitespace-nowrap',
        ACCESS_STYLES[level],
      )}
    >
      {ACCESS_LABELS[level]}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic neutral badge
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
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em] whitespace-nowrap',
        'bg-[#E7E7E7] text-[rgba(15,0,56,0.68)]',
        className,
      )}
    >
      {children}
    </span>
  )
}
