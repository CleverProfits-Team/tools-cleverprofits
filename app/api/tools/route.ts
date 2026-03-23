import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma, ToolStatus, AccessLevel } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createToolSchema } from '@/lib/validations'

// ─────────────────────────────────────────────────────────────────────────────
// Reserved slugs
//
// These map to the platform's own static route segments (app/dashboard, etc.)
// and must never be used as tool slugs or the tool would shadow our pages.
// ─────────────────────────────────────────────────────────────────────────────

const RESERVED_SLUGS = new Set([
  'dashboard',
  'admin',
  'api',
  'login',
  'auth',
  'register',
  'settings',
  'health',
  'invite',
])

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tools
//
// Returns all tools for authenticated users.
//
// Optional query params:
//   ?q=<string>           — full-text search across name, slug, description, team
//   ?team=<string>        — exact match on team
//   ?status=<ToolStatus>  — filter by status (ACTIVE | PENDING | ARCHIVED)
//   ?accessLevel=<level>  — filter by access level (INTERNAL | RESTRICTED | LEADERSHIP)
//   ?mine=true            — only tools created by the current user
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl

  const q           = searchParams.get('q')?.trim() || undefined
  const team        = searchParams.get('team') || undefined
  const statusParam = searchParams.get('status') || undefined
  const levelParam  = searchParams.get('accessLevel') || undefined
  const mine        = searchParams.get('mine') === 'true'

  // Validate enum params — silently ignore unknown values rather than 422-ing,
  // because the UI sends these from controlled dropdowns and bad values should
  // simply be treated as "no filter".
  const validStatuses     = Object.values(ToolStatus)
  const validAccessLevels = Object.values(AccessLevel)

  const statusFilter: Prisma.ToolWhereInput =
    statusParam && validStatuses.includes(statusParam as ToolStatus)
      ? { status: statusParam as ToolStatus }
      : {}

  const accessLevelFilter: Prisma.ToolWhereInput =
    levelParam && validAccessLevels.includes(levelParam as AccessLevel)
      ? { accessLevel: levelParam as AccessLevel }
      : {}

  const searchFilter: Prisma.ToolWhereInput = q
    ? {
        OR: [
          { name:        { contains: q, mode: 'insensitive' } },
          { slug:        { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { team:        { contains: q, mode: 'insensitive' } },
        ],
      }
    : {}

  const ownerFilter: Prisma.ToolWhereInput = mine
    ? { createdByEmail: session.user.email }
    : {}

  const teamFilter: Prisma.ToolWhereInput = team ? { team } : {}

  try {
    const tools = await prisma.tool.findMany({
      where: {
        ...searchFilter,
        ...teamFilter,
        ...statusFilter,
        ...accessLevelFilter,
        ...ownerFilter,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(tools)
  } catch (err) {
    console.error('[GET /api/tools]', err)
    return NextResponse.json({ error: 'Failed to fetch tools' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tools
//
// Creates a new tool. The authenticated user's name and email are written as
// the owner — these fields are never accepted from the request body.
//
// Returns 201 with the created tool on success.
// Returns 409 if the slug is already taken or reserved.
// Returns 422 if the request body fails Zod validation.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
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
  const parsed = createToolSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        // fieldErrors is a record of field → string[] — safe to expose
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    )
  }

  const data = parsed.data

  // Guard reserved slugs before hitting the DB
  if (RESERVED_SLUGS.has(data.slug)) {
    return NextResponse.json(
      {
        error: `The slug "${data.slug}" is reserved by the platform. Choose a different slug.`,
        field: 'slug',
      },
      { status: 409 },
    )
  }

  let tool
  try {
    tool = await prisma.tool.create({
      data: {
        name:        data.name,
        slug:        data.slug,
        externalUrl: data.externalUrl,
        accessLevel: data.accessLevel,

        // Coerce empty strings to null for optional text fields
        description: data.description || null,
        team:        data.team        || null,
        notes:       data.notes       || null,

        // Ownership is derived from the authenticated session — never from
        // the request body. This prevents spoofing.
        createdByName:  session.user.name,
        createdByEmail: session.user.email,

        // New tools start as PENDING until an admin activates them.
        // Override: pass status in body only if you add admin-only logic here.
        status: 'PENDING',
      },
    })
  } catch (err) {
    // P2002 = unique constraint violation → slug already taken
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return NextResponse.json(
        {
          error: `The slug "${data.slug}" is already taken. Choose a different slug.`,
          field: 'slug',
        },
        { status: 409 },
      )
    }

    console.error('[POST /api/tools] Unexpected DB error:', err)
    return NextResponse.json({ error: 'Failed to create tool' }, { status: 500 })
  }

  // TODO (Phase 5): fire-and-forget Slack notification
  //   sendToolRegistrationNotification(tool).catch(console.error)

  // TODO (Phase 5): fire-and-forget Notion record
  //   createNotionRecord(tool).catch(console.error)

  return NextResponse.json(tool, { status: 201 })
}
