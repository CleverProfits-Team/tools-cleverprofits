'use client'

import Link from 'next/link'
import { ArrowUpRight, Activity } from 'lucide-react'
import { StatusBadge } from '@/components/ui/badge'
import { FavoriteButton } from '@/components/ui/favorite-button'
import { cn } from '@/lib/utils'
import { getToolAccent } from '@/lib/colors'
import type { SerializedTool } from '@/types'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface ToolRowProps {
  tool: SerializedTool
  isFavorited?: boolean
}

export function ToolRow({ tool, isFavorited = false }: ToolRowProps) {
  const isActive = tool.status === 'ACTIVE'
  const accent   = getToolAccent(tool.name)
  const initial  = tool.name.charAt(0).toUpperCase()

  return (
    <div
      className={cn(
        'group relative flex items-center gap-3.5 px-4 py-3',
        'border-b border-[#e2e8f0]/60 last:border-b-0',
        'transition-colors duration-150',
        'hover:bg-[#f4f3f3]',
      )}
    >
      {/* Left accent bar — grows from center on hover */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[2px] rounded-r-full origin-center transition-transform duration-200 scale-y-0 group-hover:scale-y-100"
        style={{ backgroundColor: accent.hex }}
        aria-hidden
      />

      {/* Icon */}
      <div
        className={cn(
          'h-7 w-7 rounded-md flex items-center justify-center flex-shrink-0',
          'text-white text-[10px] font-bold select-none',
          'transition-transform duration-150 group-hover:scale-[1.08]',
          accent.bg,
        )}
        aria-hidden
      >
        {initial}
      </div>

      <FavoriteButton toolId={tool.id} initialFavorited={isFavorited} className="flex-shrink-0" />

      {/* Name + description */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/tools/${tool.slug}`}
          className="font-semibold text-[13px] text-[#040B4D] hover:text-[#2605EF] transition-colors leading-tight focus-ring rounded focus-visible:ring-2 focus-visible:ring-[#2605EF]/30 focus-visible:ring-offset-2"
        >
          {tool.name}
        </Link>
        {tool.description && (
          <p className="text-[11.5px] text-[#64748b] mt-0.5 truncate max-w-lg">
            {tool.description}
          </p>
        )}
      </div>

      {/* Team + tags */}
      <div className="hidden lg:flex items-center gap-1.5 flex-shrink-0">
        {tool.team && (
          <span className="rounded-full bg-[#f4f3f3] border border-[#e2e8f0] px-2 py-0.5 text-[10.5px] font-medium text-[#64748b]">
            {tool.team}
          </span>
        )}
        {(tool.tags ?? []).slice(0, 2).map((tag) => (
          <span
            key={tag.id}
            className="rounded-full bg-[#f4f3f3] border border-[#e2e8f0] px-2 py-0.5 text-[10.5px] font-medium text-[#64748b]"
          >
            {tag.name}
          </span>
        ))}
      </div>

      {/* Last accessed */}
      {tool.lastAccessedAt && (
        <div className="hidden md:flex items-center gap-1 text-[11px] text-[#94a3b8] flex-shrink-0" title={`Last used ${timeAgo(tool.lastAccessedAt)}`}>
          <Activity className="h-3 w-3" aria-hidden />
          <span>{timeAgo(tool.lastAccessedAt)}</span>
        </div>
      )}

      {/* Status */}
      <div className="flex-shrink-0 hidden sm:block">
        <StatusBadge status={tool.status} />
      </div>

      {/* Action — revealed on hover */}
      <div className="flex-shrink-0 w-[72px] flex justify-end">
        {isActive ? (
          <a
            href={`/${tool.slug}`}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 min-h-[36px]',
              'bg-[#2605EF] hover:bg-[#1e04cc] active:bg-[#1803b3] text-white text-[11px] font-semibold font-display shadow-xs',
              'transition-all duration-150 active:scale-[0.97]',
              'opacity-0 group-hover:opacity-100',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2605EF] focus-visible:ring-offset-2 focus-visible:opacity-100',
            )}
            aria-label={`Launch ${tool.name}`}
          >
            Launch
            <ArrowUpRight className="h-3 w-3" aria-hidden />
          </a>
        ) : (
          <Link
            href={`/tools/${tool.slug}`}
            className="text-[11px] text-[#64748b] hover:text-[#2605EF] transition-colors opacity-0 group-hover:opacity-100 whitespace-nowrap font-medium focus-visible:opacity-100"
          >
            View →
          </Link>
        )}
      </div>
    </div>
  )
}
