'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FilePen, Trash2, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/badge'
import type { SerializedTool } from '@/types'
import type { AnalysisStatus, ToolStatus } from '@prisma/client'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

type Filter = 'ALL' | ToolStatus

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ARCHIVED', label: 'Archived' },
]

function draftContinueUrl(draft: SerializedTool): string {
  if (draft.analysisStatus === 'PENDING_ANALYSIS')
    return `/dashboard/register/ownership/${draft.id}`
  if (draft.analysisStatus === 'ANALYZING') return `/dashboard/register/analyzing/${draft.id}`
  return `/dashboard/register/review/${draft.id}` // ANALYSIS_COMPLETE | ANALYSIS_FAILED
}

function draftStepLabel(status: AnalysisStatus): string {
  if (status === 'PENDING_ANALYSIS') return 'Step 2 of 4 — Ownership'
  if (status === 'ANALYZING') return 'Step 3 of 4 — Analyzing'
  if (status === 'ANALYSIS_FAILED') return 'Step 4 of 4 — Review (analysis failed)'
  return 'Step 4 of 4 — Review'
}

interface Props {
  tools: SerializedTool[]
  drafts: SerializedTool[]
}

export function MyToolsList({ tools, drafts: initialDrafts }: Props) {
  const [filter, setFilter] = useState<Filter>('ALL')
  const [drafts, setDrafts] = useState(initialDrafts)
  const [discarding, setDiscarding] = useState<string | null>(null)

  const filtered = filter === 'ALL' ? tools : tools.filter((t) => t.status === filter)

  const counts: Partial<Record<Filter, number>> = {
    ALL: tools.length,
    ACTIVE: tools.filter((t) => t.status === 'ACTIVE').length,
    PENDING: tools.filter((t) => t.status === 'PENDING').length,
    REJECTED: tools.filter((t) => t.status === 'REJECTED').length,
    ARCHIVED: tools.filter((t) => t.status === 'ARCHIVED').length,
  }

  async function discardDraft(id: string) {
    if (!confirm('Discard this draft? It will be permanently deleted.')) return
    setDiscarding(id)
    try {
      const res = await fetch(`/api/tools/draft/${id}`, { method: 'DELETE' })
      if (res.ok || res.status === 204) {
        setDrafts((prev) => prev.filter((d) => d.id !== id))
      }
    } finally {
      setDiscarding(null)
    }
  }

  const hasAnything = drafts.length > 0 || tools.length > 0

  if (!hasAnything) {
    return (
      <div className="rounded-2xl border border-[#E7E7E7] bg-white p-12 text-center shadow-card">
        <p className="text-[rgba(4,11,77,0.55)] text-sm mb-3">
          You haven&apos;t registered any tools yet.
        </p>
        <Link
          href="/dashboard/register"
          className="inline-flex items-center gap-1.5 rounded-[20px] bg-[#2605EF] px-4 py-2 text-sm font-medium font-display text-white hover:bg-[#1e04cc] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#2605EF] focus-visible:ring-offset-2"
        >
          Register your first tool
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ── Drafts section ──────────────────────────────────────────────── */}
      {drafts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FilePen className="h-4 w-4 text-[rgba(4,11,77,0.40)]" aria-hidden />
            <h2 className="text-sm font-semibold font-display text-[rgba(4,11,77,0.55)]">
              In progress ({drafts.length})
            </h2>
          </div>
          <div className="space-y-2">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="rounded-2xl border border-dashed border-[#E7E7E7] bg-[#FAFAFA]/60 p-4 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold font-display text-[#040B4D] truncate">{draft.name}</p>
                  <p className="text-xs text-[rgba(4,11,77,0.40)] mt-0.5">
                    {draftStepLabel(draft.analysisStatus as AnalysisStatus)} · Started{' '}
                    {formatDate(draft.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    href={draftContinueUrl(draft)}
                    className="inline-flex items-center gap-1 rounded-[20px] bg-[#2605EF] px-3 py-1.5 text-xs font-semibold font-display text-white hover:bg-[#1e04cc] active:bg-[#1803b3] active:scale-[0.97] transition-all duration-150 min-h-[36px] shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2605EF] focus-visible:ring-offset-2"
                  >
                    Continue
                    <ChevronRight className="h-3 w-3" aria-hidden />
                  </Link>
                  <button
                    onClick={() => discardDraft(draft.id)}
                    disabled={discarding === draft.id}
                    className="inline-flex items-center justify-center rounded-lg border border-[#E7E7E7] bg-white px-2.5 py-1.5 text-[rgba(4,11,77,0.40)] hover:text-red-500 hover:border-red-200 disabled:opacity-50 transition-colors duration-150 min-h-[36px] min-w-[36px] focus-visible:ring-2 focus-visible:ring-[#2605EF]/30 focus-visible:ring-offset-2"
                    title="Discard draft"
                    aria-label="Discard draft"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Submitted tools section ──────────────────────────────────────── */}
      {tools.length > 0 && (
        <div>
          {/* Filter tabs */}
          <div className="flex gap-1 flex-wrap mb-5">
            {FILTER_OPTIONS.filter((o) => (counts[o.value] ?? 0) > 0 || o.value === 'ALL').map(
              ({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium font-display transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#2605EF]/30 focus-visible:ring-offset-2',
                    filter === value
                      ? 'bg-[#2605EF] text-white'
                      : 'bg-[#FAFAFA] text-[rgba(4,11,77,0.55)] hover:bg-[#E7E7E7]',
                  )}
                >
                  {label}
                  <span
                    className={cn(
                      'inline-flex items-center justify-center rounded-full min-w-[1.1rem] h-4 px-1 text-xs',
                      filter === value
                        ? 'bg-[#1e04cc] text-white'
                        : 'bg-[#E7E7E7] text-[rgba(4,11,77,0.55)]',
                    )}
                  >
                    {counts[value] ?? 0}
                  </span>
                </button>
              ),
            )}
          </div>

          {/* List */}
          <div className="space-y-3">
            {filtered.length === 0 && (
              <p className="text-sm text-[rgba(4,11,77,0.55)] py-8 text-center">
                No {filter.toLowerCase()} tools.
              </p>
            )}
            {filtered.map((tool) => (
              <div
                key={tool.id}
                className={cn(
                  'rounded-2xl border bg-white p-5 shadow-card transition-colors',
                  tool.status === 'REJECTED' ? 'border-red-200' : 'border-[#E7E7E7]',
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold font-display text-[#040B4D]">{tool.name}</h3>
                      <StatusBadge status={tool.status} />
                    </div>
                    <p className="text-xs font-mono text-[rgba(4,11,77,0.40)] mt-0.5">
                      {tool.slug}
                    </p>
                    {tool.description && (
                      <p className="text-sm text-[rgba(4,11,77,0.55)] mt-2 line-clamp-2">
                        {tool.description}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-xs text-[rgba(4,11,77,0.40)] whitespace-nowrap">
                    {formatDate(tool.createdAt)}
                  </div>
                </div>

                {/* Rejection feedback + action */}
                {tool.status === 'REJECTED' && (
                  <div className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5">
                    {tool.rejectionReason ? (
                      <>
                        <p className="text-xs font-semibold text-red-700 mb-0.5">
                          Feedback from reviewer
                        </p>
                        <p className="text-xs text-red-700 leading-relaxed">
                          {tool.rejectionReason}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-red-700">
                        This tool was rejected. Edit it to address any issues.
                      </p>
                    )}
                    <Link
                      href={`/dashboard/tools/${tool.id}/edit`}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-[20px] bg-red-600 px-3 py-1.5 text-xs font-medium font-display text-white hover:bg-red-700 transition-colors duration-150 min-h-[36px] focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
                    >
                      Fix &amp; resubmit
                    </Link>
                  </div>
                )}

                {/* Footer */}
                <div className="mt-3 flex items-center gap-3">
                  <Link
                    href={`/tools/${tool.slug}`}
                    className="text-xs font-medium text-[#2605EF] hover:text-[#1803b3] hover:underline focus-visible:ring-2 focus-visible:ring-[#2605EF]/30 focus-visible:ring-offset-2 rounded"
                  >
                    View details →
                  </Link>
                  {tool.status === 'PENDING' && (
                    <Link
                      href={`/dashboard/tools/${tool.id}/edit`}
                      className="text-xs font-medium text-[rgba(4,11,77,0.55)] hover:text-[#040B4D] hover:underline focus-visible:ring-2 focus-visible:ring-[#2605EF]/30 focus-visible:ring-offset-2 rounded"
                    >
                      Edit →
                    </Link>
                  )}
                  {tool.status === 'ACTIVE' && (
                    <a
                      href={`/${tool.slug}`}
                      className="text-xs font-medium text-[#065F46] hover:text-[#10B981] hover:underline focus-visible:ring-2 focus-visible:ring-[#10B981]/30 focus-visible:ring-offset-2 rounded"
                    >
                      Launch →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edge case: only drafts, no submitted tools */}
      {tools.length === 0 && drafts.length > 0 && (
        <div className="rounded-2xl border border-[#E7E7E7] bg-white p-6 text-center">
          <p className="text-[rgba(4,11,77,0.55)] text-sm mb-3">
            No submitted tools yet. Finish a draft to submit.
          </p>
          <Link
            href="/dashboard/register"
            className="inline-flex items-center gap-1.5 rounded-[20px] bg-[#2605EF] px-4 py-2 text-sm font-medium font-display text-white hover:bg-[#1e04cc] transition-colors duration-150 min-h-[44px] focus-visible:ring-2 focus-visible:ring-[#2605EF] focus-visible:ring-offset-2"
          >
            Register a new tool
          </Link>
        </div>
      )}
    </div>
  )
}
