import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

type RouteContext = { params: { id: string } }

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tools/[id]/analysis-status
//
// Polling endpoint used by the Smart Registration "Analyzing…" screen.
// Returns the current analysis state and, once complete, the AI-generated
// profile fields so the review step can pre-populate its form.
//
// Security:
//   - Only the owner and admins can access analysis state.
//   - Draft tools are only visible to their owner.
//
// Response shape:
//   {
//     analysisStatus:   AnalysisStatus
//     analysisError?:   string | null
//     lastAnalyzedAt?:  string | null
//     // Populated once ANALYSIS_COMPLETE:
//     aiTitle?:          string | null
//     aiSummary?:        string | null
//     aiDescription?:    string | null
//     aiObjective?:      string | null
//     aiSuggestedUsers?: string | null
//     aiCategory?:       string | null
//     aiTechStack?:      string | null
//     aiFrameworkGuess?: string | null
//     aiConfidence?:     number | null
//     aiOverlapWarnings?: unknown
//   }
//
// NOTE (Phase 2): The analysis pipeline (POST /api/tools/[id]/analyze) that
// drives the ANALYZING → ANALYSIS_COMPLETE transition is implemented in Phase 2.
// This endpoint is the read-side contract; the write-side is coming.
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: RouteContext,
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tool = await prisma.tool.findUnique({
    where:  { id: params.id },
    select: {
      id:               true,
      status:           true,
      createdByEmail:   true,
      analysisStatus:   true,
      analysisError:    true,
      lastAnalyzedAt:   true,
      aiTitle:          true,
      aiSummary:        true,
      aiDescription:    true,
      aiObjective:      true,
      aiSuggestedUsers: true,
      aiCategory:       true,
      aiTechStack:      true,
      aiFrameworkGuess: true,
      aiConfidence:     true,
      aiOverlapWarnings: true,
    },
  })

  if (!tool) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
  }

  const role    = session.user.role
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'

  // Non-admins can only query their own tools' analysis status
  if (!isAdmin && tool.createdByEmail !== session.user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({
    ...tool,
    lastAnalyzedAt: tool.lastAnalyzedAt?.toISOString() ?? null,
  })
}
