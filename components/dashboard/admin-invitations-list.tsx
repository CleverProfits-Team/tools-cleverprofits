'use client'

import { useState } from 'react'
import { Copy, Check, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SerializedInvitation } from '@/types'
import type { Role } from '@prisma/client'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function RoleBadge({ role }: { role: Role }) {
  const styles: Record<Role, string> = {
    SUPER_ADMIN: 'bg-violet-100 text-violet-700',
    ADMIN:       'bg-blue-100 text-blue-700',
    BUILDER:     'bg-amber-100 text-amber-700',
    VIEWER:      'bg-slate-100 text-slate-600',
  }
  return (
    <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', styles[role])}>
      {role.replace('_', ' ')}
    </span>
  )
}

function displayStatus(inv: SerializedInvitation): { label: string; className: string } {
  if (inv.status === 'USED') {
    return { label: 'Used', className: 'bg-slate-100 text-slate-500' }
  }
  if (new Date(inv.expiresAt) < new Date()) {
    return { label: 'Expired', className: 'bg-red-100 text-red-700' }
  }
  return { label: 'Pending', className: 'bg-amber-100 text-amber-700' }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  initialInvitations: SerializedInvitation[]
}

export function AdminInvitationsList({ initialInvitations }: Props) {
  const [invitations, setInvitations] = useState<SerializedInvitation[]>(initialInvitations)
  const [copiedId, setCopiedId]       = useState<string | null>(null)
  const [revoking, setRevoking]       = useState<string | null>(null)

  async function handleCopy(inv: SerializedInvitation) {
    const url = `${window.location.origin}/invite/${inv.token}`
    await navigator.clipboard.writeText(url)
    setCopiedId(inv.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function handleRevoke(id: string) {
    setRevoking(id)
    try {
      const res = await fetch(`/api/invitations/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      setInvitations((prev) => prev.filter((inv) => inv.id !== id))
    } catch {
      // Keep row on failure
    } finally {
      setRevoking(null)
    }
  }

  const thCls = 'px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider'
  const tdCls = 'px-3 py-3 text-sm text-slate-700 align-middle'

  if (invitations.length === 0) {
    return (
      <p className="text-sm text-slate-500 py-12 text-center">No invitations yet</p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-left">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className={thCls}>Email</th>
            <th className={thCls}>Role</th>
            <th className={thCls}>Status</th>
            <th className={thCls}>Created</th>
            <th className={thCls}>Expires</th>
            <th className={thCls}>Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {invitations.map((inv) => {
            const { label, className } = displayStatus(inv)
            const isPending = inv.status === 'PENDING' && new Date(inv.expiresAt) >= new Date()

            return (
              <tr key={inv.id} className="hover:bg-slate-50/50">
                <td className={tdCls}>{inv.email}</td>
                <td className={tdCls}><RoleBadge role={inv.role} /></td>
                <td className={tdCls}>
                  <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', className)}>
                    {label}
                  </span>
                </td>
                <td className={tdCls}>{formatDate(inv.createdAt)}</td>
                <td className={tdCls}>{formatDate(inv.expiresAt)}</td>
                <td className={tdCls}>
                  <div className="flex items-center gap-2">
                    {isPending && (
                      <button
                        onClick={() => handleCopy(inv)}
                        className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 transition-colors"
                        aria-label="Copy invite link"
                        title="Copy invite link"
                      >
                        {copiedId === inv.id
                          ? <Check className="h-3.5 w-3.5 text-emerald-600" />
                          : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    )}
                    {isPending && (
                      <button
                        onClick={() => handleRevoke(inv.id)}
                        disabled={revoking === inv.id}
                        className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50"
                        aria-label="Revoke invitation"
                        title="Revoke invitation"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {!isPending && <span className="text-xs text-slate-400">—</span>}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
