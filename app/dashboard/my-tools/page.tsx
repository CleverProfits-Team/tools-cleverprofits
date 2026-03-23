import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { MyToolsList } from '@/components/dashboard/my-tools-list'
import type { SerializedTool } from '@/types'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'My Submissions' }

export default async function MyToolsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect('/login')

  const rawTools = await prisma.tool.findMany({
    where:   { createdByEmail: session.user.email },
    include: { tags: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const tools: SerializedTool[] = rawTools.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Submissions</h1>
        <p className="text-sm text-slate-500 mt-1">Tools you&apos;ve registered on the platform</p>
      </div>
      <MyToolsList tools={tools} />
    </div>
  )
}
