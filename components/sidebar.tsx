'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  Wrench, LogOut, PlusCircle, LayoutDashboard, ClipboardList,
  ShieldCheck, Users, Mail, FileText, BarChart2, Sparkles,
  Menu, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// Navigation structure
// Three sections: CORE (all users) · INTELLIGENCE (admins) · GOVERNANCE (admins)
// ─────────────────────────────────────────────────────────────────────────────

const CORE_LINKS = [
  { href: '/dashboard',          label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/dashboard/my-tools', label: 'My Tools',      icon: ClipboardList   },
  { href: '/dashboard/register', label: 'Register Tool', icon: PlusCircle      },
]

const INTELLIGENCE_LINKS = [
  { href: '/dashboard/admin/insights',  label: 'Insights',   icon: Sparkles  },
  { href: '/dashboard/admin/analytics', label: 'Analytics',  icon: BarChart2 },
]

const GOVERNANCE_LINKS: { href: string; label: string; icon: typeof Wrench; hasBadge?: true }[] = [
  { href: '/dashboard/admin/tools',       label: 'Reviews',     icon: ShieldCheck, hasBadge: true },
  { href: '/dashboard/admin/users',       label: 'Users',        icon: Users    },
  { href: '/dashboard/admin/invitations', label: 'Invitations',  icon: Mail     },
  { href: '/dashboard/admin/audit',       label: 'Audit Log',    icon: FileText },
]

const ROLE_STYLES: Record<string, string> = {
  SUPER_ADMIN: 'bg-violet-500/15 text-violet-300',
  ADMIN:       'bg-[#2605EF]/15  text-blue-300',
  BUILDER:     'bg-amber-500/15  text-amber-300',
  VIEWER:      'bg-white/8       text-white/35',
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN:       'Admin',
  BUILDER:     'Builder',
  VIEWER:      'Viewer',
}

// ─────────────────────────────────────────────────────────────────────────────
// NavItem — single navigation link
// ─────────────────────────────────────────────────────────────────────────────

interface NavItemProps {
  href:       string
  label:      string
  icon:       React.FC<{ className?: string }>
  isActive:   boolean
  badge?:     number
  onClick?:   () => void
}

function NavItem({ href, label, icon: Icon, isActive, badge, onClick }: NavItemProps) {
  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          'group flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] transition-all duration-150 relative',
          isActive
            ? 'bg-white/[0.11] text-white font-medium'
            : 'text-white/60 hover:text-white hover:bg-white/[0.07]',
        )}
      >
        {/* Left accent pill */}
        <span
          className={cn(
            'absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-full transition-all duration-200',
            isActive ? 'bg-[#2605EF] opacity-100' : 'opacity-0 bg-white/30 group-hover:opacity-60',
          )}
          aria-hidden
        />

        <Icon
          className={cn(
            'h-[15px] w-[15px] flex-shrink-0 transition-colors ml-1',
            isActive ? 'text-white' : 'text-white/55 group-hover:text-white/90',
          )}
        />

        <span className="flex-1 truncate leading-none">{label}</span>

        {badge !== undefined && badge > 0 && (
          <span className="inline-flex items-center justify-center rounded-full bg-amber-400 text-[#040B4D] text-[10px] font-bold min-w-[1.1rem] h-[1.1rem] px-1 leading-none flex-shrink-0">
            {badge}
          </span>
        )}
      </Link>
    </li>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionLabel
// ─────────────────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-white/35 uppercase tracking-[0.13em] px-3.5 mb-1 mt-0.5">
      {children}
    </p>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SidebarNav (inner content)
