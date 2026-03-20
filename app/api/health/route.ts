import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Verify DB connectivity with a minimal query
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'ok', db: 'ok' }, { status: 200 })
  } catch {
    return NextResponse.json({ status: 'error', db: 'unreachable' }, { status: 503 })
  }
}
