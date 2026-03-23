import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { StatusBadge, AccessBadge } from '@/components/ui/badge'
import { ExternalLink, ArrowLeft, Clock, Users, Pencil } from 'lucide-react'

export const dynamic = 'force-dynamic'

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const tool = await prisma.tool.findUnique({ where: { slug: params.slug }, select: { name: true } })
  return { title: tool?.name ?? 'Tool' }
}

export default async function ToolInfoPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getServerSession(authOptions)
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN'
  const userEmail = session?.user?.email ?? ''

  const tool = await prisma.tool.findUnique({ where: { slug: params.slug } })

  // Not found or archived (and not admin)
  if (!tool || (tool.status === 'ARCHIVED' && !isAdmin)) notFound()

  // PENDING/REJECTED — only visible to submitter or admin
  const isOwner = tool.createdByEmail === userEmail
  if ((tool.status === 'PENDING' || tool.status === 'REJECTED') && !isOwner && !isAdmin) {
    notFound()
  }

  const createdAt = tool.createdAt.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  const showEdit = isAdmin || (isOwner && (tool.status === 'PENDING' || tool.status === 'REJECTED'))
  const updated  = searchParams.updated === '1'

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-12">

        {/* Back */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to Dashboard
          </Link>
          {showEdit && (
            <Link
              href={`/dashboard/tools/${tool.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Edit
            </Link>
          )}
        </div>

        {/* Success banner */}
        {updated && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-sm text-emerald-800">Tool updated successfully.</p>
          </div>
        )}

        {/* Status banners */}
        {tool.status === 'PENDING' && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600 flex-shrink-0" aria-hidden />
            <p className="text-sm text-amber-800">
              This tool is <strong>pending approval</strong> by an admin.
            </p>
          </div>
        )}

        {tool.status === 'REJECTED' && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-medium text-red-800 mb-1">This tool was rejected.</p>
            {tool.rejectionReason && (
              <p className="text-sm text-red-700">{tool.rejectionReason}</p>
            )}
          </div>
        )}

        {tool.status === 'ARCHIVED' && (
          <div className="mb-6 rounded-lg border border-slate-200 bg-slate-100 px-4 py-3">
            <p className="text-sm text-slate-600">This tool has been archived and is no longer active.</p>
          </div>
        )}

        {/* Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-card overflow-hidden">
          <div className="p-6 sm:p-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{tool.name}</h1>
                <p className="text-sm font-mono text-slate-400 mt-0.5">/{tool.slug}</p>
              </div>
              <StatusBadge status={tool.status} />
            </div>

            {/* Description */}
            {tool.description && (
              <p className="text-slate-600 text-sm leading-relaxed mb-6">{tool.description}</p>
            )}

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-4 mb-6 py-4 border-y border-slate-100">
              {tool.team && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Users className="h-4 w-4 text-slate-400 flex-shrink-0" aria-hidden />
                  <span>{tool.team}</span>
                </div>
              )}
              <div>
                <AccessBadge level={tool.accessLevel} />
              </div>
              <div className="col-span-2 text-xs text-slate-400">
                Registered by {tool.createdByName} · {createdAt}
              </div>
            </div>

            {/* Notes */}
            {tool.notes && (
              <div className="mb-6 rounded-lg bg-slate-50 border border-slate-100 px-4 py-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm text-slate-700">{tool.notes}</p>
              </div>
            )}

            {/* Launch button */}
            {tool.status === 'ACTIVE' && (
              <a
                href={`/${tool.slug}`}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Launch Tool
                <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
