'use client'

import Link from 'next/link'
import { ArrowUpRight, User, Activity } from 'lucide-react'
import { StatusBadge, AccessBadge, Badge } from '@/components/ui/badge'
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

interface ToolCardProps {
  tool: SerializedTool
  isFavorited?: boolean
}

export function ToolCard({ tool, isFavorited = false }: ToolCardProps) {
  const isActive = tool.status === 'ACTIVE'
  const accent = getToolAccent(tool.name)
  const initial = tool.name.charAt(0).toUpperCase()

  return (
    <article
      className={cn(
        'group relative flex flex-col bg-white rounded-2xl overflow-hidden',
        'border border-[#E7E7E7]/80 border-l-[3px]',
        'shadow-card transition-all duration-150 ease-out',
        'hover:-translate-y-1',
        'hover:shadow-card-hover',
        'hover:border-[#E7E7E7]',
        !isActive && 'opacity-80',
      )}
      style={{ borderLeftColor: accent.hex }}
    >
      {/* Per-tool atmospheric glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(ellipse 110% 160% at -5% -15%, ${accent.hex}16 0%, transparent 55%)`,
        }}
        aria-hidden
      />

      {/* Body */}
      <div className="relative flex flex-col flex-1 p-5 pt-4">
        {/* Icon + status + favorite */}
        <div className="flex items-start justify-between mb-4">
          <div
            className={cn(
              'h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0',
              'text-white text-[15px] font-bold select-none',
              'shadow-[0_2px_10px_rgba(4,11,77,0.22)]',
              'transition-transform duration-200 group-hover:scale-[1.06]',
              accent.bg,
            )}
            aria-hidden
          >
            {initial}
          </div>
          <div className="flex items-center gap-1">
            <FavoriteButton toolId={tool.id} initialFavorited={isFavorited} />
            <StatusBadge status={tool.status} />
          </div>
        </div>

        {/* Name */}
        <Link
          href={`/tools/${tool.slug}`}
          className="font-display font-semibold text-base leading-snug text-[#040B4D] hover:text-[#2605EF] transition-colors mb-3 line-clamp-2 focus-visible:ring-2 focus-visible:ring-[#2605EF]/30 focus-visible:ring-offset-2 rounded"
        >
          {tool.name}
        </Link>

        {/* Description */}
        <p
          className={cn(
            'text-[12.5px] leading-relaxed line-clamp-2 mb-4 flex-1 font-sans',
            tool.description ? 'text-[rgba(4,11,77,0.55)]' : 'text-[rgba(4,11,77,0.40)] italic',
          )}
        >
          {tool.description ?? 'No description provided'}
        </p>

        {/* Chips: access + team + tags */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <AccessBadge level={tool.accessLevel} />
          {tool.team && <Badge>{tool.team}</Badge>}
          {(tool.tags ?? []).map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center rounded bg-[#FAFAFA] border border-[#E7E7E7] px-2 py-0.5 text-[10.5px] font-medium text-[rgba(4,11,77,0.55)]"
            >
              {tag.name}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-auto pt-3.5 border-t border-[#E7E7E7]/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-[11px] text-[rgba(4,11,77,0.40)] min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <User className="h-3 w-3 flex-shrink-0" aria-hidden />
              <span className="truncate">{tool.createdByName}</span>
            </div>
            {tool.lastAccessedAt && (
              <div
                className="flex items-center gap-1 flex-shrink-0"
                title={`Last used ${timeAgo(tool.lastAccessedAt)}`}
              >
                <Activity className="h-3 w-3" aria-hidden />
                <span>{timeAgo(tool.lastAccessedAt)}</span>
              </div>
            )}
          </div>

          {isActive ? (
            <a
              href={`/${tool.slug}`}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-[20px] px-3.5 py-1.5 flex-shrink-0 min-h-[36px]',
                'bg-[#2605EF] hover:bg-[#1e04cc] active:bg-[#1803b3] text-white text-[11px] font-semibold font-display',
                'shadow-xs transition-all duration-150 active:scale-[0.97]',
                'group-hover:shadow-[0_0_0_3px_rgba(38,5,239,0.15)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2605EF] focus-visible:ring-offset-2',
              )}
              aria-label={`Launch ${tool.name}`}
            >
              Launch
              <ArrowUpRight className="h-3 w-3" aria-hidden />
            </a>
          ) : (
            <Link
              href={`/tools/${tool.slug}`}
              className="text-[11px] text-[rgba(4,11,77,0.55)] hover:text-[#2605EF] transition-colors flex-shrink-0 font-medium focus-visible:ring-2 focus-visible:ring-[#2605EF]/30 focus-visible:ring-offset-2 rounded"
            >
              View →
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
