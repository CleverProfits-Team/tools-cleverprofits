'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { PlusCircle } from 'lucide-react'

interface HeroBannerProps {
  firstName: string
  activeCount: number
  pendingCount: number
  totalCount: number
}

export function HeroBanner({ firstName, activeCount, pendingCount, totalCount }: HeroBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mouse, setMouse] = useState({ x: -1000, y: -1000 })

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  function handleMouseLeave() {
    setMouse({ x: -1000, y: -1000 })
  }

  const efficiencyPct = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 100

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-8 mb-0 relative overflow-hidden rounded-bl-[3rem] bg-hero-mesh"
    >
      {/* Radial glow — top-right (electric) */}
      <div
        className="absolute top-[-20%] right-[-10%] w-[50%] h-[150%] rounded-full opacity-50 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(38,5,239,0.20), transparent)' }}
        aria-hidden
      />
      {/* Radial glow — bottom-left (navy) */}
      <div
        className="absolute bottom-[-50%] left-[10%] w-[40%] h-[100%] rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(24,25,125,0.30), transparent)' }}
        aria-hidden
      />

      {/* Dot-grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
        aria-hidden
      />

      {/* Concentric ring system (Stitch signature) — anchored top-right, expanding outward */}
      <div className="absolute top-1/2 right-[-10%] -translate-y-1/2 pointer-events-none" aria-hidden>
        <div className="absolute -translate-x-1/2 -translate-y-1/2 w-[140px] h-[140px] rounded-full border border-white/[0.18]" />
        <div className="absolute -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] rounded-full border border-white/[0.12]" />
        <div className="absolute -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-white/[0.08]" />
        <div className="absolute -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full border border-white/[0.05]" />
        <div className="absolute -translate-x-1/2 -translate-y-1/2 w-[740px] h-[740px] rounded-full border border-white/[0.03]" />
      </div>

      {/* Mouse spotlight */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          background: `radial-gradient(500px circle at ${mouse.x}px ${mouse.y}px, rgba(38,5,239,0.22), rgba(38,5,239,0.06) 40%, transparent 65%)`,
        }}
        aria-hidden
      />

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 pt-14 sm:pt-20 pb-24">
        {/* Editorial top label — System Status + cycle marker */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-8">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#D5D4FF]">
            <span className="w-2 h-2 rounded-full bg-[#10B981] pulse-dot flex-shrink-0" aria-hidden />
            System Status — Optimal
          </p>
          {firstName && (
            <p className="text-white/45 text-[11px] font-semibold uppercase tracking-[0.12em]">
              · Welcome back, {firstName}
            </p>
          )}
        </div>

        {/* Asymmetric grid: headline left (8 cols), action right (4 cols) */}
        <div className="grid lg:grid-cols-12 gap-x-8 gap-y-6 items-end">
          <div className="lg:col-span-8 min-w-0">
            <h1 className="font-display font-bold text-white tracking-[-0.04em] leading-[0.95] text-5xl md:text-6xl lg:text-7xl">
              <span className="block">Operational pulse —</span>
              <span className="block">{efficiencyPct}% efficiency</span>
            </h1>
            <p className="text-white/65 text-base lg:text-lg font-light max-w-xl leading-relaxed mt-6">
              Cross-functional tools are operating at peak capacity.
            </p>
          </div>

          <div className="lg:col-span-4 flex lg:justify-end flex-shrink-0">
            <Link
              href="/dashboard/register"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-all focus-ring whitespace-nowrap"
            >
              <PlusCircle className="h-4 w-4" aria-hidden />
              Register Tool
            </Link>
          </div>
        </div>

        {/* Inline stats row */}
        {totalCount > 0 && (
          <div className="flex items-stretch mt-12 pt-6 border-t border-white/[0.08]">
            <div className="pr-7">
              <p className="text-[28px] font-display font-bold text-white tabular-nums leading-none tracking-[-0.02em]">
                {activeCount}
              </p>
              <p className="text-white/45 text-[11px] mt-1.5 uppercase tracking-[0.1em] font-semibold">Active</p>
            </div>

            <div className="w-px bg-white/[0.1] self-stretch" />

            <div className="px-7">
              <p className={`text-[28px] font-display font-bold tabular-nums leading-none tracking-[-0.02em] ${pendingCount > 0 ? 'text-[#F59E0B]' : 'text-white'}`}>
                {pendingCount}
              </p>
              <p className="text-white/45 text-[11px] mt-1.5 uppercase tracking-[0.1em] font-semibold">Pending</p>
            </div>

            <div className="w-px bg-white/[0.1] self-stretch" />

            <div className="pl-7">
              <p className="text-[28px] font-display font-bold text-white tabular-nums leading-none tracking-[-0.02em]">
                {totalCount}
              </p>
              <p className="text-white/45 text-[11px] mt-1.5 uppercase tracking-[0.1em] font-semibold">Total</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
