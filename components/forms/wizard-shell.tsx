'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 1, label: 'Identify'  },
  { id: 2, label: 'Ownership' },
  { id: 3, label: 'Analysis'  },
  { id: 4, label: 'Review'    },
]

interface WizardShellProps {
  currentStep: 1 | 2 | 3 | 4
  title:       string
  subtitle?:   string
  maxWidth?:   string
  children:    React.ReactNode
}

export function WizardShell({
  currentStep,
  title,
  subtitle,
  maxWidth = 'max-w-xl',
  children,
}: WizardShellProps) {
  return (
    <div className={cn('mx-auto', maxWidth)}>
      {/* ── Step indicator ────────────────────────────────────────── */}
      <div className="flex items-start mb-10">
        {STEPS.map((step, i) => {
          const done   = step.id < currentStep
          const active = step.id === currentStep
          return (
            <div key={step.id} className="flex items-start">
              <div className="flex flex-col items-center">
                <div className={cn(
                  'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold font-display transition-all duration-200',
                  done   && 'bg-[#2605EF] text-white',
                  active && 'bg-[#040B4D] text-white ring-4 ring-[#040B4D]/10',
                  !done && !active && 'bg-[#f4f3f3] text-[#94a3b8]',
                )}>
                  {done ? <Check className="h-3.5 w-3.5" /> : step.id}
                </div>
                <span className={cn(
                  'mt-1.5 text-[11px] font-semibold font-display whitespace-nowrap',
                  done   && 'text-[#2605EF]',
                  active && 'text-[#040B4D]',
                  !done && !active && 'text-[#94a3b8]',
                )}>
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  'mt-3.5 h-px w-10 sm:w-16 mx-3 transition-colors duration-200',
                  done ? 'bg-[#2605EF]' : 'bg-[#e2e8f0]',
                )} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-[#040B4D] tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-[#64748b] mt-1.5">{subtitle}</p>
        )}
      </div>

      {children}
    </div>
  )
}
