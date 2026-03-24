import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { updateDraftSchema } from '@/lib/validations'

type RouteContext = { params: { id: string } }

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/tools/[id]/draft
//
// Updates a DRAFT tool. Used by:
//   - Step 2 (ownership): sets team, accessLevel, isExperimental
//   - Review step:        sets name, description, notes, tags, AI field overrides
//
// Security:
//   - Only the owner can update their own draft.
//   - Admins cannot edit another user's draft (drafts are personal pre-submissions).
//   - Tool must still be in DRAFT status — once submitted it transitions to PENDING
//     and becomes governed by the standard PUT /api/tools/[id] flow.
//
// Returns 200 with the updated tool on success.
// Returns 400 if no valid fields provided.
// Returns 403 if caller is not the owner.
// Returns 404 if tool not found.
// Returns 409 if tool is no longer a DRAFT.
// ─────────────────────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext,
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const draft = await prisma.tool.findUnique({
    where:  { id: params.id },
    select: {
      id:             true,
      status:         true,
      createdByEmail: true,
      tags:           { select: { id: true, name: true } },
    },
  })

  if (!draft) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
  }

  if (draft.status !== 'DRAFT') {
    return NextResponse.json(
      { error: 'This tool has already been submitted and is no longer editable as a draft' },
      { status: 409 },
    )
  }

  if (draft.createdByEmail !== session.user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 })
  }

  const parsed = updateDraftSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { tags: incomingTags, ...scalars } = parsed.data

  if (Object.keys(scalars).length === 0 && incomingTags === undefined) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
  }

  // Build the tags update operation if tags were provided
  const tagsUpdate = incomingTags !== undefined
    ? {
        set: [],
        connectOrCreate: incomingTags.map((name) => ({
          where:  { name },
          create: { name },
        })),
      }
    : undefined

  try {
    const updated = await prisma.tool.update({
      where: { id: params.id },
      data: {
        // Scalar updates — coerce empty strings to null for optional text fields
        ...(scalars.name            !== undefined ? { name:            scalars.name }                      : {}),
        ...(scalars.team            !== undefined ? { team:            scalars.team            || null }   : {}),
        ...(scalars.ownerName       !== undefined ? { ownerName:       scalars.ownerName       || null }   : {}),
        ...(scalars.ownerEmail      !== undefined ? { ownerEmail:      scalars.ownerEmail      || null }   : {}),
        ...(scalars.maintainerName  !== undefined ? { maintainerName:  scalars.maintainerName  || null }   : {}),
        ...(scalars.maintainerEmail !== undefined ? { maintainerEmail: scalars.maintainerEmail || null }   : {}),
        ...(scalars.accessLevel     !== undefined ? { accessLevel:     scalars.accessLevel }               : {}),
        ...(scalars.isExperimental  !== undefined ? { isExperimental:  scalars.isExperimental }            : {}),
        ...(scalars.githubRepoUrl   !== undefined ? { githubRepoUrl:   scalars.githubRepoUrl   || null }   : {}),
        ...(scalars.description    !== undefined ? { description:    scalars.description    || null }   : {}),
        ...(scalars.notes          !== undefined ? { notes:          scalars.notes          || null }   : {}),
        // AI field overrides
        ...(scalars.aiTitle          !== undefined ? { aiTitle:          scalars.aiTitle          || null } : {}),
        ...(scalars.aiSummary        !== undefined ? { aiSummary:        scalars.aiSummary        || null } : {}),
        ...(scalars.aiDescription    !== undefined ? { aiDescription:    scalars.aiDescription    || null } : {}),
        ...(scalars.aiObjective      !== undefined ? { aiObjective:      scalars.aiObjective      || null } : {}),
        ...(scalars.aiSuggestedUsers !== undefined ? { aiSuggestedUsers: scalars.aiSuggestedUsers || null } : {}),
        ...(scalars.aiCategory       !== undefined ? { aiCategory:       scalars.aiCategory       || null } : {}),
        ...(scalars.aiTechStack      !== undefined ? { aiTechStack:      scalars.aiTechStack      || null } : {}),
        ...(scalars.aiFrameworkGuess !== undefined ? { aiFrameworkGuess: scalars.aiFrameworkGuess || null } : {}),
        // Tags relation
        ...(tagsUpdate ? { tags: tagsUpdate } : {}),
      },
      include: { tags: { select: { id: true, name: true } } },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PATCH /api/tools/[id]/draft]', err)
    return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 })
  }
}
