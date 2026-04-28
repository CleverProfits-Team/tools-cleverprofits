import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PlusCircle } from 'lucide-react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { MyToolsList } from '@/components/dashboard/my-tools-list'
import { PageHeader } from '@/components/dashboard/page-header'
import type { SerializedTool } from '@/types'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'My Submissions' }

export default async function MyToolsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect('/login')

  const [rawTools, rawDrafts] = await Promise.all([
    prisma.tool.findMany({
      where:   { createdByEmail: session.user.email, status: { not: 'DRAFT' } },
      include: { tags: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.tool.findMany({
      where:   { createdByEmail: session.user.email, status: 'DRAFT' },
      include: { tags: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  function serialize(t: typeof rawTools[number]): SerializedTool {
    return {
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }
  }

  return (
    <div className="animate-in">
      <PageHeader
        label="INTERNAL ASSET REGISTRY"
        title="My Submissions"
        subtitle="Tools you've registered on the platform"
        action={
          <Link
            href="/dashboard/register"
            className="inline-flex items-center gap-2 rounded-xl bg-white/[0.1] border border-white/[0.15] px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.18] hover:border-white/25 transition-all duration-150 backdrop-blur-sm"
          >
            <PlusCircle className="h-4 w-4" aria-hidden />
            Register Tool
          </Link>
        }
      />
      <MyToolsList tools={rawTools.map(serialize)} drafts={rawDrafts.map(serialize)} />
    </div>
  )
}
