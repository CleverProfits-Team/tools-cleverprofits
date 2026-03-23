import Link from 'next/link'
import { ArrowUpRight, User } from 'lucide-react'
import { StatusBadge, AccessBadge, Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SerializedTool } from '@/types'

// ── Deterministic icon color from tool name ──────────────────────────────────
const ICON_COLORS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-sky-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-pink-500',
  'bg-indigo-500',
]

function getIconColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0
  }
  return ICON_COLORS[Math.abs(hash) % ICON_COLORS.length]
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
    year:  'numeric',
  })
}

interface ToolCardProps {
  tool: SerializedTool
}

export function ToolCard({ tool }: ToolCardProps) {
  const isActive  = tool.status === 'ACTIVE'
  const iconColor = getIconColor(tool.name)
  const initial   = tool.name.charAt(0).toUpperCase()

  return (
    <article
      className={cn(
        'group relative flex flex-col bg-white rounded-2xl border border-slate-200/80',
        'p-5 transition-all duration-200',
        isActive
          ? 'shadow-card hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer'
          : 'shadow-card opacity-90',
      )}
    >
      {/* ── Header: Icon + Status badge ────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div
          className={cn(
            'h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0',
            'text-white text-sm font-bold select-none shadow-xs',
            iconColor,
          )}
          aria-hidden
        >
          {initial}
        </div>
        <StatusBadge status={tool.status} />
      </div>

      {/* ── Name + slug ────────────────────────────────────────── */}
      <div className="mb-2">
        <Link
          href={`/tools/${tool.slug}`}
          className={cn(
            'font-semibold text-slate-900 text-[15px] leading-snug',
            'hover:text-blue-600 transition-colors focus-ring rounded',
          )}
        >
          {tool.name}
        </Link>
        <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">/{tool.slug}</p>
      </div>

      {/* ── Description ────────────────────────────────────────── */}
      <p
        className={cn(
          'text-sm line-clamp-2 mb-4 leading-relaxed flex-1',
          tool.description ? 'text-slate-500' : 'text-slate-300 italic',
        )}
      >
        {tool.description ?? 'No description provided'}
      </p>

      {/* ── Access & team chips ────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        <AccessBadge level={tool.accessLevel} />
        {tool.team && <Badge>{tool.team}</Badge>}
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
        <div className="flex items-center gap-1 text-xs text-slate-400 min-w-0 truncate">
          <User className="h-3 w-3 flex-shrink-0" aria-hidden />
          <span className="truncate">{tool.createdByName}</span>
          <span className="mx-1 flex-shrink-0">·</span>
          <span className="flex-shrink-0 whitespace-nowrap">{formatDate(tool.createdAt)}</span>
        </div>

        {isActive ? (
          <Link
            href={`/${tool.slug}`}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors flex-shrink-0 shadow-xs focus-ring"
            aria-label={`Open ${tool.name}`}
          >
            Open
            <ArrowUpRight className="h-3 w-3" aria-hidden />
          </Link>
        ) : (
          <Link
            href={`/tools/${tool.slug}`}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0 whitespace-nowrap"
          >
            View →
          </Link>
        )}
      </div>
    </article>
  )
}
