'use client'

import Link from 'next/link'
import { ArrowUpRight, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getToolAccent } from '@/lib/colors'

interface RecentTool {
  id: string
  name: string
  slug: string
  lastAccessedAt: string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function RecentTools({ tools }: { tools: RecentTool[] }) {
  if (tools.length === 0) return null

  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="h-5 w-5 rounded-full bg-[#040B4D]/8 flex items-center justify-center">
            <Clock className="h-3 w-3 text-[#040B4D]/50" aria-hidden />
          </div>
          <span className="font-display font-semibold text-xs tracking-widest uppercase text-[#040B4D]/50">
            Recently used
          </span>
        </div>
        <div className="flex-1 h-px bg-[#e2e8f0]" />
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
        {tools.map((tool) => {
          const accent = getToolAccent(tool.name)
          const initial = tool.name.charAt(0).toUpperCase()

          return (
            <a
              key={tool.id}
              href={`/${tool.slug}`}
              className={cn(
                'group flex items-center gap-3 bg-white rounded-xl border border-[#e2e8f0]/80',
                'px-4 py-3 min-w-[200px] max-w-[260px] flex-shrink-0',
                'shadow-[0_1px_4px_0_rgba(4,11,77,0.06)]',
                'hover:-translate-y-0.5 hover:shadow-[0_4px_16px_-2px_rgba(4,11,77,0.10)]',
                'transition-all duration-150 ease-out',
              )}
            >
              <div
                className={cn(
                  'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  'text-white text-[11px] font-bold select-none',
                  accent.bg,
                )}
                aria-hidden
              >
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display font-semibold text-[13px] text-[#040B4D] truncate leading-tight">
                  {tool.name}
                </p>
                <p className="text-[11px] text-[#94a3b8] mt-0.5">{timeAgo(tool.lastAccessedAt)}</p>
              </div>
              <ArrowUpRight
                className="h-3.5 w-3.5 text-[#94a3b8] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                aria-hidden
              />
            </a>
          )
        })}
      </div>
    </section>
  )
}
