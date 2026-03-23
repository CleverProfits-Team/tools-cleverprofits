import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { updateUserSchema } from '@/lib/validations'
import { writeAuditLog } from '@/lib/audit'

type RouteContext = { params: { id: string } }

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/users/[id]
//
// Updates role and/or status on a user. RBAC rules:
//   - No session → 401
//   - Empty body / invalid body → 400 / 422
//   - Target not found → 404
//   - Caller === target → 403 (can't modify yourself)
//   - BUILDER / VIEWER caller → 403
//   - ADMIN targeting another ADMIN or SUPER_ADMIN → 403
//   - ADMIN trying to grant ADMIN or SUPER_ADMIN role → 403
//   - SUPER_ADMIN: no further restrictions
// ─────────────────────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext,
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 })
  }

  // Validate
  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const data = parsed.data

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
  }

  // Target must exist
  const target = await prisma.user.findUnique({ where: { id: params.id } })
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const callerRole = session.user.role
  const callerId   = session.user.id

  // Cannot modify yourself
  if (callerId === params.id) {
    return NextResponse.json({ error: 'Forbidden: cannot modify your own account' }, { status: 403 })
  }

  // Only ADMIN and SUPER_ADMIN may proceed
  if (callerRole !== 'ADMIN' && callerRole !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ADMIN restrictions
  if (callerRole === 'ADMIN') {
    if (target.role === 'ADMIN' || target.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: admins cannot modify other admins or super admins' },
        { status: 403 },
      )
    }
    if (data.role === 'ADMIN' || data.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: admins cannot grant ADMIN or SUPER_ADMIN role' },
        { status: 403 },
      )
    }
  }

  try {
    const updated = await prisma.user.update({
      where: { id: params.id },
      data,
    })

    // Audit
    if (data.role) {
      writeAuditLog({
        action:      'ROLE_CHANGED',
        actorEmail:  session.user.email,
        actorName:   session.user.name,
        targetEmail: target.email,
        detail:      `${target.role} → ${data.role}`,
      })
    }
    if (data.status) {
      writeAuditLog({
        action:      data.status === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_ACTIVATED',
        actorEmail:  session.user.email,
        actorName:   session.user.name,
        targetEmail: target.email,
      })
    }

    return NextResponse.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    })
  } catch (err) {
    console.error('[PATCH /api/users/[id]]', err)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
