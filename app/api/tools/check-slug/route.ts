import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { slugSchema } from '@/lib/validations'

// Reserved slugs that cannot be used even if not in the DB
const RESERVED_SLUGS = new Set([
  'dashboard', 'admin', 'api', 'login', 'auth',
  'register', 'settings', 'health',
])

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const slug = req.nextUrl.searchParams.get('slug') ?? ''

  // Validate format first
  const parsed = slugSchema.safeParse(slug)
  if (!parsed.success) {
    return NextResponse.json({
      available: false,
      reason: parsed.error.errors[0]?.message ?? 'Invalid slug format',
    })
  }

  // Reserved check
  if (RESERVED_SLUGS.has(parsed.data)) {
    return NextResponse.json({
      available: false,
      reason: 'This slug is reserved',
    })
  }

  // DB uniqueness check — exclude ARCHIVED tools so slugs can be reclaimed
  const existing = await prisma.tool.findFirst({
    where: {
      slug: parsed.data,
      status: { not: 'ARCHIVED' },
    },
    select: { id: true },
  })

  if (existing) {
    return NextResponse.json({
      available: false,
      reason: 'This slug is already taken',
    })
  }

  return NextResponse.json({ available: true })
}
