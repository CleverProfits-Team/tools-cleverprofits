'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { StatusBadge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toolUrl, toolDisplayUrl } from '@/lib/tool-url'
import type { SerializedTool } from '@/types'

// Brand-aligned per-tool accent palette — mirrors tool-card.tsx
const PALETTE = [
  { hex: '#2605EF' },
  { hex: '#1508AC' },
  { hex: '#18197D' },
  { hex: '#0F0038' },
  { hex: '#6560F5' },
  { hex: '#1E04CC' },
  { hex: '#10B981' },
  { hex: '#F59E0B' },
  { hex: '#1803B3' },
  { hex: '#8A85FF' },
]

function getAccent(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0
  }
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

interface ToolRowProps {
  tool: SerializedTool
}

export function ToolRow({ tool }: ToolRowProps) {
  const isActive = tool.status === 'ACTIVE'
  const accent   = getAccent(tool.name)
  const initial  = tool.name.charAt(0).toUpperCase()

  return (
    <div
      className={cn(
        'group relative flex items-center gap-3.5 px-4 py-3',
        'border-b border-[#FAFAFA] last:border-b-0',
        'transition-colors duration-150',
        'hover:bg-[#FAFAFA]',
      )}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-[2px] rounded-r-full transition-opacity duration-200 opacity-[0.28] group-hover:opacity-100"
        style={{ backgroundColor: accent.hex }}
        aria-hidden
      />

      <div
        className={cn(
          'h-7 w-7 rounded-md flex items-center justify-center flex-shrink-0',
          'text-white text-[10px] font-bold select-none',
          'transition-transform duration-150 group-hover:scale-[1.08]',
        )}
        style={{ backgroundColor: accent.hex }}
        aria-hidden
      >
        {initial}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <Link
            href={`/tools/${tool.slug}`}
            className="font-bold text-[13px] text-[#0F0038] hover:text-[#2605EF] transition-colors leading-tight focus-ring rounded tracking-[-0.01em]"
          >
            {tool.name}
          </Link>
          <span className="hidden sm:inline text-[10.5px] font-mono text-[rgba(15,0,56,0.32)] leading-tight truncate">
            {toolDisplayUrl(tool.slug)}
          </span>
        </div>
        {tool.description && (
          <p className="text-[11.5px] text-[rgba(15,0,56,0.55)] mt-0.5 truncate max-w-2xl">
            {tool.description}
          </p>
        )}
      </div>

      <div className="hidden lg:flex items-center gap-1.5 flex-shrink-0">
        {tool.team && (
          <span className="rounded-full bg-[#FAFAFA] border border-[#E7E7E7] px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-[rgba(15,0,56,0.55)]">
            {tool.team}
          </span>
        )}
        {(tool.tags ?? []).slice(0, 2).map((tag) => (
          <span
            key={tag.id}
            className="rounded-full bg-[#FAFAFA] border border-[#E7E7E7] px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-[rgba(15,0,56,0.55)]"
          >
            {tag.name}
          </span>
        ))}
      </div>

      <div className="flex-shrink-0 hidden sm:block">
        <StatusBadge status={tool.status} />
      </div>

      <div className="flex-shrink-0 w-[72px] flex justify-end">
        {isActive ? (
          <a
            href={toolUrl(tool.slug)}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 whitespace-nowrap',
              'bg-[#0F0038] hover:bg-[#2605EF] text-white text-[11px] font-bold shadow-xs',
              'transition-all duration-150 active:scale-95',
              'opacity-0 group-hover:opacity-100',
            )}
            aria-label={`Launch ${tool.name}`}
          >
            Launch
            <ArrowUpRight className="h-3 w-3" aria-hidden />
          </a>
        ) : (
          <Link
            href={`/tools/${tool.slug}`}
            className="text-[11px] text-[rgba(15,0,56,0.55)] hover:text-[#2605EF] transition-colors opacity-0 group-hover:opacity-100 whitespace-nowrap font-semibold"
          >
            View →
          </Link>
        )}
      </div>
    </div>
  )
}
