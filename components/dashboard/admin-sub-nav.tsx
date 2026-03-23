'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Props {
  pendingCount: number
}

export function AdminSubNav({ pendingCount }: Props) {
  const pathname = usePathname()

  const tabs = [
    { href: '/dashboard/admin/tools',       label: 'Tools',       badge: pendingCount > 0 ? pendingCount : undefined },
    { href: '/dashboard/admin/users',       label: 'Users' },
    { href: '/dashboard/admin/invitations', label: 'Invitations' },
    { href: '/dashboard/admin/audit',       label: 'Audit Log' },
  ]

  return (
    <div className="flex gap-1 border-b border-slate-200 mb-6">
      {tabs.map(({ href, label, badge }) => {
        const isActive = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              isActive
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
            )}
          >
            {label}
            {badge !== undefined && (
              <span className={cn(
                'inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-medium min-w-[1.25rem]',
                isActive ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700',
              )}>
                {badge}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
