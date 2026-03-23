import Link from 'next/link'
import { ArrowUpRight, Clock, User } from 'lucide-react'
import { StatusBadge, AccessBadge, Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SerializedTool } from '@/types'

interface ToolCardProps {
  tool: SerializedTool
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
    year:  'numeric',
  })
}

export function ToolCard({ tool }: ToolCardProps) {
  const isActive = tool.status === 'ACTIVE'

  return (
    <article
      className={cn(
        'group relative flex flex-col bg-white rounded-xl border shadow-sm',
        'p-5 transition-all duration-150',
        isActive
          ? 'border-slate-200 hover:border-slate-300 hover:shadow-md cursor-pointer'
          : 'border-slate-200 opacity-90',
      )}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <Link
            href={`/tools/${tool.slug}`}
            className={cn(
              'block font-semibold text-slate-900 text-[15px] leading-snug truncate',
              'hover:text-blue-600 transition-colors focus-ring rounded',
            )}
          >
            {tool.name}
          </Link>
          <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
            /{tool.slug}
          </p>
        </div>
        <div className="flex-shrink-0 mt-0.5">
          <StatusBadge status={tool.status} />
        </div>
      </div>

      {/* ── Description ─────────────────────────────────────────────── */}
      <p className={cn(
        'text-sm line-clamp-2 mb-4 leading-relaxed flex-1',
        tool.description ? 'text-slate-500' : 'text-slate-300 italic',
      )}>
        {tool.description ?? 'No description provided'}
      </p>

      {/* ── Chips ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        <AccessBadge level={tool.accessLevel} />
        {tool.team && <Badge>{tool.team}</Badge>}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex items-center gap-1 text-xs text-slate-400 truncate">
            <User className="h-3 w-3 flex-shrink-0" aria-hidden />
            <span className="truncate">{tool.createdByName}</span>
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
            <Clock className="h-3 w-3" aria-hidden />
            {formatDate(tool.createdAt)}
          </span>
        </div>

        {isActive ? (
          <Link
            href={`/${tool.slug}`}
            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors flex-shrink-0 shadow-sm focus-ring"
            aria-label={`Open ${tool.name}`}
          >
            Open
            <ArrowUpRight className="h-3 w-3" aria-hidden />
          </Link>
        ) : (
          <Link
            href={`/tools/${tool.slug}`}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
          >
            View details
          </Link>
        )}
      </div>
    </article>
  )
}
