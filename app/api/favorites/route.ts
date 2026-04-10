import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * POST /api/favorites — toggle a tool as favorite
 * Body: { toolId: string }
 *
 * Returns: { favorited: boolean }
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { toolId } = await request.json()
  if (!toolId || typeof toolId !== 'string') {
    return NextResponse.json({ error: 'toolId is required' }, { status: 400 })
  }

  const existing = await prisma.favorite.findUnique({
    where: { userEmail_toolId: { userEmail: session.user.email, toolId } },
  })

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } })
    return NextResponse.json({ favorited: false })
  }

  await prisma.favorite.create({
    data: { userEmail: session.user.email, toolId },
  })
  return NextResponse.json({ favorited: true })
}
