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

function getRoleOptions(callerRole: Role): { value: string; label: string }[] {
  if (callerRole === 'SUPER_ADMIN') {
    return [
      { value: 'SUPER_ADMIN', label: 'Super Admin' },
      { value: 'ADMIN', label: 'Admin' },
      { value: 'BUILDER', label: 'Builder' },
      { value: 'VIEWER', label: 'Viewer' },
    ]
  }
  return [
    { value: 'BUILDER', label: 'Builder' },
    { value: 'VIEWER', label: 'Viewer' },
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  initialUsers: SerializedUser[]
  currentUserId: string
  currentUserRole: Role
}

interface InviteResult {
  url: string
  email: string
  role: Role
}

export function AdminUsersPanel({ initialUsers, currentUserId, currentUserRole }: Props) {
  const [users, setUsers] = useState<SerializedUser[]>(initialUsers)
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set())
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('VIEWER')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null)
  const [copied, setCopied] = useState(false)

  function canEditUser(target: SerializedUser): boolean {
    if (target.id === currentUserId) return false
    if (currentUserRole === 'ADMIN' && (target.role === 'ADMIN' || target.role === 'SUPER_ADMIN'))
      return false
    return true
  }

  async function mutateUser(
    id: string,
    actionKey: string,
    patch: { role?: Role; status?: UserStatus },
  ) {
    const key = `${id}-${actionKey}`
    setLoadingKeys((prev) => new Set(prev).add(key))
    setRowErrors((prev) => {
      const n = { ...prev }
      delete n[key]
      return n
    })

    const snapshot = users
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)))

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      const updated: SerializedUser = await res.json()
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)))
    } catch (err) {
      setUsers(snapshot)
      setRowErrors((prev) => ({ ...prev, [key]: (err as Error).message }))
    } finally {
      setLoadingKeys((prev) => {
        const n = new Set(prev)
        n.delete(key)
        return n
      })
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

  const thCls =
    'px-3 py-2 text-left text-xs font-medium font-display text-[rgba(4,11,77,0.40)] uppercase tracking-widest'
  const tdCls = 'px-3 py-3 text-sm text-[#040B4D] align-top'

  return (
    <div className="space-y-8">
      {/* ── Users table ──────────────────────────────────────────────────── */}
      {users.length === 0 ? (
        <p className="text-sm text-[rgba(4,11,77,0.55)] py-8 text-center">No users</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#E7E7E7] shadow-card">
          <table className="w-full text-left">
            <thead className="bg-[#FAFAFA]/60 border-b border-[#E7E7E7]">
              <tr>
                <th className={thCls}>Name / Email</th>
                <th className={thCls}>Role</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Joined</th>
                <th className={thCls}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E7E7]/60">
              {users.map((user) => {
                const editable = canEditUser(user)
                const roleKey = `${user.id}-role`
                const statusKey = `${user.id}-status`

                return (
                  <tr
                    key={user.id}
                    className="hover:bg-[#FAFAFA]/50 transition-colors duration-150"
                  >
                    <td className={tdCls}>
                      <div className="font-medium text-[#040B4D]">{user.name ?? '—'}</div>
                      <div className="text-xs text-[rgba(4,11,77,0.40)]">{user.email}</div>
                      {user.id === currentUserId && (
                        <span className="text-xs text-[#2605EF] font-display">(you)</span>
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
                            <p className="text-xs text-red-600 mt-1">{rowErrors[roleKey]}</p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <RoleBadge role={user.role} />
                          <ShieldAlert
                            className="h-3.5 w-3.5 text-[rgba(4,11,77,0.40)]"
                            aria-hidden
                          />
                        </div>
                      )}
                    </td>
                    <td className={tdCls}>
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={cn(
                            'h-2 w-2 rounded-full flex-shrink-0',
                            user.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500',
                          )}
                        />
                        <span
                          className={cn(
                            'text-xs font-medium font-display',
                            user.status === 'ACTIVE' ? 'text-emerald-700' : 'text-red-700',
                          )}
                        >
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
                              mutateUser(user.id, 'status', {
                                status: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                              })
                            }
                            disabled={loadingKeys.has(statusKey)}
                            className={cn(
                              'rounded-lg px-3 py-1.5 text-xs font-medium font-display transition-colors duration-150 disabled:opacity-50 min-h-[36px] focus-visible:ring-2 focus-visible:ring-[#2605EF]/30 focus-visible:ring-offset-2',
                              user.status === 'ACTIVE'
                                ? 'border border-[#E7E7E7] text-[rgba(4,11,77,0.55)] hover:bg-[#FAFAFA]'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700',
                            )}
                          >
                            {loadingKeys.has(statusKey)
                              ? 'Saving…'
                              : user.status === 'ACTIVE'
                                ? 'Suspend'
                                : 'Activate'}
                          </button>
                          {rowErrors[statusKey] && (
                            <p className="text-xs text-red-600 mt-1">{rowErrors[statusKey]}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-[rgba(4,11,77,0.40)]">—</span>
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
      <div className="rounded-2xl border border-[#E7E7E7] bg-white p-6 shadow-card">
        <h3 className="text-sm font-semibold font-display text-[#040B4D] mb-4">
          Create invitation
        </h3>
        <form onSubmit={handleInviteSubmit} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium font-display text-[rgba(4,11,77,0.40)] uppercase tracking-wide mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => {
                setInviteEmail(e.target.value)
                setInviteResult(null)
              }}
              placeholder="user@cleverprofits.com"
              className="w-full rounded-lg border border-[#E7E7E7] px-3 py-1.5 text-sm text-[#040B4D] placeholder:text-[rgba(4,11,77,0.40)] focus:outline-none focus:ring-2 focus:ring-[#2605EF]/25 focus:border-[#2605EF]/60 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium font-display text-[rgba(4,11,77,0.40)] uppercase tracking-wide mb-1">
              Role
            </label>
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
            className="rounded-lg bg-[#2605EF] px-4 py-1.5 text-sm font-medium font-display text-white hover:bg-[#1e04cc] disabled:opacity-50 transition-colors duration-150 min-h-[36px] focus-visible:ring-2 focus-visible:ring-[#2605EF] focus-visible:ring-offset-2"
          >
            {inviteLoading ? 'Creating…' : 'Create invite'}
          </button>
        </form>

        {inviteError && <p className="mt-3 text-sm text-red-600">{inviteError}</p>}

        {inviteResult && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-medium font-display text-emerald-700 mb-1">
              Invite created for {inviteResult.email} ({inviteResult.role})
            </p>
            <div className="flex items-center gap-2 mt-2">
              <code className="flex-1 text-xs bg-white border border-emerald-200 rounded px-2 py-1.5 break-all text-[#040B4D]">
                {inviteResult.url}
              </code>
              <button
                onClick={handleCopyUrl}
                className="flex-shrink-0 rounded-lg border border-emerald-300 p-1.5 text-emerald-700 hover:bg-emerald-100 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
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
