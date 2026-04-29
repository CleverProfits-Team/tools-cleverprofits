import { redirect, notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { EditToolForm } from '@/components/forms/edit-tool-form'
import type { SerializedTool } from '@/types'

export const dynamic = 'force-dynamic'

export default async function EditToolPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect('/login')

  const tool = await prisma.tool.findUnique({
    where:   { id: params.id },
    include: { tags: { select: { id: true, name: true } } },
  })
  if (!tool) notFound()

  const role     = session.user.role as string
  const isAdmin  = role === 'ADMIN' || role === 'SUPER_ADMIN'
  const isOwner  = tool.createdByEmail === session.user.email

  if (!isAdmin && !isOwner) redirect('/dashboard')

  if (!isAdmin && tool.status !== 'PENDING' && tool.status !== 'REJECTED') {
    redirect(`/tools/${tool.slug}`)
  }

  const serialized: SerializedTool = {
    ...tool,
    createdAt: tool.createdAt.toISOString(),
    updatedAt: tool.updatedAt.toISOString(),
  }

  return (
    <div className="min-h-screen bg-[#EEF2FB]">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="font-display font-bold text-2xl text-[#0F0038] tracking-[-0.02em] mb-8">Edit Tool</h1>
        <div className="rounded-2xl border border-[#E7E7E7] bg-white shadow-card p-6 sm:p-8">
          <EditToolForm tool={serialized} isAdmin={isAdmin} />
        </div>
      </div>
    </div>
  )
}
