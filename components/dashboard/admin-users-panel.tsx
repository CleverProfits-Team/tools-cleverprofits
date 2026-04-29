'use client'

import { useState } from 'react'
import { ShieldAlert, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Select } from '@/components/ui/select'
import type { SerializedUser } from '@/types'
import type { Role, UserStatus } from '@prisma/client'

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
    SUPER_ADMIN: 'bg-[rgba(38,5,239,0.10)] text-[#2605EF]',
    ADMIN:       'bg-[rgba(38,5,239,0.10)] text-[#2605EF]',
    BUILDER:     'bg-[rgba(245,158,11,0.10)] text-[#92400E]',
    VIEWER:      'bg-[#E7E7E7] text-[rgba(15,0,56,0.65)]',
  }
  return (
    <span className={cn('inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em] whitespace-nowrap', styles[role])}>
      {role.replace('_', ' ')}
    </span>
  )
}

function getRoleOptions(callerRole: Role): { value: string; label: string }[] {
  if (callerRole === 'SUPER_ADMIN') {
    return [
      { value: 'SUPER_ADMIN', label: 'Super Admin' },
      { value: 'ADMIN',       label: 'Admin' },
      { value: 'BUILDER',     label: 'Builder' },
      { value: 'VIEWER',      label: 'Viewer' },
    ]
  }
  return [
    { value: 'BUILDER', label: 'Builder' },
    { value: 'VIEWER',  label: 'Viewer' },
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  initialUsers:    SerializedUser[]
  currentUserId:   string
  currentUserRole: Role
}

interface InviteResult {
  url: string
  email: string
  role: Role
}

export function AdminUsersPanel({ initialUsers, currentUserId, currentUserRole }: Props) {
  const [users, setUsers]           = useState<SerializedUser[]>(initialUsers)
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set())
  const [rowErrors, setRowErrors]   = useState<Record<string, string>>({})

  // Invite form state
  const [inviteEmail, setInviteEmail]   = useState('')
  const [inviteRole, setInviteRole]     = useState<Role>('VIEWER')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError]   = useState<string | null>(null)
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null)
  const [copied, setCopied]             = useState(false)

  function canEditUser(target: SerializedUser): boolean {
    if (target.id === currentUserId) return false
    if (currentUserRole === 'ADMIN' &&
        (target.role === 'ADMIN' || target.role === 'SUPER_ADMIN')) return false
    return true
  }

  async function mutateUser(id: string, actionKey: string, patch: { role?: Role; status?: UserStatus }) {
    const key = `${id}-${actionKey}`
    setLoadingKeys((prev) => new Set(prev).add(key))
    setRowErrors((prev) => { const n = { ...prev }; delete n[key]; return n })

    const snapshot = users
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...patch } : u))

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      const updated: SerializedUser = await res.json()
      setUsers((prev) => prev.map((u) => u.id === id ? updated : u))
    } catch (err) {
      setUsers(snapshot)
      setRowErrors((prev) => ({ ...prev, [key]: (err as Error).message }))
    } finally {
      setLoadingKeys((prev) => { const n = new Set(prev); n.delete(key); return n })
    }
  }

  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault()
    setInviteLoading(true)
    setInviteError(null)
    setInviteResult(null)

    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      setInviteResult({ url: json.inviteUrl, email: inviteEmail, role: inviteRole })
    } catch (err) {
      setInviteError((err as Error).message)
    } finally {
      setInviteLoading(false)
    }
  }

  async function handleCopyUrl() {
    if (!inviteResult) return
    await navigator.clipboard.writeText(inviteResult.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const thCls = 'px-3 py-2 text-left text-xs font-medium text-[rgba(15,0,56,0.55)] uppercase tracking-wider'
  const tdCls = 'px-3 py-3 text-sm text-[#0F0038] align-top'

  return (
    <div className="space-y-8">
      {/* ── Users table ──────────────────────────────────────────────────── */}
      {users.length === 0 ? (
        <p className="text-sm text-[rgba(15,0,56,0.55)] py-8 text-center">No users</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#E7E7E7] bg-white shadow-card">
          <table className="w-full text-left">
            <thead className="bg-[#FAFAFA] border-b border-[#E7E7E7]">
              <tr>
                <th className={thCls}>Name / Email</th>
                <th className={thCls}>Role</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Joined</th>
                <th className={thCls}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FAFAFA]">
              {users.map((user) => {
                const editable  = canEditUser(user)
                const roleKey   = `${user.id}-role`
                const statusKey = `${user.id}-status`

                return (
                  <tr key={user.id} className="hover:bg-[#FAFAFA]">
                    <td className={tdCls}>
                      <div className="font-medium text-[#0F0038]">{user.name ?? '—'}</div>
                      <div className="text-xs text-[rgba(15,0,56,0.40)]">{user.email}</div>
                      {user.id === currentUserId && (
                        <span className="text-xs text-[#2605EF]">(you)</span>
                      )}
                    </td>
                    <td className={tdCls}>
                      {editable ? (
                        <div>
                          <Select
                            value={user.role}
                            disabled={loadingKeys.has(roleKey)}
                            options={getRoleOptions(currentUserRole)}
                            onChange={(e) =>
                              mutateUser(user.id, 'role', { role: e.target.value as Role })
                            }
                            className="w-36"
                          />
                          {rowErrors[roleKey] && (
                            <p className="text-xs text-[#991B1B] mt-1">{rowErrors[roleKey]}</p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <RoleBadge role={user.role} />
                          <ShieldAlert className="h-3.5 w-3.5 text-[rgba(15,0,56,0.40)]" aria-hidden />
                        </div>
                      )}
                    </td>
                    <td className={tdCls}>
                      <span className="inline-flex items-center gap-1.5">
                        <span className={cn(
                          'h-2 w-2 rounded-full flex-shrink-0',
                          user.status === 'ACTIVE' ? 'bg-[#10B981]' : 'bg-[#EF4444]',
                        )} />
                        <span className={cn(
                          'text-xs font-medium',
                          user.status === 'ACTIVE' ? 'text-[#065F46]' : 'text-[#991B1B]',
                        )}>
                          {user.status}
                        </span>
                      </span>
                    </td>
                    <td className={tdCls}>{formatDate(user.createdAt)}</td>
                    <td className={tdCls}>
                      {editable ? (
                        <div>
                          <button
                            onClick={() =>
                              mutateUser(
                                user.id,
                                'status',
                                { status: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' },
                              )
                            }
                            disabled={loadingKeys.has(statusKey)}
                            className={cn(
                              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 whitespace-nowrap',
                              user.status === 'ACTIVE'
                                ? 'border border-[#E7E7E7] text-[rgba(15,0,56,0.65)] hover:bg-[#E7E7E7]'
                                : 'bg-[#10B981] text-white hover:opacity-90 shadow-md',
                            )}
                          >
                            {loadingKeys.has(statusKey)
                              ? 'Saving…'
                              : user.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>
                          {rowErrors[statusKey] && (
                            <p className="text-xs text-[#991B1B] mt-1">{rowErrors[statusKey]}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-[rgba(15,0,56,0.40)]">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Invite form ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#E7E7E7] bg-white shadow-card p-6">
        <h3 className="text-sm font-semibold text-[#0F0038] mb-4">Create Invitation</h3>
        <form onSubmit={handleInviteSubmit} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-[rgba(15,0,56,0.55)] mb-1">Email</label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => {
                setInviteEmail(e.target.value)
                setInviteResult(null)
              }}
              placeholder="user@cleverprofits.com"
              className="w-full rounded-md border border-[#E7E7E7] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2605EF] placeholder:text-[rgba(15,0,56,0.40)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[rgba(15,0,56,0.55)] mb-1">Role</label>
            <Select
              value={inviteRole}
              options={getRoleOptions(currentUserRole)}
              onChange={(e) => setInviteRole(e.target.value as Role)}
              className="w-36"
            />
          </div>
          <button
            type="submit"
            disabled={inviteLoading}
            className="rounded-lg bg-[#2605EF] px-4 py-1.5 text-sm font-bold text-white hover:bg-[#1E04C7] disabled:opacity-50 shadow-md transition-colors whitespace-nowrap"
          >
            {inviteLoading ? 'Creating…' : 'Create invite'}
          </button>
        </form>

        {inviteError && (
          <p className="mt-3 text-sm text-[#991B1B]">{inviteError}</p>
        )}

        {inviteResult && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-[rgba(16,185,129,0.10)] p-4">
            <p className="text-xs font-medium text-[#065F46] mb-1">
              Invite created for {inviteResult.email} ({inviteResult.role})
            </p>
            <div className="flex items-center gap-2 mt-2">
              <code className="flex-1 text-xs bg-white border border-emerald-200 rounded px-2 py-1.5 break-all">
                {inviteResult.url}
              </code>
              <button
                onClick={handleCopyUrl}
                className="flex-shrink-0 rounded-md border border-emerald-300 p-1.5 text-[#065F46] hover:bg-[rgba(16,185,129,0.10)] transition-colors"
                aria-label="Copy invite URL"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
