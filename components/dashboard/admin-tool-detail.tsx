'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ExternalLink, CheckCircle2, XCircle, Archive,
  RotateCcw, Pencil, Sparkles, AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SerializedTool } from '@/types'
import type { ToolStatus } from '@prisma/client'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ToolStatusBadge({ status }: { status: ToolStatus }) {
  const styles: Record<ToolStatus, string> = {
    DRAFT:    'bg-[#f4f3f3] text-[#94a3b8]',
    ACTIVE:   'bg-emerald-100 text-emerald-700',
    PENDING:  'bg-amber-100 text-amber-700',
    ARCHIVED: 'bg-[#f4f3f3] text-[#64748b]',
    REJECTED: 'bg-red-100 text-red-700',
  }
  return (
    <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-xs font-medium font-display', styles[status])}>
      {status}
    </span>
  )
}

function ConfidenceBadge({ value }: { value: number | null }) {
  if (value === null || value === undefined) return null
  const pct  = Math.round(value * 100)
  const color = value >= 0.7 ? 'bg-emerald-100 text-emerald-700'
              : value >= 0.4 ? 'bg-amber-100 text-amber-700'
              : 'bg-red-100 text-red-700'
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium font-display', color)}>
      {pct}% confidence
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  tool: SerializedTool
  currentUserEmail: string
  currentUserRole: string
}

