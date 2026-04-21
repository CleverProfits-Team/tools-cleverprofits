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
    {
      href: '/dashboard/admin/tools',
      label: 'Tools',
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    { href: '/dashboard/admin/users', label: 'Users' },
    { href: '/dashboard/admin/invitations', label: 'Invitations' },
    { href: '/dashboard/admin/audit', label: 'Audit log' },
    { href: '/dashboard/admin/analytics', label: 'Analytics' },
    { href: '/dashboard/admin/insights', label: 'Insights' },
  ]

  return (
    <div className="flex gap-1 bg-[#FAFAFA] rounded-xl p-1 mb-6 overflow-x-auto scrollbar-none">
      {tabs.map(({ href, label, badge }) => {
        const isActive = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm font-display font-semibold rounded-lg transition-colors duration-150 whitespace-nowrap flex-shrink-0',
              isActive
                ? 'bg-[#2605EF] text-white shadow-sm'
                : 'text-[rgba(4,11,77,0.55)] hover:text-[#040B4D] hover:bg-white',
            )}
          >
            {label}
            {badge !== undefined && (
              <span
                className={cn(
                  'inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-medium min-w-[1.25rem] leading-none',
                  isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700',
                )}
              >
                {badge}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
