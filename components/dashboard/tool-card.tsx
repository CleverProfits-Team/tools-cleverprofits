'use client'

import Link from 'next/link'
import { ArrowUpRight, User } from 'lucide-react'
import { StatusBadge, AccessBadge, Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toolUrl, toolDisplayUrl } from '@/lib/tool-url'
import type { SerializedTool } from '@/types'

// Brand-aligned per-tool accent palette — drawn from the brand scale + functional colors
const PALETTE = [
  { hex: '#2605EF' }, // Electric Blue
  { hex: '#1508AC' }, // Navy
  { hex: '#18197D' }, // Dark Navy
  { hex: '#0F0038' }, // Royal Blue
  { hex: '#6560F5' }, // Brand 400
  { hex: '#1E04CC' }, // Brand 700
  { hex: '#10B981' }, // Success
  { hex: '#F59E0B' }, // Warning
  { hex: '#1803B3' }, // Brand 800
  { hex: '#8A85FF' }, // Brand 300
]

function getAccent(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0
  }
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

interface ToolCardProps {
  tool: SerializedTool
}

export function ToolCard({ tool }: ToolCardProps) {
  const isActive = tool.status === 'ACTIVE'
  const accent   = getAccent(tool.name)
  const initial  = tool.name.charAt(0).toUpperCase()

  return (
    <article
      className={cn(
        'group relative flex flex-col bg-white rounded-2xl overflow-hidden',
        'border-l-4 border-t-0 border-r-0 border-b-0',
        'shadow-card',
        'transition-all duration-200 ease-out',
        'hover:-translate-y-1',
        'hover:shadow-card-hover',
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

      <div className="relative flex flex-col flex-1 p-5 pt-4">

        {/* Icon + status */}
        <div className="flex items-start justify-between mb-4">
          <div
            className={cn(
              'h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0',
              'text-white text-[15px] font-bold select-none',
              'shadow-[0_2px_10px_rgba(15,0,56,0.22)]',
              'transition-transform duration-200 group-hover:scale-[1.06]',
            )}
            style={{ backgroundColor: accent.hex }}
            aria-hidden
          >
            {initial}
          </div>
          <StatusBadge status={tool.status} />
        </div>

        {/* Name */}
        <Link
          href={`/tools/${tool.slug}`}
          className="font-display font-bold text-[15.5px] leading-snug text-[#0F0038] hover:text-[#2605EF] transition-colors mb-1 line-clamp-2 focus-ring rounded tracking-[-0.01em]"
        >
          {tool.name}
        </Link>

        {/* Subdomain */}
        <p className="text-[11px] font-mono text-[rgba(15,0,56,0.32)] mb-3 tracking-wide truncate">
          {toolDisplayUrl(tool.slug)}
        </p>

        {/* Description */}
        <p
          className={cn(
            'text-[12px] leading-relaxed line-clamp-2 mb-4 flex-1',
            tool.description ? 'text-[rgba(15,0,56,0.55)]' : 'text-[rgba(15,0,56,0.32)] italic',
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
              className="inline-flex items-center rounded-full bg-[#FAFAFA] px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-[rgba(15,0,56,0.55)]"
            >
              {tag.name}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-auto pt-3.5 border-t border-[#FAFAFA] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-[rgba(15,0,56,0.55)] min-w-0">
            <User className="h-3 w-3 flex-shrink-0" aria-hidden />
            <span className="truncate">{tool.createdByName}</span>
          </div>

          {isActive ? (
            <a
              href={toolUrl(tool.slug)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 flex-shrink-0',
                'bg-[#0F0038] hover:bg-[#2605EF] text-white text-[11px] font-bold whitespace-nowrap',
                'shadow-xs transition-all duration-150 active:scale-95',
                'group-hover:shadow-[0_0_0_3px_rgba(38,5,239,0.12)]',
              )}
              aria-label={`Launch ${tool.name}`}
            >
              Launch
              <ArrowUpRight className="h-3 w-3" aria-hidden />
            </a>
          ) : (
            <Link
              href={`/tools/${tool.slug}`}
              className="text-[11px] text-[rgba(15,0,56,0.55)] hover:text-[#2605EF] transition-colors flex-shrink-0 font-semibold whitespace-nowrap"
            >
              View →
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
