import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { fetchPageSnapshot, formatSnapshotForPrompt } from '@/lib/analyze-tool'
import { fetchGitHubSnapshot, formatGitHubForPrompt } from '@/lib/github-enrichment'
import { analyzeWithClaude } from '@/lib/claude-analyze'

type RouteContext = { params: { id: string } }

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tools/[id]/analyze
//
// Smart Registration step 3: runs the full analysis pipeline for a DRAFT tool.
//
// Pipeline:
//   1. Mark tool as ANALYZING
//   2. Fetch the Railway URL and extract page content
//   3. Optionally fetch GitHub repository metadata
//   4. Load existing tool names for overlap detection
//   5. Call Claude for summarization + classification
//   6. Store results and mark ANALYSIS_COMPLETE (or ANALYSIS_FAILED)
//
// This runs synchronously — the whole pipeline typically takes 5–15 seconds.
// The frontend shows a progress screen and polls GET /analysis-status.
// For V1 this is acceptable; a background job queue is not needed at this scale.
//
// Security:
//   - Only the tool owner can trigger analysis.
//   - Tool must be in DRAFT status.
//   - Re-analysis is allowed: calling this again on a DRAFT re-runs the pipeline.
//
// Returns 200 with the updated analysis fields on success.
// Returns 202 if analysis is already running (avoid duplicate runs).
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(
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
      id:             true,
      name:           true,
      externalUrl:    true,
      githubRepoUrl:  true,
      description:    true,
      status:         true,
      analysisStatus: true,
      createdByEmail: true,
    },
  })

  if (!tool) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
  }

  if (tool.status !== 'DRAFT') {
    return NextResponse.json({ error: 'Analysis only runs on draft tools' }, { status: 409 })
  }

  if (tool.createdByEmail !== session.user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Prevent concurrent duplicate runs
  if (tool.analysisStatus === 'ANALYZING') {
    return NextResponse.json({ message: 'Analysis already in progress' }, { status: 202 })
  }

  // ── Step 1: Mark as analyzing ──────────────────────────────────────────────
  await prisma.tool.update({
    where: { id: params.id },
    data:  { analysisStatus: 'ANALYZING', analysisError: null },
  })

  try {
    // ── Step 2: Fetch the tool URL ─────────────────────────────────────────
    const pageSnap = await fetchPageSnapshot(tool.externalUrl)
    const pageContext = formatSnapshotForPrompt(pageSnap)

    // ── Step 3: Fetch GitHub data (optional) ──────────────────────────────
    let githubContext: string | null = null
    if (tool.githubRepoUrl) {
      const ghSnap = await fetchGitHubSnapshot(tool.githubRepoUrl)
      if (ghSnap) {
        githubContext = formatGitHubForPrompt(ghSnap)
      }
    }

    // ── Step 4: Load existing tools for overlap detection ─────────────────
    const existingTools = await prisma.tool.findMany({
      where:  { status: { in: ['ACTIVE', 'PENDING'] }, id: { not: params.id } },
      select: { name: true, description: true },
    })

    const existingToolLines = existingTools.map((t) =>
      t.description ? `${t.name}: ${t.description}` : t.name
    )

    // ── Step 5: AI analysis ────────────────────────────────────────────────
    const aiResult = await analyzeWithClaude(pageContext, githubContext, existingToolLines, tool.description)

    // ── Step 6: Build the raw snapshot for audit purposes ─────────────────
    const snapshotParts = [pageContext]
    if (githubContext) snapshotParts.push('\n\n--- GitHub ---\n' + githubContext)
    const analysisSnapshot = snapshotParts.join('').slice(0, 8000)

    // ── Step 7: Persist results ────────────────────────────────────────────
    const updated = await prisma.tool.update({
      where: { id: params.id },
      data:  {
        analysisStatus:   'ANALYSIS_COMPLETE',
        analysisError:    null,
        lastAnalyzedAt:   new Date(),
        analysisSnapshot,

        // AI-generated fields — stored as suggestions; user can edit all of these
        aiTitle:          aiResult.title,
        aiSummary:        aiResult.summary,
        aiDescription:    aiResult.description,
        aiObjective:      aiResult.objective,
        aiSuggestedUsers: aiResult.suggestedUsers,
        aiCategory:       aiResult.category,
        aiTechStack:      aiResult.techStack,
        aiFrameworkGuess: aiResult.frameworkGuess,
        aiConfidence:     aiResult.confidence,
        aiOverlapWarnings: aiResult.overlapWarnings,

        // Pre-populate name and description if not yet set by the user
        // (only overwrite if the current value looks like the auto-generated URL-derived default
        //  or if the field is still empty — never overwrite a user's explicit edit)
        ...(aiResult.title && tool.name === deriveNameFromUrl(tool.externalUrl)
          ? { name: aiResult.title }
          : {}),
      },
      select: {
        id:               true,
        name:             true,
        analysisStatus:   true,
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

    return NextResponse.json(updated)

  } catch (err) {
    // Analysis failed — store the error and mark accordingly so the frontend
    // can show a retry option or let the user proceed manually.
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[POST /api/tools/[id]/analyze] Pipeline error:', err)

    await prisma.tool.update({
      where: { id: params.id },
      data:  {
        analysisStatus: 'ANALYSIS_FAILED',
        analysisError:  errorMsg,
        lastAnalyzedAt: new Date(),
      },
    })

    return NextResponse.json(
      { error: 'Analysis failed', detail: errorMsg },
      { status: 500 },
    )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derives the auto-generated name from the URL hostname — used to decide
 * whether to overwrite the tool name with the AI-suggested title.
 * Mirrors the logic in POST /api/tools/draft.
 */
function deriveNameFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname
    const segment  = hostname.split('.')[0]
    return segment
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim()
  } catch {
    return ''
  }
}
