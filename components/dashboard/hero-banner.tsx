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

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-8 mb-8 bg-hero-mesh relative overflow-hidden"
    >
      {/* Dot-grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
        aria-hidden
      />
      {/* Decorative circle outlines — echo the bubble language */}
      <div className="absolute -top-20 right-8 w-72 h-72 rounded-full border border-white/[0.05] pointer-events-none" aria-hidden />
      <div className="absolute -bottom-16 right-1/4 w-52 h-52 rounded-full border border-white/[0.04] pointer-events-none" aria-hidden />
      <div className="absolute top-4 right-1/3 w-36 h-36 rounded-full border border-white/[0.03] pointer-events-none" aria-hidden />

      {/* Mouse spotlight */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          background: `radial-gradient(500px circle at ${mouse.x}px ${mouse.y}px, rgba(99,60,255,0.22), rgba(38,5,239,0.06) 40%, transparent 65%)`,
        }}
        aria-hidden
      />

      <div className="relative px-4 sm:px-6 lg:px-8 pt-9 pb-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {firstName && (
              <p className="text-xs font-display font-semibold tracking-widest uppercase text-[#2605EF] mb-1.5">
                Welcome back, {firstName}
              </p>
            )}
            <h1 className="font-display font-bold text-4xl text-white tracking-tight leading-none">
              Your tools
            </h1>
            <p className="text-white/45 text-sm mt-1.5">
              Launch, manage, and scale internal tools across CleverProfits.
            </p>
          </div>

          <Link
            href="/dashboard/register"
            className="inline-flex items-center gap-2 rounded-lg bg-[#2605EF] border border-transparent px-4 py-2.5 text-sm font-semibold font-display text-white hover:bg-[#1e04cc] active:bg-[#1803b3] active:scale-[0.97] shadow-xs transition-all duration-150 self-start sm:self-end flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2605EF] focus-visible:ring-offset-2"
          >
            <PlusCircle className="h-4 w-4" aria-hidden />
            Register Tool
          </Link>
        </div>

        {/* Inline stats row */}
        {totalCount > 0 && (
          <div className="flex items-stretch mt-7 pt-5 border-t border-white/[0.08]">
            <div className="pr-7">
              <p className="font-display font-bold text-5xl text-white tabular-nums leading-none">
                {activeCount}
              </p>
              <p className="text-xs font-display font-semibold tracking-widest uppercase text-white/50 mt-2">Active</p>
            </div>

            <div className="w-px bg-white/10 self-stretch" />

            <div className="px-7">
              <p className={`font-display font-bold text-5xl tabular-nums leading-none ${pendingCount > 0 ? 'text-amber-400' : 'text-white'}`}>
                {pendingCount}
              </p>
              <p className="text-xs font-display font-semibold tracking-widest uppercase text-white/50 mt-2">Pending</p>
            </div>

            <div className="w-px bg-white/10 self-stretch" />

            <div className="pl-7">
              <p className="font-display font-bold text-5xl text-white tabular-nums leading-none">
                {totalCount}
              </p>
              <p className="text-xs font-display font-semibold tracking-widest uppercase text-white/50 mt-2">Total</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
