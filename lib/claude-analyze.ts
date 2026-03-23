/**
 * claude-analyze.ts
 *
 * Calls Claude to generate structured metadata for a tool from the
 * page snapshot and optional GitHub data.
 *
 * Design decisions:
 * - We ask Claude for JSON output and parse it safely.
 * - All generated fields are typed as string | null — never fabricated.
 * - We pass existing tool names for overlap detection.
 * - Confidence (0–1) reflects how much signal was available.
 */

import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const VALID_CATEGORIES = [
  'dashboard', 'form', 'workflow', 'reporting', 'calculator',
  'data-entry', 'admin', 'communication', 'automation', 'other',
] as const

export type ToolCategory = typeof VALID_CATEGORIES[number]

export interface AIAnalysisResult {
  title:            string | null
  summary:          string | null  // one sentence
  description:      string | null  // 2–3 sentences
  objective:        string | null
  suggestedUsers:   string | null
  category:         ToolCategory | null
  tags:             string[]
  techStack:        string | null
  frameworkGuess:   string | null
  confidence:       number          // 0.0 – 1.0
  overlapWarnings:  string[]        // names of existing tools that might overlap
}

function buildSystemPrompt(): string {
  return `You are an intelligent tool analyst for CleverProfits, an internal platform that helps teams discover and use internal tooling.

Your job is to analyze information about an internal tool and produce structured metadata.

Rules:
- Output ONLY a single JSON object. No markdown fences, no explanation, just the raw JSON.
- Be concise, direct, and practical. These are internal tools used by teams, not consumer products.
- Do NOT hallucinate. Use "likely" or "probably" in text fields where you are uncertain.
- If a field cannot be determined from the available information, set it to null.
- Confidence (0.0–1.0) reflects how much useful signal was available, not your certainty about any single field.`
}

function buildUserPrompt(
  pageContext:    string,
  githubContext:  string | null,
  existingTools:  string[],
): string {
  const existingBlock = existingTools.length > 0
    ? `\nExisting tools on the platform (for overlap detection):\n${existingTools.map((t) => `- ${t}`).join('\n')}`
    : ''

  const githubBlock = githubContext
    ? `\n\n--- GitHub Repository ---\n${githubContext}`
    : ''

  return `Analyze this internal tool and return structured metadata as a JSON object.

--- Page Information ---
${pageContext}${githubBlock}${existingBlock}

Return a JSON object with EXACTLY this shape (all fields required, use null if unknown):
{
  "title": "short tool name (2–5 words)",
  "summary": "one sentence describing what this tool does",
  "description": "2–3 sentences with more context about functionality and purpose",
  "objective": "the core problem or need this tool addresses",
  "suggestedUsers": "who likely uses this (e.g. 'Sales team', 'Finance', 'All staff')",
  "category": one of exactly: "dashboard" | "form" | "workflow" | "reporting" | "calculator" | "data-entry" | "admin" | "communication" | "automation" | "other",
  "tags": ["tag1", "tag2", "tag3"] (2–5 short lowercase tags, empty array if none obvious),
  "techStack": "e.g. 'Next.js + PostgreSQL' or 'Python / Streamlit' or null",
  "frameworkGuess": "e.g. 'Next.js', 'Streamlit', 'Retool', 'custom' or null",
  "confidence": 0.0 to 1.0 (0.9+ = very clear, 0.5 = some signal, 0.2 = minimal info),
  "overlapWarnings": ["Tool Name A"] or [] (names of existing tools with similar purpose)
}`
}

/**
 * Runs the AI analysis. Never throws — returns a result with low confidence
 * and null fields if something goes wrong.
 */
export async function analyzeWithClaude(
  pageContext:   string,
  githubContext: string | null,
  existingTools: string[],
): Promise<AIAnalysisResult> {
  const fallback: AIAnalysisResult = {
    title: null, summary: null, description: null, objective: null,
    suggestedUsers: null, category: null, tags: [], techStack: null,
    frameworkGuess: null, confidence: 0, overlapWarnings: [],
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[claude-analyze] ANTHROPIC_API_KEY not set')
    return fallback
  }

  let raw: string
  try {
    const message = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',  // fast + cheap for structured extraction
      max_tokens: 1024,
      system:     buildSystemPrompt(),
      messages:   [{ role: 'user', content: buildUserPrompt(pageContext, githubContext, existingTools) }],
    })

    raw = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')
      .trim()
  } catch (err) {
    console.error('[claude-analyze] API call failed:', err)
    return fallback
  }

  // Parse JSON — strip any accidental markdown fences
  let parsed: Record<string, unknown>
  try {
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    parsed = JSON.parse(clean)
  } catch {
    console.error('[claude-analyze] Failed to parse JSON response:', raw.slice(0, 200))
    return fallback
  }

  // Safely extract fields
  const str  = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
  const num  = (v: unknown) => (typeof v === 'number' ? Math.min(1, Math.max(0, v)) : 0)
  const arr  = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') as string[] : [])

  const rawCategory = str(parsed.category)
  const category    = VALID_CATEGORIES.includes(rawCategory as ToolCategory)
    ? (rawCategory as ToolCategory)
    : null

  return {
    title:           str(parsed.title),
    summary:         str(parsed.summary),
    description:     str(parsed.description),
    objective:       str(parsed.objective),
    suggestedUsers:  str(parsed.suggestedUsers),
    category,
    tags:            arr(parsed.tags).slice(0, 8),
    techStack:       str(parsed.techStack),
    frameworkGuess:  str(parsed.frameworkGuess),
    confidence:      num(parsed.confidence),
    overlapWarnings: arr(parsed.overlapWarnings).slice(0, 5),
  }
}
