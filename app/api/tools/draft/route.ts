import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createDraftSchema, nameToSlug } from '@/lib/validations'
import { findServiceById } from '@/lib/railway'

// ─────────────────────────────────────────────────────────────────────────────
// Reserved slugs (kept in sync with /api/tools)
// ─────────────────────────────────────────────────────────────────────────────
const RESERVED_SLUGS = new Set([
  'dashboard', 'admin', 'api', 'login', 'auth',
  'register', 'settings', 'health', 'invite', 'tools',
])

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derives a human-readable name from a URL hostname.
 * "growth-system.up.railway.app" → "Growth System"
 * "myapp-abc123.up.railway.app"  → "Myapp Abc123"
 */
function nameFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname
    const segment  = hostname.split('.')[0]            // first label
    return segment
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim() || 'New Tool'
  } catch {
    return 'New Tool'
  }
}

/**
 * Auto-generates a unique slug by checking the DB.
 * If the base slug is taken, appends a short random hex suffix.
 */
async function generateUniqueSlug(base: string): Promise<string> {
  const candidate = nameToSlug(base).slice(0, 55) || 'tool'

  if (RESERVED_SLUGS.has(candidate)) {
    const suffix = Math.random().toString(16).slice(2, 6)
    return `${candidate.slice(0, 54)}-${suffix}`
  }

  const existing = await prisma.tool.findUnique({ where: { slug: candidate }, select: { id: true } })
  if (!existing) return candidate

  const suffix = Math.random().toString(16).slice(2, 6)
  return `${candidate.slice(0, 54)}-${suffix}`
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tools/draft
//
// Smart Registration step 1: creates a DRAFT tool with minimal information.
// Returns the draft tool (including id and slug) so the frontend can navigate
// to step 2 at /dashboard/register/ownership/[draftId].
//
// Request body:
//   { externalUrl: string, name?: string, githubRepoUrl?: string }
//
// Returns 201 with the created draft on success.
// Returns 422 if validation fails.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 })
  }

  const parsed = createDraftSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { externalUrl, name, slug: providedSlug, githubRepoUrl, description, railwayServiceId } = parsed.data

  const toolName = name.trim()
  const slug     = providedSlug?.trim()
    ? providedSlug.trim()
    : await generateUniqueSlug(toolName)

  // If the user supplied a Railway service id, resolve project + env now so
  // approval can call provisionTool() without further input. We swallow lookup
  // errors so a typo doesn't block draft creation — the admin can fix it on
  // the review step.
  let railwayProjectId:     string | null = null
  let railwayEnvironmentId: string | null = null
  let railwayServiceIdSafe: string | null = null
  if (railwayServiceId) {
    try {
      const lookup = await findServiceById(railwayServiceId)
      railwayServiceIdSafe = lookup.serviceId
      railwayProjectId     = lookup.projectId
      railwayEnvironmentId = lookup.environmentId
    } catch (err) {
      console.warn('[draft] Railway service lookup failed:', err)
      // Proceed without provisioning context; admin can re-supply later.
    }
  }

  let tool
  try {
    tool = await prisma.tool.create({
      data: {
        name:          toolName,
        slug,
        externalUrl,
        githubRepoUrl: githubRepoUrl || null,
        description:   description   || null,
        status:        'DRAFT',
        railwayServiceId:     railwayServiceIdSafe,
        railwayProjectId,
        railwayEnvironmentId,
        // analysisStatus defaults to PENDING_ANALYSIS via schema default
        createdByName:  session.user.name  ?? '',
        createdByEmail: session.user.email,
        // accessLevel defaults to INTERNAL; team/description etc. filled in step 2
      },
      select: {
        id:             true,
        name:           true,
        slug:           true,
        externalUrl:    true,
        githubRepoUrl:  true,
        status:         true,
        analysisStatus: true,
        createdAt:      true,
      },
    })
  } catch (err) {
    // P2002 = unique constraint on slug — extremely unlikely given generateUniqueSlug
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return NextResponse.json({ error: 'Slug collision — please try again' }, { status: 409 })
    }
    console.error('[POST /api/tools/draft]', err)
    return NextResponse.json({ error: 'Failed to create draft' }, { status: 500 })
  }

  return NextResponse.json(tool, { status: 201 })
}
