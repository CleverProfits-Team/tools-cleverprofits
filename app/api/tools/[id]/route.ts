import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { updateToolSchema } from '@/lib/validations'

type RouteContext = { params: { id: string } }

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tools/[id]
//
// Returns a single tool by its cuid. Returns 404 if not found.
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
  })

  if (!tool) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
  }

  return NextResponse.json(tool)
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/tools/[id]
//
// Updates allowed fields on an existing tool.
//
// What CAN be updated: name, externalUrl, description, team, accessLevel,
//                      notes, status
//
// What CANNOT be updated: slug (immutable after creation), createdByName,
//                         createdByEmail, createdAt
//
// Slug immutability is enforced at the schema level — updateToolSchema omits
// the slug field, so even if a caller sends it, it is silently ignored.
//
// Returns 404 if not found, 422 on validation failure, 200 with updated tool.
// ─────────────────────────────────────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: RouteContext,
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify the tool exists before parsing the body — avoids wasted work
  const existing = await prisma.tool.findUnique({
    where: { id: params.id },
    select: { id: true, slug: true },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
  }

  // Parse body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 })
  }

  // Validate with partial schema (all fields optional, slug excluded)
  const parsed = updateToolSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    )
  }

  const data = parsed.data

  if (data.status !== undefined) {
    const role = session.user.role
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: only admins can change tool status' },
        { status: 403 },
      )
    }
    if (data.status === 'REJECTED' && !data.rejectionReason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 422 },
      )
    }
  }

  // If the payload is effectively empty, return early rather than issuing a
  // no-op UPDATE that increments updatedAt unnecessarily.
  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: 'No updatable fields provided' },
      { status: 400 },
    )
  }

  try {
    const tool = await prisma.tool.update({
      where: { id: params.id },
      data: {
        ...data,
        // Coerce empty strings to null for optional text fields
        ...(data.description !== undefined
          ? { description: data.description || null }
          : {}),
        ...(data.team !== undefined
          ? { team: data.team || null }
          : {}),
        ...(data.notes !== undefined
          ? { notes: data.notes || null }
          : {}),
        // Only persist rejectionReason when status is REJECTED; clear it otherwise
        rejectionReason: data.status === 'REJECTED' ? (data.rejectionReason ?? null) : null,
      },
    })

    return NextResponse.json(tool)
  } catch (err) {
    console.error('[PUT /api/tools/[id]]', err)
    return NextResponse.json({ error: 'Failed to update tool' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/tools/[id]
//
// Soft-deletes a tool by setting its status to ARCHIVED.
//
// Hard deletion is intentionally NOT supported:
//   - Archived tools preserve audit history (who registered what, when)
//   - The proxy route returns 503 for ARCHIVED tools with a clear message
//   - An admin can reactivate an archived tool by setting status → ACTIVE
//
// Returns 404 if not found, 409 if already archived, 200 with the updated tool.
// ─────────────────────────────────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext,
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch only the fields we need for the guard checks
  const existing = await prisma.tool.findUnique({
    where: { id: params.id },
    select: { id: true, status: true, name: true },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
  }

  if (existing.status === 'ARCHIVED') {
    return NextResponse.json(
      { error: `"${existing.name}" is already archived` },
      { status: 409 },
    )
  }

  try {
    const tool = await prisma.tool.update({
      where: { id: params.id },
      data: { status: 'ARCHIVED' },
    })

    return NextResponse.json(tool)
  } catch (err) {
    console.error('[DELETE /api/tools/[id]]', err)
    return NextResponse.json({ error: 'Failed to archive tool' }, { status: 500 })
  }
}
