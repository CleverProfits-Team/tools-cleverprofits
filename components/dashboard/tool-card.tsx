import Link from 'next/link'
import { ArrowUpRight, User } from 'lucide-react'
import { StatusBadge, AccessBadge, Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SerializedTool } from '@/types'

// ── Deterministic accent color from tool name ─────────────────────────────────
// Each entry has a Tailwind bg class (icon) and a hex value (accent stripe).

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
        'group relative flex flex-col bg-white rounded-2xl border shadow-card overflow-hidden',
        'transition-all duration-200',
        isActive
          ? 'border-slate-200/70 hover:shadow-card-hover hover:-translate-y-[2px] hover:border-[#2605EF]/25 cursor-pointer'
          : 'border-slate-200/70 opacity-85',
      )}
    >
      {/* ── Colored accent stripe ──────────────────────────── */}
      <div className="h-[3px] w-full flex-shrink-0" style={{ backgroundColor: accent.hex }} />

      <div className="p-5 flex flex-col flex-1">

        {/* ── Header: icon + name + badge ────────────────────── */}
        <div className="flex items-start gap-3 mb-3.5">
          <div
            className={cn(
              'h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0',
              'text-white text-sm font-bold select-none shadow-xs',
              accent.bg,
            )}
            aria-hidden
          >
            {initial}
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <Link
              href={`/tools/${tool.slug}`}
              className="font-semibold text-[#040B4D] text-[15px] leading-snug block hover:text-[#2605EF] transition-colors focus-ring rounded"
            >
              {tool.name}
            </Link>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">/{tool.slug}</p>
          </div>

          <div className="flex-shrink-0 pt-0.5">
            <StatusBadge status={tool.status} />
          </div>
        </div>

        {/* ── Description ────────────────────────────────────── */}
        <p
          className={cn(
            'text-[13px] leading-relaxed line-clamp-2 mb-4 flex-1',
            tool.description ? 'text-slate-500' : 'text-slate-300 italic',
          )}
        >
          {tool.description ?? 'No description provided'}
        </p>

        {/* ── Chips: access + team + tags ────────────────────── */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <AccessBadge level={tool.accessLevel} />
          {tool.team && <Badge>{tool.team}</Badge>}
          {(tool.tags ?? []).map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500"
            >
              {tag.name}
            </span>
          ))}
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-3.5 border-t border-slate-100 gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 min-w-0">
            <User className="h-3 w-3 flex-shrink-0" aria-hidden />
            <span className="truncate">{tool.createdByName}</span>
          </div>

          {isActive ? (
            <a
              href={`/${tool.slug}`}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5',
                'text-[11px] font-semibold text-white shadow-xs flex-shrink-0',
                'bg-[#040B4D] hover:bg-[#2605EF]',
                'transition-all duration-150 active:scale-95',
              )}
              aria-label={`Launch ${tool.name}`}
            >
              Launch
              <ArrowUpRight className="h-3 w-3" aria-hidden />
            </a>
          ) : (
            <Link
              href={`/tools/${tool.slug}`}
              className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
            >
              View →
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
