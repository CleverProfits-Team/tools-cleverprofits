import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Sidebar } from '@/components/sidebar'
import { CommandPalette } from '@/components/command-palette'

export const metadata: Metadata = {
  title: {
    default: 'Dashboard',
    template: '%s — CleverProfits Tools',
  },
}

/**
 * Dashboard layout — server-side auth gate.
 *
 * The middleware handles the primary redirect, but this layout adds a
 * server-side check as defense-in-depth. Any page under /dashboard will
 * immediately redirect to /login if the session is missing.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN'

  const [pendingCount, paletteTools] = await Promise.all([
    isAdmin ? prisma.tool.count({ where: { status: 'PENDING' } }) : Promise.resolve(0),
    prisma.tool.findMany({
      where: { status: { not: 'DRAFT' } },
      select: { id: true, name: true, slug: true, status: true, team: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div className="md:flex min-h-screen bg-[#F8F8FC]">
      <Sidebar pendingCount={pendingCount} />
      <div className="flex-1 min-w-0">
        <main className="px-4 sm:px-6 lg:px-8 py-8 min-h-screen relative">{children}</main>
      </div>
      <CommandPalette tools={paletteTools} />
    </div>
  )
}
