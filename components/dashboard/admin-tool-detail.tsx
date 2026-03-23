'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, CheckCircle2, XCircle, Archive, RotateCcw, Pencil } from 'lucide-react'
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
    ACTIVE:   'bg-emerald-100 text-emerald-700',
    PENDING:  'bg-amber-100 text-amber-700',
    ARCHIVED: 'bg-slate-100 text-slate-500',
    REJECTED: 'bg-red-100 text-red-700',
  }
  return (
    <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-xs font-medium', styles[status])}>
      {status}
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
  const [tool, setTool]                 = useState(initialTool)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [loading, setLoading]           = useState<string | null>(null)
  const [error, setError]               = useState<string | null>(null)

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

  const fieldLabel = 'text-xs font-medium text-slate-500 uppercase tracking-wider'
  const fieldValue = 'mt-1 text-sm text-slate-900'

  return (
    <div>
      {/* Back link */}
      <Link
        href="/dashboard/admin/tools"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to Tools
      </Link>

      {/* Rejection reason callout */}
      {tool.status === 'REJECTED' && tool.rejectionReason && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-medium text-red-700 uppercase tracking-wider mb-1">Rejection Reason</p>
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
        <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{tool.name}</h2>
              <p className="text-sm text-slate-400 font-mono mt-0.5">{tool.slug}</p>
            </div>
            <ToolStatusBadge status={tool.status} />
          </div>

          <div>
            <p className={fieldLabel}>External URL</p>
            <a
              href={tool.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline break-all"
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

          <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4">
            <div>
              <p className={fieldLabel}>Registered By</p>
              <p className={fieldValue}>{tool.createdByName}</p>
              <p className="text-xs text-slate-400">{tool.createdByEmail}</p>
            </div>
            <div>
              <p className={fieldLabel}>Registered On</p>
              <p className={fieldValue}>{formatDate(tool.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Actions</h3>
          <div className="space-y-2">

            {/* PENDING: approve/reject are primary actions */}
            {tool.status === 'PENDING' && (
              <>
                {isOwnTool ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                    <p className="text-xs text-slate-500">You cannot approve your own tool.</p>
                  </div>
                ) : (
                  <button
                    onClick={() => mutate('ACTIVE')}
                    disabled={loading !== null}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    {loading === 'ACTIVE' ? 'Approving…' : 'Approve tool'}
                  </button>
                )}

                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={loading !== null}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  <XCircle className="h-4 w-4" aria-hidden />
                  {loading === 'REJECTED' ? 'Rejecting…' : 'Reject'}
                </button>

                <div className="pt-1 border-t border-slate-100" />

                <button
                  onClick={() => mutate('ARCHIVED')}
                  disabled={loading !== null}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors"
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
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
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
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
                {loading === 'ACTIVE' ? 'Restoring…' : 'Restore to Active'}
              </button>
            )}

            {/* Edit — always available, tertiary */}
            <div className="pt-1 border-t border-slate-100">
              <Link
                href={`/dashboard/tools/${tool.id}/edit`}
                className="flex items-center justify-center gap-1.5 w-full rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-1">Reject Tool</h2>
            <p className="text-sm text-slate-500 mb-4">
              Provide a reason so the submitter knows what to fix.
            </p>
            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Describe why this tool is being rejected… (min 10 characters)"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1">{rejectReason.trim().length} / 1000</p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setShowRejectModal(false); setRejectReason('') }}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={rejectReason.trim().length < 10}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
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
