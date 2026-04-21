'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Rocket, ArrowRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OnboardingCardProps {
  firstName: string
  toolCount: number
}

export function OnboardingCard({ firstName, toolCount }: OnboardingCardProps) {
  const [dismissed, setDismissed] = useState(false)

  if (toolCount > 0 || dismissed) return null

  return (
    <section className="mb-8 animate-in">
      <div className="relative bg-white rounded-2xl border border-[#E7E7E7]/80 shadow-[0_1px_4px_0_rgba(4,11,77,0.06)] overflow-hidden">
        {/* Accent gradient top bar */}
        <div className="h-1 bg-gradient-to-r from-[#2605EF] to-[#1e04cc]" />

        <div className="p-6 flex items-start gap-5">
          <div className="h-12 w-12 rounded-xl bg-[#2605EF]/10 flex items-center justify-center flex-shrink-0">
            <Rocket className="h-6 w-6 text-[#2605EF]" aria-hidden />
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-lg text-[#040B4D] leading-tight mb-1">
              {firstName ? `Welcome, ${firstName}` : 'Welcome to CleverProfits Tools'}
            </h2>
            <p className="text-sm text-[rgba(4,11,77,0.55)] leading-relaxed mb-4 max-w-lg">
              This is where your team&rsquo;s internal tools live. Browse the tools below to get
              started, or register a tool your team is already using.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/register"
                className={cn(
                  'inline-flex items-center gap-2 rounded-[20px] px-4 py-2',
                  'bg-[#2605EF] hover:bg-[#1e04cc] text-white text-sm font-semibold font-display',
                  'shadow-xs transition-all duration-150 active:scale-[0.97]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2605EF] focus-visible:ring-offset-2',
                )}
              >
                Register a tool
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
              <button
                onClick={() => setDismissed(true)}
                className="text-sm text-[rgba(4,11,77,0.40)] hover:text-[rgba(4,11,77,0.55)] transition-colors font-medium px-2"
              >
                Dismiss
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-lg text-[rgba(4,11,77,0.40)] hover:text-[rgba(4,11,77,0.55)] hover:bg-[#FAFAFA] transition-colors flex-shrink-0"
            aria-label="Dismiss onboarding"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </section>
  )
}
