import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Nav } from '@/components/nav'

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
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 page-container py-8">
        {children}
      </main>
    </div>
  )
}
