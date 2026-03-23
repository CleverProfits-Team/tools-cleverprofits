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
        'group relative flex flex-col bg-white rounded-xl border border-slate-200',
        'p-5 shadow-card transition-shadow duration-150',
        isActive && 'hover:shadow-card-hover',
      )}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <Link href={`/tools/${tool.slug}`} className="hover:underline focus-ring rounded">
            <h3 className="font-semibold text-slate-900 text-[15px] leading-snug truncate">
              {tool.name}
            </h3>
          </Link>
          <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
            /{tool.slug}
          </p>
        </div>

        {/* Status badge — top-right */}
        <div className="flex-shrink-0 mt-0.5">
          <StatusBadge status={tool.status} />
        </div>
      </div>

      {/* ── Description ─────────────────────────────────────────────── */}
      {tool.description ? (
        <p className="text-sm text-slate-500 line-clamp-2 mb-4 leading-relaxed flex-1">
          {tool.description}
        </p>
      ) : (
        <p className="text-sm text-slate-300 italic mb-4 flex-1">
          No description
        </p>
      )}

      {/* ── Classification chips ─────────────────────────────────────── */}
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
            className={cn(
              'flex items-center gap-1 text-xs font-medium text-blue-600',
              'hover:text-blue-700 transition-colors flex-shrink-0',
              'focus-ring rounded',
            )}
            aria-label={`Open ${tool.name}`}
          >
            Open
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        ) : (
          <span className="text-xs text-slate-300 flex-shrink-0">
            Not active
          </span>
        )}
      </div>
    </article>
  )
}
