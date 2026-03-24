import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

type RouteContext = { params: { id: string } }

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/tools/draft/[id]
//
// Hard-deletes a DRAFT tool owned by the caller.
// DRAFTs have never been submitted or approved — permanent deletion is safe.
//
// Returns 204 on success.
// Returns 404 if not found, 403 if not the owner (unless ADMIN/SUPER_ADMIN),
// 409 if the tool is not in DRAFT status.
// ─────────────────────────────────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext,
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tool = await prisma.tool.findUnique({
    where:  { id: params.id },
    select: { id: true, status: true, createdByEmail: true },
  })

  if (!tool) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (tool.status !== 'DRAFT') {
    return NextResponse.json({ error: 'Can only discard draft tools' }, { status: 409 })
  }

  const role = session.user.role
  if (tool.createdByEmail !== session.user.email && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.tool.delete({ where: { id: params.id } })

  return new NextResponse(null, { status: 204 })
}
