'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, AlertCircle, Loader2, RefreshCw, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WizardShell } from '@/components/forms/wizard-shell'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type StepStatus = 'pending' | 'active' | 'done' | 'error'

const STEP_META = [
  { label: 'Connecting', detail: 'Reaching the tool URL' },
  { label: 'Reading content', detail: 'Extracting page text and headings' },
  { label: 'AI analysis', detail: 'Generating summary and metadata' },
  { label: 'Overlap check', detail: 'Comparing with existing tools' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function AnalyzingPage({ params }: { params: { draftId: string } }) {
  const { draftId } = params
  const router = useRouter()

  const [statuses, setStatuses] = useState<StepStatus[]>([
    'active',
    'pending',
    'pending',
    'pending',
  ])
  const [failed, setFailed] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const [run, setRun] = useState(0) // incrementing re-triggers the effect

  // Stored so we can cancel pending timeouts / interval on complete or re-run
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    let alive = true
    const timeoutIds: ReturnType<typeof setTimeout>[] = []
    let pollId: ReturnType<typeof setInterval>

    function after(fn: () => void, ms: number) {
      const id = setTimeout(() => {
        if (alive) fn()
      }, ms)
      timeoutIds.push(id)
    }

    function cancelAll() {
      alive = false
      clearInterval(pollId)
      timeoutIds.forEach(clearTimeout)
    }

    cleanupRef.current = cancelAll

    // ── Reset state ─────────────────────────────────────────────────────────
    setStatuses(['active', 'pending', 'pending', 'pending'])
    setFailed(false)
    setErrMsg('')

    // ── Fake progress for visual feedback ───────────────────────────────────
    after(() => setStatuses(['done', 'active', 'pending', 'pending']), 1500)
    after(() => setStatuses(['done', 'done', 'active', 'pending']), 4000)
    after(() => setStatuses(['done', 'done', 'done', 'active']), 8000)

    // ── Polling ─────────────────────────────────────────────────────────────
    async function poll() {
      if (!alive) return
      try {
        const res = await fetch(`/api/tools/${draftId}/analysis-status`)
        const data = await res.json()
        if (!alive) return

        if (!res.ok) {
          cancelAll()
          setFailed(true)
          setErrMsg(data?.error ?? 'Could not check analysis status')
          return
        }

        if (data.analysisStatus === 'ANALYSIS_COMPLETE') {
          cancelAll()
          setStatuses(['done', 'done', 'done', 'done'])
          setTimeout(() => router.push(`/dashboard/register/review/${draftId}`), 700)
        } else if (data.analysisStatus === 'ANALYSIS_FAILED') {
          cancelAll()
          setStatuses((prev) => {
            const activeIdx = prev.findIndex((s) => s === 'active')
            const errorAt = activeIdx === -1 ? prev.filter((s) => s === 'done').length : activeIdx
            return prev.map((s, i) => (i < errorAt ? 'done' : i === errorAt ? 'error' : 'pending'))
          })
          setFailed(true)
          setErrMsg(data.analysisError ?? 'Analysis failed — see error above')
        }
        // ANALYZING / PENDING_ANALYSIS → keep polling
      } catch {
        // transient network blip — keep polling
      }
    }

    pollId = setInterval(poll, 2000)
    poll() // immediate first check

    // ── Trigger analysis ─────────────────────────────────────────────────────
    fetch(`/api/tools/${draftId}/analyze`, { method: 'POST' }).catch(() => {
      // If this fails, the poll will eventually see ANALYSIS_FAILED
    })

    return cancelAll
  }, [draftId, run]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────
  // Retry — increment `run` to re-trigger the effect
  // ─────────────────────────────────────────────────────────────────────────
  function handleRetry() {
    cleanupRef.current?.()
    setRun((r) => r + 1)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <WizardShell
      currentStep={3}
      title={failed ? 'Analysis ran into an issue' : 'Analyzing your tool…'}
      subtitle={!failed ? 'This usually takes 5–15 seconds. Hang tight.' : undefined}
    >
      {/* ── Progress steps ─────────────────────────────────────────── */}
      <div className="space-y-2.5 mb-8">
        {STEP_META.map((step, i) => {
          const status = statuses[i]
          return (
            <div
              key={i}
              className={cn(
                'flex items-center gap-4 rounded-xl border px-4 py-3 transition-all duration-300',
                status === 'done' && 'border-emerald-200 bg-emerald-50',
                status === 'active' && 'border-[#2605EF]/25 bg-[#2605EF]/[0.04]',
                status === 'error' && 'border-red-200 bg-red-50',
                status === 'pending' && 'border-[#E7E7E7] bg-white',
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  'h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
                  status === 'done' && 'bg-emerald-100',
                  status === 'active' && 'bg-[#2605EF]/10',
                  status === 'error' && 'bg-red-100',
                  status === 'pending' && 'bg-[#FAFAFA]',
                )}
              >
                {status === 'done' && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                {status === 'active' && (
                  <Loader2 className="h-3.5 w-3.5 text-[#2605EF] animate-spin" />
                )}
                {status === 'error' && <AlertCircle className="h-3.5 w-3.5 text-red-500" />}
                {status === 'pending' && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[rgba(4,11,77,0.40)]" />
                )}
              </div>

              {/* Text */}
              <div className="flex-1">
                <p
                  className={cn(
                    'text-sm font-semibold leading-none mb-0.5',
                    status === 'done' && 'text-emerald-700',
                    status === 'active' && 'text-[#040B4D]',
                    status === 'error' && 'text-red-700',
                    status === 'pending' && 'text-[rgba(4,11,77,0.40)]',
                  )}
                >
                  {step.label}
                </p>
                <p
                  className={cn(
                    'text-xs',
                    status === 'pending' ? 'text-[#E7E7E7]' : 'text-[rgba(4,11,77,0.55)]',
                  )}
                >
                  {step.detail}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Failure state ──────────────────────────────────────────── */}
      {failed && (
        <div className="space-y-4">
          {errMsg && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden />
              <span>{errMsg}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Button onClick={handleRetry}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden />
              Retry analysis
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push(`/dashboard/register/review/${draftId}`)}
            >
              <SkipForward className="h-3.5 w-3.5 mr-1.5" aria-hidden />
              Continue without AI
            </Button>
          </div>
          <p className="text-xs text-[rgba(4,11,77,0.40)]">
            You can fill in the details manually on the next step.
          </p>
        </div>
      )}
    </WizardShell>
  )
}
