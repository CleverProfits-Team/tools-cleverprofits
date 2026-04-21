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
    ADMIN: 'bg-[#eeeeff] text-[#2605EF]',
    BUILDER: 'bg-amber-100 text-amber-700',
    VIEWER: 'bg-[#FAFAFA] text-[rgba(4,11,77,0.55)]',
  }
  return (
    <span
      className={cn(
        'inline-block rounded-full px-2 py-0.5 text-xs font-medium font-display',
        styles[role],
      )}
    >
      {role.replace('_', ' ')}
    </span>
  )
}

function displayStatus(inv: SerializedInvitation): { label: string; className: string } {
  if (inv.status === 'USED') {
    return { label: 'Used', className: 'bg-[#FAFAFA] text-[rgba(4,11,77,0.55)]' }
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
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)

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

  const thCls =
    'px-5 py-4 text-left text-[10px] font-bold font-display text-white uppercase tracking-[0.10em]'
  const tdCls = 'px-3 py-3 text-sm text-[#040B4D] align-middle'

  if (invitations.length === 0) {
    return <p className="text-sm text-[rgba(4,11,77,0.55)] py-12 text-center">No invitations yet</p>
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#E7E7E7] shadow-card">
      <table className="w-full text-left">
        <thead className="bg-[#040B4D]">
          <tr>
            <th className={thCls}>Email</th>
            <th className={thCls}>Role</th>
            <th className={thCls}>Status</th>
            <th className={thCls}>Created</th>
            <th className={thCls}>Expires</th>
            <th className={thCls}>Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E7E7E7]/60">
          {invitations.map((inv) => {
            const { label, className } = displayStatus(inv)
            const isPending = inv.status === 'PENDING' && new Date(inv.expiresAt) >= new Date()

            return (
              <tr
                key={inv.id}
                className="hover:bg-[rgba(38,5,239,0.03)] transition-colors duration-150"
              >
                <td className={tdCls}>{inv.email}</td>
                <td className={tdCls}>
                  <RoleBadge role={inv.role} />
                </td>
                <td className={tdCls}>
                  <span
                    className={cn(
                      'inline-block rounded-full px-2 py-0.5 text-xs font-medium font-display',
                      className,
                    )}
                  >
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
                        className="rounded-lg border border-[#E7E7E7] p-1.5 text-[rgba(4,11,77,0.55)] hover:bg-[#FAFAFA] hover:text-[#040B4D] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#2605EF]/30 focus-visible:ring-offset-2"
                        aria-label="Copy invite link"
                        title="Copy invite link"
                      >
                        {copiedId === inv.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                    {isPending && (
                      <button
                        onClick={() => handleRevoke(inv.id)}
                        disabled={revoking === inv.id}
                        className="rounded-lg border border-[#E7E7E7] p-1.5 text-[rgba(4,11,77,0.55)] hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50 min-h-[36px] min-w-[36px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-red-500/30 focus-visible:ring-offset-2"
                        aria-label="Revoke invitation"
                        title="Revoke invitation"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {!isPending && <span className="text-xs text-[rgba(4,11,77,0.40)]">—</span>}
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
