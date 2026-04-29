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

      {/* Decorative bubble outlines */}
      <div className="absolute -top-20 right-8 w-72 h-72 rounded-full border border-white/[0.05] pointer-events-none" aria-hidden />
      <div className="absolute -bottom-16 right-1/4 w-52 h-52 rounded-full border border-white/[0.04] pointer-events-none" aria-hidden />
      <div className="absolute top-4 right-1/3 w-36 h-36 rounded-full border border-white/[0.03] pointer-events-none" aria-hidden />

      {/* Mouse spotlight */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          background: `radial-gradient(500px circle at ${mouse.x}px ${mouse.y}px, rgba(38,5,239,0.22), rgba(38,5,239,0.06) 40%, transparent 65%)`,
        }}
        aria-hidden
      />

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 pt-10 pb-20">
        <div className="flex justify-between items-start gap-4">
          {/* Left: headline block */}
          <div className="max-w-2xl">
            {/* System status */}
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#D5D4FF] mb-2">
              <span className="w-2 h-2 rounded-full bg-[#10B981] pulse-dot flex-shrink-0" aria-hidden />
              System Status — Optimal
            </p>

            {/* Welcome line */}
            {firstName && (
              <p className="text-white/45 text-[11px] font-semibold uppercase tracking-[0.12em] mb-2">
                Welcome back, {firstName}
              </p>
            )}

            {/* Headline */}
            <h1 className="font-display text-4xl md:text-5xl font-bold leading-[1.1] tracking-[-0.03em] mb-4 text-white">
              Operational pulse — {efficiencyPct}% efficiency
            </h1>

            <p className="text-white/65 text-base font-light max-w-xl leading-relaxed">
              Cross-functional tools are operating at peak capacity.
            </p>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              href="/dashboard/register"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-lg text-sm text-white transition-all focus-ring"
            >
              <PlusCircle className="h-4 w-4" aria-hidden />
              Register Tool
            </Link>
          </div>
        </div>

        {/* Inline stats row */}
        {totalCount > 0 && (
          <div className="flex items-stretch mt-8 pt-5 border-t border-white/[0.08]">
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
