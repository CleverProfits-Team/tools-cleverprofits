import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { MyToolsList } from '@/components/dashboard/my-tools-list'
import type { SerializedTool } from '@/types'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'My submissions' }

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
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-[#040B4D] tracking-tight">My submissions</h1>
        <p className="text-sm text-[#64748b] mt-1">Tools you&apos;ve registered on the platform</p>
      </div>
      <MyToolsList tools={rawTools.map(serialize)} drafts={rawDrafts.map(serialize)} />
    </div>
  )
}