// ─────────────────────────────────────────────────────────────────────────────

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

      {/* ── Navigation ─────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-4" aria-label="Main">

        {/* CORE */}
        <div>
          <SectionLabel>Core</SectionLabel>
          <ul className="px-1.5 space-y-px">
            {CORE_LINKS.map(({ href, label, icon }) => (
              <NavItem
                key={href}
                href={href}
                label={label}
                icon={icon}
                isActive={pathname === href}
                onClick={onLinkClick}
              />
            ))}
          </ul>
        </div>

        {/* INTELLIGENCE — admins only */}
        {isAdmin && (
          <div>
            <SectionLabel>Intelligence</SectionLabel>
            <ul className="px-1.5 space-y-px">
              {INTELLIGENCE_LINKS.map(({ href, label, icon }) => (
                <NavItem
                  key={href}
                  href={href}
                  label={label}
                  icon={icon}
                  isActive={pathname.startsWith(href)}
                  onClick={onLinkClick}
                />
              ))}
            </ul>
          </div>
        )}

        {/* GOVERNANCE — admins only */}
        {isAdmin && (
          <div>
            <SectionLabel>Governance</SectionLabel>
            <ul className="px-1.5 space-y-px">
              {GOVERNANCE_LINKS.map(({ href, label, icon, hasBadge }) => (
                <NavItem
                  key={href}
                  href={href}
                  label={label}
                  icon={icon}
                  isActive={pathname.startsWith(href)}
                  badge={hasBadge ? pendingCount : undefined}
                  onClick={onLinkClick}
                />
              ))}
            </ul>
          </div>
        )}
      </nav>

      {/* ── User profile ────────────────────────────────────── */}
      {session?.user && (
        <div className="border-t border-white/[0.06] p-2.5">
          <div className="group flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/[0.04] transition-colors cursor-default">
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={session.user.name ?? 'User'}
                className="h-7 w-7 rounded-full object-cover ring-1 ring-white/15 flex-shrink-0"
              />
            ) : (
              <div className="h-7 w-7 rounded-full bg-[#2605EF] flex items-center justify-center flex-shrink-0">
                <span className="text-[11px] font-semibold text-white select-none">{initials}</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-white/75 truncate leading-tight">
                {session.user.name}
              </p>
              {role && (
                <span className={cn(
                  'inline-block rounded px-1 py-px text-[9px] font-semibold leading-[14px] uppercase tracking-wide',
                  ROLE_STYLES[role] ?? 'bg-white/8 text-white/35',
                )}>
                  {ROLE_LABELS[role] ?? role}
                </span>
              )}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="p-1.5 rounded-md text-white/20 hover:text-white/60 hover:bg-white/[0.07] transition-all duration-150 flex-shrink-0 opacity-0 group-hover:opacity-100"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar (shell + mobile drawer)
// ─────────────────────────────────────────────────────────────────────────────

interface SidebarProps {
  pendingCount?: number
}

export function Sidebar({ pendingCount = 0 }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data: session } = useSession()

  const initials = (session?.user?.name ?? 'U')
    .split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()

  const Logo = () => (
    <Link href="/dashboard" className="flex items-center gap-2.5 group">
      <div className="h-8 w-8 rounded-lg bg-[#2605EF] flex items-center justify-center shadow-sm group-hover:bg-[#1e04cc] transition-colors flex-shrink-0">
        <Wrench className="h-4 w-4 text-white" aria-hidden />
      </div>
      <div className="leading-none">
        <p className="font-display font-bold text-[13px] text-white tracking-tight leading-none">
          CleverProfits
        </p>
        <p className="text-[10px] text-white/30 mt-0.5 tracking-widest uppercase leading-none">
          Tools
        </p>
      </div>
    </Link>
  )

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────── */}
      <aside className="hidden md:flex flex-col sticky top-0 h-screen w-[220px] flex-shrink-0 bg-[#040B4D] border-r border-white/[0.05]">
        {/* Logo */}
        <div className="h-[52px] flex items-center px-4 border-b border-white/[0.06] flex-shrink-0">
          <Logo />
        </div>
        <SidebarNav pendingCount={pendingCount} />
      </aside>

      {/* ── Mobile top bar ────────────────────────────── */}
      <div className="md:hidden sticky top-0 z-30 flex h-12 items-center justify-between px-4 bg-[#040B4D] border-b border-white/[0.06]">
        <Logo />
        <div className="flex items-center gap-2">
          {session?.user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt={session.user.name ?? 'User'}
              className="h-7 w-7 rounded-full object-cover ring-1 ring-white/15"
            />
          ) : (
            <div className="h-7 w-7 rounded-full bg-[#2605EF] flex items-center justify-center">
              <span className="text-[11px] font-semibold text-white select-none">{initials}</span>
            </div>
          )}
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ─────────────────────────────── */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="md:hidden fixed inset-y-0 left-0 z-50 w-[220px] flex flex-col bg-[#040B4D] shadow-2xl border-r border-white/[0.05]">
            <div className="h-12 flex items-center justify-between px-4 border-b border-white/[0.06] flex-shrink-0">
              <Logo />
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" aria-hidden />
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
