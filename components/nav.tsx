'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Wrench, LogOut, PlusCircle, LayoutDashboard, ShieldAlert, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/dashboard',           label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/dashboard/my-tools',  label: 'My Tools',     icon: ClipboardList },
  { href: '/dashboard/register',  label: 'Register Tool', icon: PlusCircle },
]

export function Nav() {
  const pathname  = usePathname()
  const { data: session } = useSession()

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="page-container">
        <div className="flex h-14 items-center justify-between gap-4">

          {/* ── Brand + nav links ─────────────────────────────────────── */}
          <div className="flex items-center gap-6 min-w-0">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 text-slate-900 flex-shrink-0"
            >
              <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center">
                <Wrench className="h-3.5 w-3.5 text-white" aria-hidden />
              </div>
              <span className="font-semibold text-sm tracking-tight hidden sm:block">
                CleverProfits <span className="text-slate-400 font-normal">Tools</span>
              </span>
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
                        ? 'bg-slate-100 text-slate-900 font-medium'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {label}
                  </Link>
                )
              })}
              {(session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN') && (
                <Link
                  href="/dashboard/admin/tools"
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
                    pathname.startsWith('/dashboard/admin')
                      ? 'bg-slate-100 text-slate-900 font-medium'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50',
                  )}
                >
                  <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
                  Admin
                </Link>
              )}
            </nav>
          </div>

          {/* ── User area ─────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {session?.user?.name && (
              <div className="hidden md:flex items-center gap-2 pr-2 border-r border-slate-200">
                {/* Avatar circle from initials */}
                <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-slate-600 select-none">
                    {session.user.name
                      .split(' ')
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-slate-500 max-w-[160px] truncate">
                  {session.user.email}
                </span>
              </div>
            )}

            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs',
                'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
                'transition-colors focus-ring',
              )}
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  )
}