export function AdminToolDetail({ tool: initialTool, currentUserEmail, currentUserRole }: Props) {
  const router = useRouter()
  const [tool, setTool]                       = useState(initialTool)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason]       = useState('')
  const [loading, setLoading]                 = useState<string | null>(null)
  const [error, setError]                     = useState<string | null>(null)

  // SUPER_ADMIN can approve any tool, including their own
  const isOwnTool = tool.createdByEmail === currentUserEmail && currentUserRole !== 'SUPER_ADMIN'

  async function mutate(status: ToolStatus, extra?: { rejectionReason: string }) {
    setLoading(status)
    setError(null)
    try {
      const res = await fetch(`/api/tools/${tool.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...extra }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Failed')
      }
      router.push('/dashboard/admin/tools')
    } catch (err) {
      setError((err as Error).message)
      setLoading(null)
    }
  }

  function handleRejectSubmit() {
    if (rejectReason.trim().length < 10) return
    setShowRejectModal(false)
    mutate('REJECTED', { rejectionReason: rejectReason.trim() })
  }

  const fieldLabel = 'text-xs font-medium font-display text-[#94a3b8] uppercase tracking-wider'
  const fieldValue = 'mt-1 text-sm text-[#040B4D]'

  // AI fields presence check
  const hasAiData = !!(
    tool.aiSummary || tool.aiObjective || tool.aiCategory ||
    tool.aiTechStack || tool.aiFrameworkGuess || tool.aiConfidence != null
  )

  const overlapWarnings = Array.isArray(tool.aiOverlapWarnings)
    ? (tool.aiOverlapWarnings as string[])
    : []

  return (
    <div>
      {/* Back link */}
      <Link
        href="/dashboard/admin/tools"
        className="inline-flex items-center gap-1.5 text-sm text-[#64748b] hover:text-[#040B4D] mb-6 transition-colors focus-visible:ring-2 focus-visible:ring-[#2605EF]/30 focus-visible:ring-offset-2 rounded"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to tools
      </Link>

      {/* Rejection reason callout */}
      {tool.status === 'REJECTED' && tool.rejectionReason && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-medium font-display text-red-700 uppercase tracking-wider mb-1">Rejection reason</p>
          <p className="text-sm text-red-800">{tool.rejectionReason}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        {/* ── Details ──────────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Main info card */}
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 space-y-5 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold font-display text-[#040B4D]">{tool.name}</h2>
                <p className="text-sm text-[#94a3b8] font-mono mt-0.5">{tool.slug}</p>
              </div>
              <ToolStatusBadge status={tool.status} />
            </div>

            <div>
              <p className={fieldLabel}>External URL</p>
              <a
                href={tool.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-sm text-[#2605EF] hover:text-[#1803b3] hover:underline break-all focus-visible:ring-2 focus-visible:ring-[#2605EF]/30 focus-visible:ring-offset-2 rounded"
              >
                {tool.externalUrl}
                <ExternalLink className="h-3 w-3 flex-shrink-0" aria-hidden />
              </a>
            </div>

            {tool.description && (
              <div>
                <p className={fieldLabel}>Description</p>
                <p className={fieldValue}>{tool.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className={fieldLabel}>Team</p>
                <p className={fieldValue}>{tool.team ?? '—'}</p>
              </div>
              <div>
                <p className={fieldLabel}>Access level</p>
                <p className={fieldValue}>{tool.accessLevel}</p>
              </div>
            </div>

            {tool.notes && (
              <div>
                <p className={fieldLabel}>Notes</p>
                <p className={fieldValue}>{tool.notes}</p>
              </div>
            )}

            <div className="border-t border-[#e2e8f0] pt-4 grid grid-cols-2 gap-4">
              <div>
                <p className={fieldLabel}>Registered by</p>
                <p className={fieldValue}>{tool.createdByName}</p>
                <p className="text-xs text-[#94a3b8]">{tool.createdByEmail}</p>
              </div>
              <div>
                <p className={fieldLabel}>Registered on</p>
                <p className={fieldValue}>{formatDate(tool.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* ── AI Analysis card ──────────────────────────────────────── */}
          {hasAiData && (
            <div className="rounded-xl border border-violet-200 bg-white p-6 space-y-5 shadow-card">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-violet-100 flex items-center justify-center">
                    <Sparkles className="h-3.5 w-3.5 text-violet-600" aria-hidden />
                  </div>
                  <h3 className="text-sm font-semibold font-display text-[#040B4D]">AI analysis</h3>
                </div>
                <ConfidenceBadge value={tool.aiConfidence ?? null} />
              </div>

              {/* Summary */}
              {tool.aiSummary && (
                <div>
                  <p className={fieldLabel}>Summary</p>
                  <p className={cn(fieldValue, 'italic text-[#64748b]')}>
                    &ldquo;{tool.aiSummary}&rdquo;
                  </p>
                </div>
              )}

              {/* Objective */}
              {tool.aiObjective && (
                <div>
                  <p className={fieldLabel}>Objective</p>
                  <p className={fieldValue}>{tool.aiObjective}</p>
                </div>
              )}

              {/* Suggested users */}
              {tool.aiSuggestedUsers && (
                <div>
                  <p className={fieldLabel}>Suggested users</p>
                  <p className={fieldValue}>{tool.aiSuggestedUsers}</p>
                </div>
              )}

              {/* Category / Framework / Tech Stack row */}
              <div className="grid grid-cols-3 gap-4">
                {tool.aiCategory && (
                  <div>
                    <p className={fieldLabel}>Category</p>
                    <p className={cn(fieldValue, 'capitalize')}>{tool.aiCategory}</p>
                  </div>
                )}
                {tool.aiFrameworkGuess && (
                  <div>
                    <p className={fieldLabel}>Framework</p>
                    <p className={fieldValue}>{tool.aiFrameworkGuess}</p>
                  </div>
                )}
                {tool.aiTechStack && (
                  <div>
                    <p className={fieldLabel}>Tech stack</p>
                    <p className={fieldValue}>{tool.aiTechStack}</p>
                  </div>
                )}
              </div>

              {/* AI description (collapsed) */}
              {tool.aiDescription && tool.aiDescription !== tool.description && (
                <div>
                  <p className={fieldLabel}>AI description</p>
                  <p className="mt-1 text-sm text-[#64748b] leading-relaxed">{tool.aiDescription}</p>
                </div>
              )}

              {/* Overlap warnings */}
              {overlapWarnings.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" aria-hidden />
                    <p className="text-xs font-semibold font-display text-amber-700">Possible overlap with existing tools</p>
                  </div>
                  <ul className="space-y-0.5">
                    {overlapWarnings.map((name, i) => (
                      <li key={i} className="text-xs text-amber-700">• {name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-card">
          <h3 className="text-sm font-semibold font-display text-[#040B4D] mb-4">Actions</h3>
          <div className="space-y-2">

            {/* PENDING: approve/reject are primary actions */}
            {tool.status === 'PENDING' && (
              <>
                {isOwnTool ? (
                  <div className="rounded-lg border border-[#e2e8f0] bg-[#f4f3f3] px-4 py-3 text-center">
                    <p className="text-xs text-[#64748b]">You cannot approve your own tool.</p>
                  </div>
                ) : (
                  <button
                    onClick={() => mutate('ACTIVE')}
                    disabled={loading !== null}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold font-display text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors duration-150 shadow-xs active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 min-h-[44px]"
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    {loading === 'ACTIVE' ? 'Approving…' : 'Approve tool'}
                  </button>
                )}

                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={loading !== null}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium font-display text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors duration-150 min-h-[44px] focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                >
                  <XCircle className="h-4 w-4" aria-hidden />
                  {loading === 'REJECTED' ? 'Rejecting…' : 'Reject'}
                </button>

                <div className="pt-1 border-t border-[#e2e8f0]" />

                <button
                  onClick={() => mutate('ARCHIVED')}
                  disabled={loading !== null}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[#e2e8f0] px-4 py-2 text-sm font-medium font-display text-[#64748b] hover:bg-[#f4f3f3] disabled:opacity-50 transition-colors duration-150 min-h-[44px] focus-visible:ring-2 focus-visible:ring-[#2605EF]/30 focus-visible:ring-offset-2"
                >
                  <Archive className="h-3.5 w-3.5" aria-hidden />
                  {loading === 'ARCHIVED' ? 'Archiving…' : 'Archive'}
                </button>
              </>
            )}

            {/* ACTIVE */}
            {tool.status === 'ACTIVE' && (
              <button
                onClick={() => mutate('ARCHIVED')}
                disabled={loading !== null}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[#e2e8f0] px-4 py-2.5 text-sm font-medium font-display text-[#64748b] hover:bg-[#f4f3f3] disabled:opacity-50 transition-colors duration-150 min-h-[44px] focus-visible:ring-2 focus-visible:ring-[#2605EF]/30 focus-visible:ring-offset-2"
              >
                <Archive className="h-3.5 w-3.5" aria-hidden />
                {loading === 'ARCHIVED' ? 'Archiving…' : 'Archive tool'}
              </button>
            )}

            {/* ARCHIVED or REJECTED: restore */}
            {(tool.status === 'ARCHIVED' || tool.status === 'REJECTED') && (
              <button
                onClick={() => mutate('ACTIVE')}
                disabled={loading !== null}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#2605EF] px-4 py-2.5 text-sm font-semibold font-display text-white hover:bg-[#1e04cc] disabled:opacity-50 transition-colors duration-150 shadow-xs active:scale-[0.97] min-h-[44px] focus-visible:ring-2 focus-visible:ring-[#2605EF] focus-visible:ring-offset-2"
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
                {loading === 'ACTIVE' ? 'Restoring…' : 'Restore to active'}
              </button>
            )}

            {/* Edit — always available, tertiary */}
            <div className="pt-1 border-t border-[#e2e8f0]">
              <Link
                href={`/dashboard/tools/${tool.id}/edit`}
                className="flex items-center justify-center gap-1.5 w-full rounded-lg px-4 py-2 text-sm font-medium font-display text-[#64748b] hover:text-[#040B4D] hover:bg-[#f4f3f3] transition-colors duration-150 min-h-[44px] focus-visible:ring-2 focus-visible:ring-[#2605EF]/30 focus-visible:ring-offset-2"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Edit tool details
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Reject Modal ─────────────────────────────────────────────────── */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(4,11,77,0.4)] p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-elevated p-6">
            <h2 className="text-base font-semibold font-display text-[#040B4D] mb-1">Reject tool</h2>
            <p className="text-sm text-[#64748b] mb-4">
              Provide a reason so the submitter knows what to fix.
            </p>
            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Describe why this tool is being rejected… (min 10 characters)"
              className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2605EF]/25 focus:border-[#2605EF]/60 text-[#040B4D] placeholder:text-[#94a3b8]"
            />
            <p className="text-xs text-[#94a3b8] mt-1">{rejectReason.trim().length} / 1000</p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setShowRejectModal(false); setRejectReason('') }}
                className="rounded-lg border border-[#e2e8f0] px-4 py-2 text-sm font-medium font-display text-[#64748b] hover:bg-[#f4f3f3] transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-[#2605EF]/30 focus-visible:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={rejectReason.trim().length < 10}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium font-display text-white hover:bg-red-700 disabled:opacity-50 transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
              >
                Submit rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
