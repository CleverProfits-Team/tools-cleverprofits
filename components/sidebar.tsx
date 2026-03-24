'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  Wrench, LogOut, PlusCircle, LayoutDashboard,
  ShieldAlert, ClipboardList, Menu, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/dashboard',          label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/dashboard/my-tools', label: 'My Tools',      icon: ClipboardList   },
  { href: '/dashboard/register', label: 'Register Tool', icon: PlusCircle      },
]

const ROLE_STYLES: Record<string, string> = {
  SUPER_ADMIN: 'bg-violet-500/20 text-violet-200',
  ADMIN:       'bg-blue-500/20   text-blue-200',
  BUILDER:     'bg-amber-500/20  text-amber-200',
  VIEWER:      'bg-white/10      text-white/50',
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN:       'Admin',
  BUILDER:     'Builder',
  VIEWER:      'Viewer',
}

interface SidebarNavProps {
  pendingCount: number
  onLinkClick?: () => void
}

function SidebarNav({ pendingCount, onLinkClick }: SidebarNavProps) {
  const pathname = usePathname()
  const { data: session } = useSession()

  const role    = session?.user?.role as string | undefined
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'
  const initials = (session?.user?.name ?? 'U')
    .split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()

  return (
    <div className="flex flex-col h-full">
      {/* ── Main nav ────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 pt-5 pb-2" aria-label="Main">
        <p className="text-[10px] font-semibold text-white/20 uppercase tracking-[0.12em] mb-3 px-2.5">
          Platform
        </p>
        <ul className="space-y-0.5">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onLinkClick}
                  className={cn(
                    'flex items-center gap-2.5 py-2.5 rounded-lg text-sm border-l-2 px-2.5',
                    'transition-all duration-150',
                    isActive
                      ? 'bg-white/[0.12] text-white font-semibold border-[#2605EF] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),-1px_0_10px_rgba(38,5,239,0.2)]'
                      : 'text-white/45 hover:text-white/90 hover:bg-white/[0.06] border-transparent hover:translate-x-[2px]',
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" aria-hidden />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>

        {isAdmin && (
          <div className="mt-6">
            <p className="text-[10px] font-semibold text-white/20 uppercase tracking-[0.12em] mb-3 px-2.5">
              Admin
            </p>
            <ul>
              <li>
                <Link
                  href="/dashboard/admin/tools"
                  onClick={onLinkClick}
                  className={cn(
                    'flex items-center gap-2.5 py-2.5 rounded-lg text-sm border-l-2 px-2.5',
                    'transition-all duration-150',
                    pathname.startsWith('/dashboard/admin')
                      ? 'bg-white/[0.12] text-white font-semibold border-[#2605EF] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),-1px_0_10px_rgba(38,5,239,0.2)]'
                      : 'text-white/45 hover:text-white/90 hover:bg-white/[0.06] border-transparent hover:translate-x-[2px]',
                  )}
                >
                  <ShieldAlert className="h-4 w-4 flex-shrink-0" aria-hidden />
                  Admin
                  {pendingCount > 0 && (
                    <span className="ml-auto inline-flex items-center justify-center rounded-full bg-amber-400 text-[#040B4D] text-[10px] font-bold min-w-[1.25rem] h-5 px-1.5 leading-none">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              </li>
            </ul>
          </div>
        )}
      </nav>

      {/* ── User profile ────────────────────────────────── */}
      {session?.user && (
        <div className="border-t border-white/[0.08] px-3 py-3">
          <div className="flex items-center gap-2.5 px-2 mb-2">
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={session.user.name ?? 'User'}
                className="h-8 w-8 rounded-full object-cover ring-1 ring-white/20 flex-shrink-0"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-[#2605EF] flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-white select-none">{initials}</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate leading-tight">
                {session.user.name}
              </p>
              {role && (
                <span className={cn(
                  'inline-block rounded-full px-1.5 py-0 text-[10px] font-medium leading-5',
                  ROLE_STYLES[role] ?? 'bg-white/10 text-white/50',
                )}>
                  {ROLE_LABELS[role] ?? role}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs text-white/35 hover:text-white hover:bg-white/[0.07] transition-all duration-150"
          >
            <LogOut className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

interface SidebarProps {
  pendingCount?: number
}

export function Sidebar({ pendingCount = 0 }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data: session } = useSession()

  const initials = (session?.user?.name ?? 'U')
    .split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────────── */}
      <aside className="hidden md:flex flex-col sticky top-0 h-screen w-60 flex-shrink-0 bg-[#040B4D] border-r border-white/[0.06]">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 px-5 border-b border-white/[0.08] flex-shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-lg bg-[#2605EF] flex items-center justify-center shadow-sm group-hover:bg-[#1e04cc] transition-colors flex-shrink-0">
              <Wrench className="h-4 w-4 text-white" aria-hidden />
            </div>
            <span className="font-display font-bold text-sm tracking-tight text-white">
              CleverProfits{' '}
              <span className="text-white/40 font-normal">Tools</span>
            </span>
          </Link>
        </div>

        <SidebarNav pendingCount={pendingCount} />
      </aside>

      {/* ── Mobile top bar ────────────────────────────────── */}
      <div className="md:hidden sticky top-0 z-30 flex h-14 items-center justify-between px-4 bg-[#040B4D] border-b border-white/[0.08]">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="h-7 w-7 rounded-lg bg-[#2605EF] flex items-center justify-center group-hover:bg-[#1e04cc] transition-colors">
            <Wrench className="h-3.5 w-3.5 text-white" aria-hidden />
          </div>
          <span className="font-display font-bold text-sm tracking-tight text-white">
            CleverProfits{' '}
            <span className="text-white/40 font-normal">Tools</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {session?.user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt={session.user.name ?? 'User'}
              className="h-7 w-7 rounded-full object-cover ring-1 ring-white/20"
            />
          ) : (
            <div className="h-7 w-7 rounded-full bg-[#2605EF] flex items-center justify-center">
              <span className="text-xs font-semibold text-white select-none">{initials}</span>
            </div>
          )}
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ─────────────────────────────────── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          {/* Drawer */}
          <div className="md:hidden fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-[#040B4D] shadow-2xl border-r border-white/[0.06]">
            {/* Drawer header */}
            <div className="flex h-14 items-center justify-between px-4 border-b border-white/[0.08] flex-shrink-0">
              <Link href="/dashboard" className="flex items-center gap-2.5 group" onClick={() => setMobileOpen(false)}>
                <div className="h-7 w-7 rounded-lg bg-[#2605EF] flex items-center justify-center group-hover:bg-[#1e04cc] transition-colors">
                  <Wrench className="h-3.5 w-3.5 text-white" aria-hidden />
                </div>
                <span className="font-display font-bold text-sm tracking-tight text-white">
                  CleverProfits{' '}
                  <span className="text-white/40 font-normal">Tools</span>
                </span>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <SidebarNav
              pendingCount={pendingCount}
              onLinkClick={() => setMobileOpen(false)}
            />
          </div>
        </>
      )}
    </>
  )
}
