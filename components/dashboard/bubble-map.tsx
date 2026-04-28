'use client'

import { useState } from 'react'
import Link from 'next/link'

// ─────────────────────────────────────────────────────────────────────────────
// Shared accent palette — same hash function as tool-card / tool-row
// ─────────────────────────────────────────────────────────────────────────────

const PALETTE = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e',
  '#0ea5e9', '#f97316', '#14b8a6', '#ec4899', '#6366f1',
]

function getColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return PALETTE[Math.abs(h) % PALETTE.length]
}

// Deterministic pseudo-random position — stable across renders
function getPos(name: string, index: number) {
  let h = index * 2654435761
  for (let i = 0; i < name.length; i++) h = (h * 17 + name.charCodeAt(i)) | 0
  const x = 6 + (Math.abs(h) % 76)
  h = (h * 6364136223846793005 + 1442695040888963407) | 0
  const y = 8 + (Math.abs(h) % 68)
  return { x, y }
}

export interface BubbleTool {
  id:   string
  name: string
  slug: string
  hasRecentHit: boolean
}

interface Props {
  tools:        BubbleTool[]
  activeHitIds: string[]
}

export function BubbleMap({ tools, activeHitIds }: Props) {
  const [hovered, setHovered] = useState<string | null>(null)
  const hitSet = new Set(activeHitIds)

  if (tools.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-slate-400">
        No active tools yet
      </div>
    )
  }

  return (
    <div className="relative w-full h-56 rounded-xl overflow-hidden"
      style={{ background: 'radial-gradient(ellipse 90% 70% at 50% 50%, rgba(38,5,239,0.04) 0%, transparent 70%), #F8FAFD' }}
    >
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgb(99 110 176 / 0.20) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
        aria-hidden
      />

      {/* Bubbles */}
      {tools.map((tool, i) => {
        const color   = getColor(tool.name)
        const { x, y } = getPos(tool.name, i)
        const active  = hitSet.has(tool.id)
        const size    = active ? 52 : 34
        const isHov   = hovered === tool.id

        return (
          <Link
            key={tool.id}
            href={`/dashboard/admin/tools/${tool.id}`}
            onMouseEnter={() => setHovered(tool.id)}
            onMouseLeave={() => setHovered(null)}
            aria-label={tool.name}
            style={{
              position:        'absolute',
              left:            `${x}%`,
              top:             `${y}%`,
              width:           size,
              height:          size,
              borderRadius:    '50%',
              backgroundColor: color,
              opacity:         isHov ? 1 : active ? 0.85 : 0.35,
              transform:       `translate(-50%, -50%) scale(${isHov ? 1.18 : 1})`,
              transition:      'all 0.18s ease',
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              fontSize:        active ? 13 : 10,
              fontWeight:      700,
              color:           'white',
              cursor:          'pointer',
              zIndex:          isHov ? 20 : active ? 2 : 1,
              boxShadow:       active ? `0 4px 18px ${color}55` : 'none',
              textDecoration:  'none',
            }}
          >
            {tool.name.charAt(0).toUpperCase()}
          </Link>
        )
      })}

      {/* Tooltip */}
      {hovered && (() => {
        const tool = tools.find((t) => t.id === hovered)
        if (!tool) return null
        const active = hitSet.has(tool.id)
        return (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-[#040B4D] text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg pointer-events-none z-30 whitespace-nowrap">
            <span
              className="h-1.5 w-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: active ? '#10b981' : '#94a3b8' }}
            />
            {tool.name}
            <span className="text-white/40 font-normal">{active ? '· active' : '· no recent activity'}</span>
          </div>
        )
      })()}

      {/* Legend */}
      <div className="absolute top-3 right-3 flex items-center gap-3 text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-400 opacity-85" />
          Active (30d)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-slate-300 opacity-50" />
          Inactive
        </span>
      </div>
    </div>
  )
}
