/**
 * github-enrichment.ts
 *
 * Fetches public metadata from a GitHub repository to enrich the AI analysis.
 * Uses unauthenticated GitHub REST API — works for all public repos.
 * Private repos gracefully return null (no OAuth required in V1).
 */

export interface GitHubSnapshot {
  repoName:    string | null
  description: string | null
  language:    string | null
  topics:      string[]
  readme:      string | null  // truncated
  packageJson: string | null  // truncated
  hasDockerfile: boolean
  stars:       number
}

const README_LIMIT      = 3000
const PACKAGE_JSON_LIMIT = 1200
const GITHUB_API        = 'https://api.github.com'

const GITHUB_HEADERS: HeadersInit = {
  Accept: 'application/vnd.github.v3+json',
  'User-Agent': 'CleverProfits-Analyzer/1.0',
}

/**
 * Parses owner/repo from a GitHub URL.
 * Handles: https://github.com/owner/repo, https://github.com/owner/repo.git, etc.
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/\s?#]+?)(?:\.git)?(?:\/|$)/)
  if (!match) return null
  return { owner: match[1], repo: match[2] }
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: GITHUB_HEADERS,
    signal:  AbortSignal.timeout(8_000),
  })
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${url}`)
  return res.json()
}

async function fetchBase64Content(url: string): Promise<string | null> {
  try {
    const data = await fetchJson(url) as { content?: string; encoding?: string }
    if (data.encoding !== 'base64' || !data.content) return null
    return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8')
  } catch {
    return null
  }
}

/**
 * Fetches GitHub repository metadata.
 * Never throws — returns null if the repo is inaccessible or private.
 */
export async function fetchGitHubSnapshot(repoUrl: string): Promise<GitHubSnapshot | null> {
  const parsed = parseGitHubUrl(repoUrl)
  if (!parsed) return null

  const { owner, repo } = parsed
  const base = `${GITHUB_API}/repos/${owner}/${repo}`

  // Fetch repo metadata, README, package.json, Dockerfile presence in parallel
  const [repoResult, readmeResult, pkgResult, dockerResult] = await Promise.allSettled([
    fetchJson(base),
    fetchBase64Content(`${base}/contents/README.md`),
    fetchBase64Content(`${base}/contents/package.json`),
    fetch(`${base}/contents/Dockerfile`, {
      headers: GITHUB_HEADERS,
      signal: AbortSignal.timeout(5_000),
    }).then((r) => r.ok),
  ])

  // If the repo itself is inaccessible, bail
  if (repoResult.status === 'rejected') return null

  const repoData = repoResult.value as {
    name?:        string
    description?: string
    language?:    string
    topics?:      string[]
    stargazers_count?: number
  }

  const readme = readmeResult.status === 'fulfilled' && readmeResult.value
    ? readmeResult.value.slice(0, README_LIMIT)
    : null

  const packageJson = pkgResult.status === 'fulfilled' && pkgResult.value
    ? pkgResult.value.slice(0, PACKAGE_JSON_LIMIT)
    : null

  const hasDockerfile = dockerResult.status === 'fulfilled' ? dockerResult.value : false

  return {
    repoName:    repoData.name    ?? null,
    description: repoData.description ?? null,
    language:    repoData.language    ?? null,
    topics:      repoData.topics      ?? [],
    readme,
    packageJson,
    hasDockerfile,
    stars: repoData.stargazers_count ?? 0,
  }
}

/**
 * Formats the GitHub snapshot into a text block for the AI prompt.
 */
export function formatGitHubForPrompt(snap: GitHubSnapshot): string {
  const parts: string[] = []
  if (snap.repoName)    parts.push(`Repository: ${snap.repoName}`)
  if (snap.description) parts.push(`Repo description: ${snap.description}`)
  if (snap.language)    parts.push(`Primary language: ${snap.language}`)
  if (snap.topics.length) parts.push(`Topics: ${snap.topics.join(', ')}`)
  if (snap.hasDockerfile) parts.push('Has Dockerfile: yes')
  if (snap.readme)      parts.push(`README excerpt:\n${snap.readme}`)
  if (snap.packageJson) parts.push(`package.json excerpt:\n${snap.packageJson}`)
  return parts.join('\n')
}
