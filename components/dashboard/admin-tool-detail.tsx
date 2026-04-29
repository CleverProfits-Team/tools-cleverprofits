'use client'

import { useState, useEffect, useRef } from 'react'
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
    DRAFT:    'bg-[#E7E7E7] text-[rgba(15,0,56,0.40)]',
    ACTIVE:   'bg-[rgba(16,185,129,0.10)] text-[#065F46]',
    PENDING:  'bg-[rgba(245,158,11,0.10)] text-[#92400E]',
    ARCHIVED: 'bg-[#E7E7E7] text-[rgba(15,0,56,0.55)]',
    REJECTED: 'bg-[rgba(239,68,68,0.10)] text-[#991B1B]',
  }
  return (
    <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em] whitespace-nowrap', styles[status])}>
      {status}
    </span>
  )
}

function ConfidenceBadge({ value }: { value: number | null }) {
  if (value === null || value === undefined) return null
  const pct  = Math.round(value * 100)
  const color = value >= 0.7 ? 'bg-[rgba(16,185,129,0.10)] text-[#065F46]'
              : value >= 0.4 ? 'bg-[rgba(245,158,11,0.10)] text-[#92400E]'
              : 'bg-[rgba(239,68,68,0.10)] text-[#991B1B]'
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap', color)}>
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
  const modalRef                              = useRef<HTMLDivElement>(null)

  // Focus trap — keeps keyboard focus inside the reject modal
  useEffect(() => {
    if (!showRejectModal) return
    const modal = modalRef.current
    if (!modal) return

    const focusable = modal.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last  = focusable[focusable.length - 1]
    first?.focus()

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowRejectModal(false)
        setRejectReason('')
        return
      }
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus() }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first?.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [showRejectModal])

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

  const fieldLabel = 'text-xs font-medium text-[rgba(15,0,56,0.55)] uppercase tracking-wider'
  const fieldValue = 'mt-1 text-sm text-[#0F0038]'

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
        className="inline-flex items-center gap-1.5 text-sm text-[rgba(15,0,56,0.55)] hover:text-[#0F0038] mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to Tools
      </Link>

      {/* Rejection reason callout */}
      {tool.status === 'REJECTED' && tool.rejectionReason && (
        <div className="mb-6 rounded-lg border border-[#FCA5A5] bg-[rgba(239,68,68,0.10)] p-4">
          <p className="text-xs font-medium text-[#991B1B] uppercase tracking-wider mb-1">Rejection Reason</p>
          <p className="text-sm text-[#991B1B]">{tool.rejectionReason}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-[#FCA5A5] bg-[rgba(239,68,68,0.10)] p-3">
          <p className="text-sm text-[#991B1B]">{error}</p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        {/* ── Details ──────────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Main info card */}
          <div className="rounded-2xl border border-[#E7E7E7] bg-white shadow-card p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#0F0038] tracking-[-0.02em]">{tool.name}</h2>
                <p className="text-sm text-[rgba(15,0,56,0.40)] font-mono mt-0.5">{tool.slug}</p>
              </div>
              <ToolStatusBadge status={tool.status} />
            </div>

            <div>
              <p className={fieldLabel}>External URL</p>
              <a
                href={tool.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-sm text-[#2605EF] hover:text-[#1E04C7] hover:underline break-all"
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
                <p className={fieldLabel}>Access Level</p>
                <p className={fieldValue}>{tool.accessLevel}</p>
              </div>
            </div>

            {tool.notes && (
              <div>
                <p className={fieldLabel}>Notes</p>
                <p className={fieldValue}>{tool.notes}</p>
              </div>
            )}

            <div className="border-t border-[#FAFAFA] pt-4 grid grid-cols-2 gap-4">
              <div>
                <p className={fieldLabel}>Registered By</p>
                <p className={fieldValue}>{tool.createdByName}</p>
                <p className="text-xs text-[rgba(15,0,56,0.40)]">{tool.createdByEmail}</p>
              </div>
              <div>
                <p className={fieldLabel}>Registered On</p>
                <p className={fieldValue}>{formatDate(tool.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* ── AI Analysis card ──────────────────────────────────────── */}
          {hasAiData && (
            <div className="rounded-2xl border border-[#E7E7E7] bg-white shadow-card p-6 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-md bg-[rgba(38,5,239,0.10)] flex items-center justify-center">
                    <Sparkles className="h-3.5 w-3.5 text-[#2605EF]" aria-hidden />
                  </div>
                  <h3 className="text-sm font-semibold text-[#0F0038]">AI Analysis</h3>
                </div>
                <ConfidenceBadge value={tool.aiConfidence ?? null} />
              </div>

              {/* Summary */}
              {tool.aiSummary && (
                <div>
                  <p className={fieldLabel}>Summary</p>
                  <p className={cn(fieldValue, 'italic text-[rgba(15,0,56,0.65)]')}>
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
                  <p className={fieldLabel}>Suggested Users</p>
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
                    <p className={fieldLabel}>Tech Stack</p>
                    <p className={fieldValue}>{tool.aiTechStack}</p>
                  </div>
                )}
              </div>

              {/* AI description (collapsed) */}
              {tool.aiDescription && tool.aiDescription !== tool.description && (
                <div>
                  <p className={fieldLabel}>AI Description</p>
                  <p className="mt-1 text-sm text-[rgba(15,0,56,0.65)] leading-relaxed">{tool.aiDescription}</p>
                </div>
              )}

              {/* Overlap warnings */}
              {overlapWarnings.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-[rgba(245,158,11,0.10)] p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-[#F59E0B] flex-shrink-0" aria-hidden />
                    <p className="text-xs font-semibold text-[#92400E]">Possible overlap with existing tools</p>
                  </div>
                  <ul className="space-y-0.5">
                    {overlapWarnings.map((name, i) => (
                      <li key={i} className="text-xs text-[#92400E]">• {name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[#E7E7E7] bg-white shadow-card p-6">
          <h3 className="text-sm font-semibold text-[#0F0038] mb-4">Actions</h3>
          <div className="space-y-2">

            {/* PENDING: approve/reject are primary actions */}
            {tool.status === 'PENDING' && (
              <>
                {isOwnTool ? (
                  <div className="rounded-lg border border-[#E7E7E7] bg-[#FAFAFA] px-4 py-3 text-center">
                    <p className="text-xs text-[rgba(15,0,56,0.55)]">You cannot approve your own tool.</p>
                  </div>
                ) : (
                  <button
                    onClick={() => mutate('ACTIVE')}
                    disabled={loading !== null}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#10B981] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-colors shadow-md whitespace-nowrap"
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    {loading === 'ACTIVE' ? 'Approving…' : 'Approve tool'}
                  </button>
                )}

                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={loading !== null}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[#FCA5A5] bg-white px-4 py-2.5 text-sm font-medium text-[#991B1B] hover:bg-[rgba(239,68,68,0.10)] disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  <XCircle className="h-4 w-4" aria-hidden />
                  {loading === 'REJECTED' ? 'Rejecting…' : 'Reject'}
                </button>

                <div className="pt-1 border-t border-[#FAFAFA]" />

                <button
                  onClick={() => mutate('ARCHIVED')}
                  disabled={loading !== null}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[#E7E7E7] px-4 py-2 text-sm font-medium text-[rgba(15,0,56,0.55)] hover:bg-[#FAFAFA] disabled:opacity-50 transition-colors whitespace-nowrap"
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
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[#E7E7E7] px-4 py-2.5 text-sm font-medium text-[rgba(15,0,56,0.65)] hover:bg-[#FAFAFA] disabled:opacity-50 transition-colors whitespace-nowrap"
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
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#2605EF] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1E04C7] disabled:opacity-50 transition-colors shadow-md whitespace-nowrap"
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
                {loading === 'ACTIVE' ? 'Restoring…' : 'Restore to Active'}
              </button>
            )}

            {/* Edit — always available, tertiary */}
            <div className="pt-1 border-t border-[#FAFAFA]">
              <Link
                href={`/dashboard/tools/${tool.id}/edit`}
                className="flex items-center justify-center gap-1.5 w-full rounded-lg px-4 py-2 text-sm font-medium text-[rgba(15,0,56,0.55)] hover:text-[#0F0038] hover:bg-[#FAFAFA] transition-colors"
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,0,56,0.40)] p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowRejectModal(false); setRejectReason('') } }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-modal-title"
        >
          <div ref={modalRef} className="w-full max-w-md rounded-2xl bg-white shadow-lg p-6">
            <h2 id="reject-modal-title" className="text-base font-semibold text-[#0F0038] mb-1">Reject Tool</h2>
            <p className="text-sm text-[rgba(15,0,56,0.55)] mb-4">
              Provide a reason so the submitter knows what to fix.
            </p>
            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Describe why this tool is being rejected… (min 10 characters)"
              className="w-full rounded-md border border-[#E7E7E7] px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2605EF] placeholder:text-[rgba(15,0,56,0.40)]"
            />
            <p className="text-xs text-[rgba(15,0,56,0.40)] mt-1">{rejectReason.trim().length} / 1000</p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setShowRejectModal(false); setRejectReason('') }}
                className="rounded-lg border border-[#E7E7E7] px-4 py-2 text-sm font-medium text-[rgba(15,0,56,0.65)] hover:bg-[#FAFAFA] transition-colors whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={rejectReason.trim().length < 10}
                className="rounded-lg bg-[#DC2626] px-4 py-2 text-sm font-bold text-white hover:bg-[#991B1B] disabled:opacity-50 shadow-md transition-colors whitespace-nowrap"
              >
                Submit Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
