import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma, ToolStatus, AccessLevel } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createToolSchema } from '@/lib/validations'
import { writeAuditLog } from '@/lib/audit'

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
  'tools',
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
  const tagParam    = searchParams.get('tag') || undefined
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

  const tagFilter: Prisma.ToolWhereInput = tagParam
    ? { tags: { some: { name: tagParam } } }
    : {}

  try {
    const tools = await prisma.tool.findMany({
      where: {
        // DRAFT tools are never exposed via the general list — they are only
        // accessible through the smart registration flow via their draft ID.
        status: { not: 'DRAFT' },
        ...searchFilter,
        ...teamFilter,
        ...statusFilter,
        ...accessLevelFilter,
        ...ownerFilter,
        ...tagFilter,
      },
      include: { tags: { select: { id: true, name: true } } },
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
        status: 'PENDING',

        // Tags: upsert by name and connect
        tags: data.tags?.length
          ? {
              connectOrCreate: data.tags.map((name) => ({
                where:  { name },
                create: { name },
              })),
            }
          : undefined,
      },
      include: { tags: { select: { id: true, name: true } } },
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

  writeAuditLog({
    action:     'TOOL_REGISTERED',
    actorEmail: session.user.email,
    actorName:  session.user.name,
    toolId:     tool.id,
    toolName:   tool.name,
  })

  return NextResponse.json(tool, { status: 201 })
}
