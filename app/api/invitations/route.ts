import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createInvitationSchema } from '@/lib/validations'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/invitations
//
// Creates (or refreshes) an invitation for a given email + role.
// If a PENDING non-expired invite already exists for the email, it is updated
// (new token, role, expiry). Otherwise a new record is created.
//
// Returns the invitation plus an inviteUrl the caller can share.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 })
  }

  const parsed = createInvitationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { email, role: inviteRole } = parsed.data
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  try {
    // Check for existing PENDING non-expired invite
    const existing = await prisma.invitation.findFirst({
      where: {
        email,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    })

    let invitation
    if (existing) {
      invitation = await prisma.invitation.update({
        where: { id: existing.id },
        data: {
          role: inviteRole,
          token: generateCuid(),
          expiresAt,
        },
      })
    } else {
      invitation = await prisma.invitation.create({
        data: { email, role: inviteRole, expiresAt },
      })
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const inviteUrl = `${baseUrl}/invite/${invitation.token}`

    return NextResponse.json({
      invitation: {
        ...invitation,
        createdAt: invitation.createdAt.toISOString(),
        expiresAt: invitation.expiresAt.toISOString(),
        usedAt: invitation.usedAt?.toISOString() ?? null,
      },
      inviteUrl,
    })
  } catch (err) {
    console.error('[POST /api/invitations]', err)
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
  }
}

// Minimal cuid-compatible random ID generator using crypto
function generateCuid(): string {
  const timestamp = Date.now().toString(36)
  const random = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(36))
    .join('')
  return `c${timestamp}${random}`.slice(0, 25)
}
