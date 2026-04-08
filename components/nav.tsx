'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LogOut, PlusCircle, LayoutDashboard,
  ShieldAlert, ClipboardList, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/dashboard',          label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/dashboard/my-tools', label: 'My Tools',     icon: ClipboardList   },
  { href: '/dashboard/register', label: 'Register Tool', icon: PlusCircle      },
]

const ROLE_STYLES: Record<string, string> = {
  SUPER_ADMIN: 'bg-violet-100 text-violet-700',
  ADMIN:       'bg-[#2605EF]/10 text-[#2605EF]',
  BUILDER:     'bg-amber-100  text-amber-700',
  VIEWER:      'bg-slate-100  text-slate-600',
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN:       'Admin',
  BUILDER:     'Builder',
  VIEWER:      'Viewer',
}

interface NavProps {
  pendingCount?: number
}

export function Nav({ pendingCount = 0 }: NavProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const [navMouse, setNavMouse] = useState({ x: -1000, y: -1000 })

  const handleNavMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setNavMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }, [])

  const handleNavMouseLeave = useCallback(() => {
    setNavMouse({ x: -1000, y: -1000 })
  }, [])

  const role     = session?.user?.role as string | undefined
  const isAdmin  = role === 'ADMIN' || role === 'SUPER_ADMIN'
  const initials = (session?.user?.name ?? 'U')
    .split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()

  return (
    <header
      className="sticky top-0 z-30 bg-[#040B4D] border-b border-[#18197D]/60 shadow-md overflow-hidden"
      onMouseMove={handleNavMouseMove}
      onMouseLeave={handleNavMouseLeave}
    >
      {/* Mouse spotlight */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(350px circle at ${navMouse.x}px ${navMouse.y}px, rgba(99,60,255,0.25), rgba(38,5,239,0.08) 45%, transparent 65%)`,
        }}
        aria-hidden
      />
      <div className="page-container relative">
        <div className="flex h-14 items-center justify-between gap-4">

          {/* ── Brand + nav ──────────────────────────────────────────── */}
          <div className="flex items-center gap-6 min-w-0">
            <Link href="/dashboard" className="flex items-center gap-3 flex-shrink-0 group">
              <div className="h-7 w-7 rounded-full bg-[#2605EF] flex items-center justify-center shadow-sm group-hover:bg-[#1e04cc] transition-colors flex-shrink-0">
                <span className="text-white font-bold text-xs select-none font-display">CP</span>
              </div>
              <div className="leading-none hidden sm:block">
                <p className="font-display font-bold text-[13px] text-white tracking-tight leading-none">CleverProfits</p>
                <p className="text-[10px] text-white/30 mt-0.5 tracking-widest uppercase leading-none">Tools</p>
              </div>
            </Link>

            <nav className="hidden sm:flex items-center gap-0.5" aria-label="Main">
              {NAV_LINKS.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
                      isActive
                        ? 'bg-white/15 text-white font-medium'
                        : 'text-white/60 hover:text-white hover:bg-white/10',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {label}
                  </Link>
                )
              })}

              {isAdmin && (
                <Link
                  href="/dashboard/admin/tools"
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
                    pathname.startsWith('/dashboard/admin')
                      ? 'bg-white/15 text-white font-medium'
                      : 'text-white/60 hover:text-white hover:bg-white/10',
                  )}
                >
                  <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
                  Admin
                  {pendingCount > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-amber-400 text-[#040B4D] text-[10px] font-bold min-w-[1.1rem] h-[1.1rem] px-1 leading-none">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              )}
            </nav>
          </div>

          {/* ── User dropdown ─────────────────────────────────────────── */}
          {session?.user && (
            <div className="relative flex-shrink-0" ref={dropdownRef}>
              <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/10 transition-colors focus-ring"
                aria-expanded={open}
                aria-haspopup="true"
              >
                {/* Avatar */}
                {session.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt={session.user.name ?? 'User'}
                    className="h-7 w-7 rounded-full object-cover ring-1 ring-white/20 flex-shrink-0"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-[#2605EF] flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-white select-none">{initials}</span>
                  </div>
                )}
                <span className="hidden md:block text-sm font-medium text-white/80 max-w-[100px] truncate">
                  {session.user.name?.split(' ')[0]}
                </span>
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 text-white/40 transition-transform duration-150 hidden md:block',
                    open && 'rotate-180',
                  )}
                  aria-hidden
                />
              </button>

              {/* Dropdown panel */}
              {open && (
                <div className="absolute right-0 top-full mt-1.5 w-72 rounded-xl border border-slate-200 bg-white shadow-elevated overflow-hidden z-50">
                  {/* User info header */}
                  <div className="px-4 py-4 border-b border-slate-100 bg-gradient-to-br from-[#040B4D] to-[#18197D]">
                    <div className="flex items-center gap-3">
                      {session.user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={session.user.image}
                          alt={session.user.name ?? 'User'}
                          className="h-10 w-10 rounded-full object-cover ring-2 ring-white/20 flex-shrink-0"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-[#2605EF] flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-white select-none">{initials}</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{session.user.name}</p>
                        <p className="text-xs text-white/60 truncate">{session.user.email}</p>
                      </div>
                    </div>
                    {role && (
                      <div className="mt-2.5">
                        <span className={cn(
                          'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
                          ROLE_STYLES[role] ?? 'bg-slate-100 text-slate-600',
                        )}>
                          {ROLE_LABELS[role] ?? role}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="py-1">
                    <button
                      onClick={() => signOut({ callbackUrl: '/login' })}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </header>
  )
}
