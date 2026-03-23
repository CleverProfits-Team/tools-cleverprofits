import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { updateToolSchema } from '@/lib/validations'
import { writeAuditLog } from '@/lib/audit'

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
    include: { tags: { select: { id: true, name: true } } },
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
    select: {
      id: true, slug: true, name: true, status: true, createdByEmail: true,
      externalUrl: true, description: true, team: true, notes: true,
      accessLevel: true, rejectionReason: true,
      tags: { select: { id: true, name: true } },
    },
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

  // Non-admins can only edit their own PENDING or REJECTED tools
  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    if (existing.createdByEmail !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (existing.status !== 'PENDING' && existing.status !== 'REJECTED') {
      return NextResponse.json(
        { error: 'Active tools can only be edited by admins' },
        { status: 403 },
      )
    }
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

  // Extract tags from payload (handled separately via relation)
  const { tags: incomingTags, ...scalarData } = data

  if (scalarData.status !== undefined) {
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: only admins can change tool status' },
        { status: 403 },
      )
    }
    if (scalarData.status === 'REJECTED' && !scalarData.rejectionReason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 422 },
      )
    }
  }

  // If the payload is effectively empty, return early rather than issuing a
  // no-op UPDATE that increments updatedAt unnecessarily.
  if (Object.keys(scalarData).length === 0 && incomingTags === undefined) {
    return NextResponse.json(
      { error: 'No updatable fields provided' },
      { status: 400 },
    )
  }

  try {
    // ── Build tag update operation ─────────────────────────────────────────
    let tagsUpdate: Record<string, unknown> | undefined
    if (incomingTags !== undefined) {
      tagsUpdate = {
        set: [],  // disconnect all existing tags first
        connectOrCreate: incomingTags.map((name) => ({
          where:  { name },
          create: { name },
        })),
      }
    }

    // ── Compute changelog diff ─────────────────────────────────────────────
    const TRACKED_FIELDS = [
      'name', 'externalUrl', 'description', 'team', 'notes', 'accessLevel', 'status',
    ] as const

    type TrackedField = typeof TRACKED_FIELDS[number]
    const changes: Record<string, { from: unknown; to: unknown }> = {}

    for (const field of TRACKED_FIELDS) {
      if (scalarData[field as keyof typeof scalarData] !== undefined) {
        const from = existing[field as keyof typeof existing]
        const to   = scalarData[field as keyof typeof scalarData]
        if (from !== to) changes[field] = { from, to }
      }
    }

    if (incomingTags !== undefined) {
      const fromTags = (existing.tags ?? []).map((t: { name: string }) => t.name).sort()
      const toTags   = [...incomingTags].sort()
      if (JSON.stringify(fromTags) !== JSON.stringify(toTags)) {
        changes['tags'] = { from: fromTags, to: toTags }
      }
    }

    const tool = await prisma.tool.update({
      where: { id: params.id },
      data: {
        ...scalarData,
        // Coerce empty strings to null for optional text fields
        ...(scalarData.description !== undefined
          ? { description: scalarData.description || null }
          : {}),
        ...(scalarData.team !== undefined
          ? { team: scalarData.team || null }
          : {}),
        ...(scalarData.notes !== undefined
          ? { notes: scalarData.notes || null }
          : {}),
        // Only persist rejectionReason when status is REJECTED; clear it otherwise
        rejectionReason: scalarData.status === 'REJECTED' ? (scalarData.rejectionReason ?? null) : null,
        // Tags relation update
        ...(tagsUpdate ? { tags: tagsUpdate } : {}),
      },
      include: { tags: { select: { id: true, name: true } } },
    })

    // ── Write ToolVersion if anything changed ──────────────────────────────
    if (Object.keys(changes).length > 0) {
      const versionCount = await prisma.toolVersion.count({ where: { toolId: params.id } })
      prisma.toolVersion.create({
        data: {
          toolId:         params.id,
          version:        versionCount + 1,
          changes:        changes as Prisma.InputJsonValue,
          changedByEmail: session.user.email,
          changedByName:  session.user.name ?? '',
        },
      }).catch((err) => console.error('[ToolVersion] Failed to write:', err))
    }

    // ── Audit status changes ───────────────────────────────────────────────
    if (scalarData.status) {
      const wasArchived = existing.status === 'ARCHIVED'
      const wasRejected = existing.status === 'REJECTED'
      const auditAction =
        scalarData.status === 'ACTIVE'    ? ((wasArchived || wasRejected) ? 'TOOL_RESTORED' : 'TOOL_APPROVED')
        : scalarData.status === 'REJECTED' ? 'TOOL_REJECTED'
        : scalarData.status === 'ARCHIVED' ? 'TOOL_ARCHIVED'
        : null

      if (auditAction) {
        writeAuditLog({
          action:     auditAction,
          actorEmail: session.user.email,
          actorName:  session.user.name,
          toolId:     tool.id,
          toolName:   tool.name,
          detail:     scalarData.status === 'REJECTED' ? scalarData.rejectionReason : undefined,
        })
      }
    }

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
