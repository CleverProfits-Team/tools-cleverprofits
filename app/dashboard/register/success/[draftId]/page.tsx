'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Copy, Check, ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ToolBrief {
  id:   string
  name: string
  slug: string
}

export default function SuccessPage({ params }: { params: { draftId: string } }) {
  const { draftId } = params
  const router      = useRouter()

  const [tool,   setTool]   = useState<ToolBrief | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch(`/api/tools/${draftId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setTool(d)
      })
      .catch(() => {})
  }, [draftId])

  const platformUrl = tool
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://cleverprofits.app'}/${tool.slug}`
    : null

  async function copyUrl() {
    if (!platformUrl) return
    await navigator.clipboard.writeText(platformUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!tool) {
    return (
      <div className="max-w-md mx-auto py-16 flex items-center gap-2 text-[rgba(15,0,56,0.40)]">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        <span className="text-sm">Loading…</span>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto py-12 flex flex-col items-center text-center">
      {/* ── Icon ──────────────────────────────────────────────────── */}
      <div className="h-14 w-14 rounded-full bg-[rgba(16,185,129,0.10)] ring-1 ring-emerald-200 flex items-center justify-center mb-5">
        <CheckCircle2 className="h-7 w-7 text-[#10B981]" aria-hidden />
      </div>

      {/* ── Heading ───────────────────────────────────────────────── */}
      <h1 className="font-display font-bold text-2xl text-[#0F0038] tracking-[-0.02em] mb-2">
        Tool submitted!
      </h1>
      <p className="text-sm text-[rgba(15,0,56,0.55)] mb-1">
        <span className="font-semibold text-[#0F0038]">{tool.name}</span> is now pending admin review.
      </p>
      <p className="text-sm text-[rgba(15,0,56,0.40)] mb-8">
        You&apos;ll see it go live in <span className="text-[rgba(15,0,56,0.55)] font-medium">My Tools</span> once approved.
      </p>

      {/* ── Reserved URL pill ─────────────────────────────────────── */}
      {platformUrl && (
        <div className="w-full flex items-center gap-2 bg-[#FAFAFA] border border-[#E7E7E7] rounded-xl px-4 py-3 mb-8">
          <ExternalLink className="h-3.5 w-3.5 text-[rgba(15,0,56,0.40)] flex-shrink-0" aria-hidden />
          <span className="text-sm font-mono text-[#0F0038] flex-1 min-w-0 truncate">
            {platformUrl}
          </span>
          <button
            onClick={copyUrl}
            className="flex-shrink-0 text-[rgba(15,0,56,0.40)] hover:text-[rgba(15,0,56,0.65)] transition-colors"
            aria-label="Copy URL"
          >
            {copied
              ? <Check className="h-3.5 w-3.5 text-[#10B981]" aria-hidden />
              : <Copy className="h-3.5 w-3.5" aria-hidden />
            }
          </button>
        </div>
      )}

      {/* ── CTAs ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
        <Button
          className="w-full sm:w-auto"
          onClick={() => router.push('/dashboard/my-tools')}
        >
          View my submissions
        </Button>
        <Button
          variant="secondary"
          className="w-full sm:w-auto"
          onClick={() => router.push('/dashboard')}
        >
          Back to dashboard
        </Button>
        <Link
          href="/dashboard/register/identify"
          className="text-sm font-medium text-[rgba(15,0,56,0.40)] hover:text-[rgba(15,0,56,0.65)] transition-colors"
        >
          Register another
        </Link>
      </div>
    </div>
  )
}
