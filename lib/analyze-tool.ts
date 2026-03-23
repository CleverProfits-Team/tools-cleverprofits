/**
 * analyze-tool.ts
 *
 * Fetches a Railway/upstream URL and extracts signal-rich text content
 * that can be passed to the AI summarization step.
 *
 * We do NOT load a full DOM parser — we use lightweight regex extraction
 * to pull the highest-signal content: title, meta description, headings,
 * and a truncated slice of visible body text.
 */

export interface PageSnapshot {
  url:         string
  title:       string
  metaDesc:    string
  headings:    string
  bodyText:    string
  fetchedAt:   string
  fetchError?: string
}

// Maximum characters of body text to include in the snapshot
const BODY_TEXT_LIMIT = 5000

/**
 * Strips HTML tags and collapses whitespace.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Fetches the tool URL and extracts structured text signals.
 * Never throws — returns a snapshot with fetchError populated on failure.
 */
export async function fetchPageSnapshot(url: string): Promise<PageSnapshot> {
  const fetchedAt = new Date().toISOString()

  let html = ''
  try {
    const controller = new AbortController()
    const timeout    = setTimeout(() => controller.abort(), 12_000)

    const res = await fetch(url, {
      signal:  controller.signal,
      headers: {
        'User-Agent': 'CleverProfits-Analyzer/1.0 (internal platform)',
        'Accept':     'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    })
    clearTimeout(timeout)

    if (!res.ok) {
      return {
        url, title: '', metaDesc: '', headings: '', bodyText: '', fetchedAt,
        fetchError: `HTTP ${res.status} ${res.statusText}`,
      }
    }

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('html')) {
      return {
        url, title: '', metaDesc: '', headings: '', bodyText: '', fetchedAt,
        fetchError: `Non-HTML response (${contentType})`,
      }
    }

    html = await res.text()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      url, title: '', metaDesc: '', headings: '', bodyText: '', fetchedAt,
      fetchError: `Fetch failed: ${msg}`,
    }
  }

  // ── Extract signals ──────────────────────────────────────────────────────

  const title = html.match(/<title[^>]*>\s*([^<]+)\s*<\/title>/i)?.[1]?.trim() ?? ''

  const metaDesc =
    html.match(/meta[^>]+name=["']description["'][^>]+content=["']([^"']{0,500})/i)?.[1]?.trim() ??
    html.match(/meta[^>]+content=["']([^"']{0,500})["'][^>]+name=["']description["']/i)?.[1]?.trim() ??
    ''

  const headings = [...html.matchAll(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi)]
    .map((m) => stripHtml(m[1]))
    .filter(Boolean)
    .slice(0, 12)
    .join(' | ')

  const bodyText = stripHtml(html).slice(0, BODY_TEXT_LIMIT)

  return { url, title, metaDesc, headings, bodyText, fetchedAt }
}

/**
 * Builds a compact text block summarising the page snapshot for the AI prompt.
 */
export function formatSnapshotForPrompt(snap: PageSnapshot): string {
  const parts: string[] = [`URL: ${snap.url}`]
  if (snap.title)    parts.push(`Page title: ${snap.title}`)
  if (snap.metaDesc) parts.push(`Meta description: ${snap.metaDesc}`)
  if (snap.headings) parts.push(`Headings: ${snap.headings}`)
  if (snap.bodyText) parts.push(`Visible content:\n${snap.bodyText}`)
  if (snap.fetchError) parts.push(`Note: page fetch issue — ${snap.fetchError}`)
  return parts.join('\n')
}
