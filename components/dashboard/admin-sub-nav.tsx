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
    { href: '/dashboard/admin/analytics',   label: 'Analytics' },
    { href: '/dashboard/admin/insights',    label: 'Insights' },
  ]

  return (
    <div className="flex gap-0 border-b-2 border-[#E7E7E7] mb-6 overflow-x-auto scrollbar-none">
      {tabs.map(({ href, label, badge }) => {
        const isActive = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-1.5 px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap',
              isActive
                ? 'border-[#2605EF] text-[#0F0038]'
                : 'border-transparent text-[rgba(15,0,56,0.55)] hover:text-[#0F0038]',
            )}
          >
            {label}
            {badge !== undefined && (
              <span className={cn(
                'inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] min-w-[1.25rem]',
                isActive
                  ? 'bg-[rgba(38,5,239,0.10)] text-[#2605EF]'
                  : 'bg-[rgba(245,158,11,0.10)] text-[#92400E]',
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
