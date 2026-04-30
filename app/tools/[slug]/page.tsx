import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { StatusBadge, AccessBadge } from '@/components/ui/badge'
import { ExternalLink, ArrowLeft, Clock, Users, Pencil, History } from 'lucide-react'
import { toolUrl, toolDisplayUrl } from '@/lib/tool-url'

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

  const tool = await prisma.tool.findUnique({
    where:   { slug: params.slug },
    include: { tags: { select: { id: true, name: true } } },
  })

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

  // Version history (shown to owner + admins)
  const canSeeChangelog = isAdmin || isOwner
  const versions = canSeeChangelog
    ? await prisma.toolVersion.findMany({
        where:   { toolId: tool.id },
        orderBy: { version: 'desc' },
        take:    10,
      })
    : []

  return (
    <div className="min-h-screen bg-[#EEF2FB]">
      <div className="max-w-2xl mx-auto px-4 py-12">

        {/* Back */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-[rgba(15,0,56,0.55)] hover:text-[#0F0038]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to Dashboard
          </Link>
          {showEdit && (
            <Link
              href={`/dashboard/tools/${tool.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7E7E7] bg-white px-3 py-1.5 text-sm font-medium text-[#0F0038] hover:bg-[#FAFAFA] transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Edit
            </Link>
          )}
        </div>

        {/* Success banner */}
        {updated && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-[rgba(16,185,129,0.10)] px-4 py-3">
            <p className="text-sm text-[#065F46]">Tool updated successfully.</p>
          </div>
        )}

        {/* Status banners */}
        {tool.status === 'PENDING' && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-[rgba(245,158,11,0.10)] px-4 py-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#F59E0B] flex-shrink-0" aria-hidden />
            <p className="text-sm text-[#92400E]">
              This tool is <strong>pending approval</strong> by an admin.
            </p>
          </div>
        )}

        {tool.status === 'REJECTED' && (
          <div className="mb-6 rounded-lg border border-[#FCA5A5] bg-[rgba(239,68,68,0.10)] px-4 py-3">
            <p className="text-sm font-medium text-[#991B1B] mb-1">This tool was rejected.</p>
            {tool.rejectionReason && (
              <p className="text-sm text-[#991B1B]">{tool.rejectionReason}</p>
            )}
          </div>
        )}

        {tool.status === 'ARCHIVED' && (
          <div className="mb-6 rounded-lg border border-[#E7E7E7] bg-[#E7E7E7] px-4 py-3">
            <p className="text-sm text-[rgba(15,0,56,0.65)]">This tool has been archived and is no longer active.</p>
          </div>
        )}

        {/* Card */}
        <div className="rounded-2xl border border-[#E7E7E7] bg-white shadow-card overflow-hidden">
          <div className="p-6 sm:p-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="font-display font-bold text-2xl text-[#0F0038] tracking-[-0.02em]">{tool.name}</h1>
                <p className="text-sm font-mono text-[rgba(15,0,56,0.40)] mt-0.5 truncate">{toolDisplayUrl(tool.slug)}</p>
              </div>
              <StatusBadge status={tool.status} />
            </div>

            {/* Description */}
            {tool.description && (
              <p className="text-[rgba(15,0,56,0.65)] text-sm leading-relaxed mb-6">{tool.description}</p>
            )}

            {/* Tags */}
            {tool.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-5">
                {tool.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center rounded-full bg-[#E7E7E7] px-2.5 py-0.5 text-xs font-medium text-[rgba(15,0,56,0.65)]"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-4 mb-6 py-4 border-y border-[#FAFAFA]">
              {tool.team && (
                <div className="flex items-center gap-2 text-sm text-[rgba(15,0,56,0.65)]">
                  <Users className="h-4 w-4 text-[rgba(15,0,56,0.40)] flex-shrink-0" aria-hidden />
                  <span>{tool.team}</span>
                </div>
              )}
              <div>
                <AccessBadge level={tool.accessLevel} />
              </div>
              <div className="col-span-2 text-xs text-[rgba(15,0,56,0.40)]">
                Registered by {tool.createdByName} · {createdAt}
              </div>
            </div>

            {/* Notes */}
            {tool.notes && (
              <div className="mb-6 rounded-lg bg-[#FAFAFA] border border-[#FAFAFA] px-4 py-3">
                <p className="text-xs font-medium text-[rgba(15,0,56,0.55)] uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm text-[#0F0038]">{tool.notes}</p>
              </div>
            )}

            {/* Launch button */}
            {tool.status === 'ACTIVE' && (
              <a
                href={toolUrl(tool.slug)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#2605EF] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#1E04C7] shadow-md transition-colors whitespace-nowrap"
              >
                Launch Tool
                <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            )}
          </div>

          {/* Changelog */}
          {canSeeChangelog && versions.length > 0 && (
            <div className="border-t border-[#FAFAFA] px-6 sm:px-8 py-5">
              <div className="flex items-center gap-2 mb-3">
                <History className="h-4 w-4 text-[rgba(15,0,56,0.40)]" aria-hidden />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[rgba(15,0,56,0.40)]">Change History</h2>
              </div>
              <ol className="space-y-3">
                {versions.map((v) => {
                  const changes = v.changes as Record<string, { from: unknown; to: unknown }>
                  const changedAt = new Date(v.createdAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })
                  return (
                    <li key={v.id} className="flex gap-3 text-sm">
                      <span className="flex-shrink-0 mt-0.5 h-5 w-5 rounded-full bg-[#E7E7E7] flex items-center justify-center text-[10px] font-bold text-[rgba(15,0,56,0.55)]">
                        v{v.version}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-[rgba(15,0,56,0.40)] mb-1">
                          {v.changedByName} · {changedAt}
                        </p>
                        <ul className="space-y-0.5">
                          {Object.entries(changes).map(([field, { from, to }]) => (
                            <li key={field} className="text-xs text-[rgba(15,0,56,0.65)]">
                              <span className="font-medium capitalize">{field}</span>
                              {' '}changed
                              {String(from) !== '' && (
                                <> from <code className="bg-[#E7E7E7] px-1 rounded text-[11px]">{String(from)}</code></>
                              )}
                              {' '}to <code className="bg-[#E7E7E7] px-1 rounded text-[11px]">{String(to)}</code>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
