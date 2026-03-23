import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

type RouteContext = { params: { id: string } }

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tools/[id]/versions
//
// Returns the full version history for a tool, newest first.
// Accessible by the tool's owner, or any ADMIN/SUPER_ADMIN.
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: RouteContext,
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tool = await prisma.tool.findUnique({
    where: { id: params.id },
    select: { id: true, createdByEmail: true },
  })

  if (!tool) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
  }

  const role    = session.user.role
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'
  const isOwner = tool.createdByEmail === session.user.email

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const versions = await prisma.toolVersion.findMany({
    where:   { toolId: params.id },
    orderBy: { version: 'desc' },
  })

  return NextResponse.json(versions)
}
