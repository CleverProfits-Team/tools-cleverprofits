import type { ReactNode } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// PageHeader — shared mini-hero used by all inner dashboard pages.
// Mirrors the HeroBanner visual language (dark navy mesh, bubble circles,
// left-edge sidebar merge, bottom fade) so navigation feels seamless.
// ─────────────────────────────────────────────────────────────────────────────

interface PageHeaderProps {
  title:    string
  subtitle: string
  label?:   string      // optional ALL-CAPS technical label above title
  action?:  ReactNode   // e.g. a <Link> CTA — rendered at the right
}

export function PageHeader({ title, subtitle, label, action }: PageHeaderProps) {
  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-8 mb-8 bg-hero-mesh relative overflow-hidden">

      {/* Dot-grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)',
          backgroundSize:  '22px 22px',
        }}
        aria-hidden
      />

      {/* Left-edge merge gradient — blends header into sidebar */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to right, rgba(15,0,56,0.55) 0%, transparent 28%)' }}
        aria-hidden
      />

      {/* Bottom fade — dissolves into content area */}
      <div
        className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, #f9f9f9)' }}
        aria-hidden
      />

      {/* Decorative circle outlines — echo the bubble language */}
      <div className="absolute -top-16 right-6 w-52 h-52 rounded-full border border-white/[0.05] pointer-events-none" aria-hidden />
      <div className="absolute -bottom-10 right-1/3 w-36 h-36 rounded-full border border-white/[0.04] pointer-events-none" aria-hidden />
      <div className="absolute top-2 right-1/4 w-24 h-24 rounded-full border border-white/[0.03] pointer-events-none" aria-hidden />

      <div className="relative px-4 sm:px-6 lg:px-8 pt-7 pb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {/* Technical label — Kinetic Editor signature element */}
            {label && (
              <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300 mb-1">
                {label}
              </span>
            )}
            <h1 className="font-display font-bold text-[26px] text-white tracking-tight leading-none">
              {title}
            </h1>
            <p className="text-white/45 text-sm mt-1.5">{subtitle}</p>
          </div>
          {action && (
            <div className="self-start sm:self-end flex-shrink-0">
              {action}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
