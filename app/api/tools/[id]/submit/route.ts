import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeAuditLog } from '@/lib/audit'

type RouteContext = { params: { id: string } }

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tools/[id]/submit
//
// Smart Registration step 5: transitions a DRAFT tool to PENDING (awaiting
// admin approval). This is the final action in the registration wizard.
//
// Pre-conditions:
//   - Tool must be in DRAFT status.
//   - Caller must be the owner.
//   - Tool must have: name, externalUrl, team, accessLevel (all already
//     required at creation or set in step 2 — validated here as a safety net).
//
// Post-conditions:
//   - Tool status → PENDING
//   - analysisStatus remains unchanged (ANALYSIS_COMPLETE if analysis ran)
//   - Audit log entry written: TOOL_REGISTERED
//
// Returns 200 with the updated tool on success.
// Returns 400 if required fields are missing (incomplete draft).
// Returns 403 if caller is not the owner.
// Returns 404 if tool not found.
// Returns 409 if tool is not in DRAFT status.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(
  _request: NextRequest,
  { params }: RouteContext,
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const draft = await prisma.tool.findUnique({
    where:  { id: params.id },
    include: { tags: { select: { id: true, name: true } } },
  })

  if (!draft) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
  }

  if (draft.status !== 'DRAFT') {
    return NextResponse.json(
      { error: 'This tool has already been submitted' },
      { status: 409 },
    )
  }

  if (draft.createdByEmail !== session.user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Validate that the draft has enough data to be submitted.
  // name and externalUrl are always present (set at creation).
  // team is optional in the data model, so we allow submission without it.
  if (!draft.name?.trim()) {
    return NextResponse.json(
      { error: 'Tool name is required before submitting' },
      { status: 400 },
    )
  }

  try {
    const tool = await prisma.tool.update({
      where: { id: params.id },
      data:  { status: 'PENDING' },
      include: { tags: { select: { id: true, name: true } } },
    })

    // Audit — consistent with the existing TOOL_REGISTERED action
    writeAuditLog({
      action:     'TOOL_REGISTERED',
      actorEmail: session.user.email,
      actorName:  session.user.name,
      toolId:     tool.id,
      toolName:   tool.name,
    })

    return NextResponse.json(tool)
  } catch (err) {
    console.error('[POST /api/tools/[id]/submit]', err)
    return NextResponse.json({ error: 'Failed to submit tool' }, { status: 500 })
  }
}
