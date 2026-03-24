'use client'

import Link from 'next/link'
import { ArrowUpRight, User } from 'lucide-react'
import { StatusBadge, AccessBadge, Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SerializedTool } from '@/types'

const PALETTE = [
  { bg: 'bg-blue-500',    hex: '#3b82f6' },
  { bg: 'bg-violet-500',  hex: '#8b5cf6' },
  { bg: 'bg-emerald-500', hex: '#10b981' },
  { bg: 'bg-amber-500',   hex: '#f59e0b' },
  { bg: 'bg-rose-500',    hex: '#f43f5e' },
  { bg: 'bg-sky-500',     hex: '#0ea5e9' },
  { bg: 'bg-orange-500',  hex: '#f97316' },
  { bg: 'bg-teal-500',    hex: '#14b8a6' },
  { bg: 'bg-pink-500',    hex: '#ec4899' },
  { bg: 'bg-indigo-500',  hex: '#6366f1' },
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
        'group relative flex flex-col bg-white rounded-xl overflow-hidden',
        'border border-slate-100 border-l-[3px]',
        'transition-all duration-200 ease-out',
        'hover:-translate-y-1',
        'hover:shadow-[0_16px_40px_rgba(4,11,77,0.10),0_4px_12px_rgba(4,11,77,0.06)]',
        'hover:border-slate-200/60',
        !isActive && 'opacity-80',
      )}
      style={{ borderLeftColor: accent.hex }}
    >
      {/* Per-tool atmospheric glow — each card has its own light source */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(ellipse 110% 160% at -5% -15%, ${accent.hex}16 0%, transparent 55%)`,
        }}
        aria-hidden
      />

      {/* Body */}
      <div className="relative flex flex-col flex-1 p-5 pt-4">

        {/* Icon + status */}
        <div className="flex items-start justify-between mb-4">
          <div
            className={cn(
              'h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0',
              'text-white text-[15px] font-bold select-none',
              'shadow-[0_2px_10px_rgba(4,11,77,0.22)]',
              'transition-transform duration-200 group-hover:scale-[1.06]',
              accent.bg,
            )}
            aria-hidden
          >
            {initial}
          </div>
          <StatusBadge status={tool.status} />
        </div>

        {/* Name */}
        <Link
          href={`/tools/${tool.slug}`}
          className="font-display font-bold text-[15.5px] leading-snug text-[#040B4D] hover:text-[#2605EF] transition-colors mb-1 line-clamp-2 focus-ring rounded"
        >
          {tool.name}
        </Link>

        {/* Slug */}
        <p className="text-[11px] font-mono text-slate-300 mb-3 tracking-wide">
          /{tool.slug}
        </p>

        {/* Description */}
        <p
          className={cn(
            'text-[12.5px] leading-relaxed line-clamp-2 mb-4 flex-1',
            tool.description ? 'text-slate-400' : 'text-slate-300 italic',
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
              className="inline-flex items-center rounded bg-slate-50 border border-slate-100 px-2 py-0.5 text-[10.5px] font-medium text-slate-400"
            >
              {tag.name}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-auto pt-3.5 border-t border-slate-50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-300 min-w-0">
            <User className="h-3 w-3 flex-shrink-0" aria-hidden />
            <span className="truncate">{tool.createdByName}</span>
          </div>

          {isActive ? (
            <a
              href={`/${tool.slug}`}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 flex-shrink-0',
                'bg-[#040B4D] hover:bg-[#2605EF] text-white text-[11px] font-semibold',
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
              className="text-[11px] text-slate-400 hover:text-[#2605EF] transition-colors flex-shrink-0 font-medium"
            >
              View →
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
