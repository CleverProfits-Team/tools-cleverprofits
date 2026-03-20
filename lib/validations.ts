import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// SSRF blocklist
//
// The proxy fetches the externalUrl server-side on every request. Without this
// check, an authenticated user could register a tool pointing at:
//   - http://169.254.169.254/  (AWS/GCP/Azure instance metadata)
//   - http://localhost:5432/   (our own Postgres DB)
//   - http://10.x.x.x/        (Railway's internal network)
//
// We block private ranges, loopback, and cloud metadata endpoints at
// registration time so the proxy never makes an internal network request.
//
// Note: DNS rebinding (a hostname resolving to a private IP after validation)
// is not fully preventable at this layer. Accept that risk for V1 given the
// @cleverprofits.com authentication gate.
// ─────────────────────────────────────────────────────────────────────────────

const SSRF_BLOCKLIST: RegExp[] = [
  /^https?:\/\/localhost[:/]/i,
  /^https?:\/\/127\./,
  /^https?:\/\/0\.0\.0\.0/,
  /^https?:\/\/10\./,
  /^https?:\/\/172\.(1[6-9]|2\d|3[01])\./,
  /^https?:\/\/192\.168\./,
  /^https?:\/\/169\.254\./,       // Link-local / cloud metadata (AWS, GCP, Azure)
  /^https?:\/\/100\.64\./,        // Carrier-grade NAT (RFC 6598)
  /^https?:\/\/\[::1\]/,          // IPv6 loopback
  /^https?:\/\/\[fc[0-9a-f]{2}:/, // IPv6 ULA fc00::/7
  /^https?:\/\/\[fd[0-9a-f]{2}:/, // IPv6 ULA fd00::/8
]

function isBlockedUrl(url: string): boolean {
  return SSRF_BLOCKLIST.some((pattern) => pattern.test(url))
}

// ─────────────────────────────────────────────────────────────────────────────
// Slug
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Slug rules (from spec):
 *  - lowercase letters, numbers, and hyphens only
 *  - cannot start or end with a hyphen
 *  - no spaces
 *  - 2–60 characters
 *
 * Regex breakdown:
 *  ^[a-z0-9]            — must start with alphanumeric
 *  ([a-z0-9-]*[a-z0-9])?  — optional middle + end section (ends with alphanumeric)
 *  $
 *
 * This naturally rejects single-hyphen, leading/trailing hyphens, and spaces.
 * Consecutive hyphens (e.g. "a--b") are technically allowed by this regex but
 * are unlikely in practice; add a .refine() below if you want to block them.
 */
export const slugSchema = z
  .string()
  .min(2, 'Slug must be at least 2 characters')
  .max(60, 'Slug must be 60 characters or fewer')
  .regex(
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
    'Only lowercase letters, numbers, and hyphens. Cannot start or end with a hyphen.',
  )

/**
 * Derives a URL-safe slug from a free-text tool name.
 * Used to auto-populate the slug field as the user types.
 *
 * Examples:
 *   "Leadership KPIs"  → "leadership-kpis"
 *   "Client Dashboard" → "client-dashboard"
 *   "Ops / Reporting"  → "ops-reporting"
 */
export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // strip non-alphanumeric except spaces/hyphens
    .replace(/\s+/g, '-')         // collapse whitespace → single hyphen
    .replace(/-+/g, '-')          // collapse consecutive hyphens
    .replace(/^-|-$/g, '')        // strip leading/trailing hyphens
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool schemas
// ─────────────────────────────────────────────────────────────────────────────

export const createToolSchema = z.object({
  name: z
    .string()
    .min(1, 'Tool name is required')
    .max(100, 'Tool name must be 100 characters or fewer'),

  slug: slugSchema,

  externalUrl: z
    .string()
    .min(1, 'External URL is required')
    .url('Must be a valid URL (include https://)')
    .refine(
      (url) => url.startsWith('http://') || url.startsWith('https://'),
      'URL must start with http:// or https://',
    )
    .refine(
      (url) => !isBlockedUrl(url),
      'URL must not point to a private, loopback, or internal network address',
    ),

  description: z
    .string()
    .max(500, 'Description must be 500 characters or fewer')
    .optional()
    .or(z.literal('')),

  team: z
    .string()
    .max(100, 'Team name must be 100 characters or fewer')
    .optional()
    .or(z.literal('')),

  accessLevel: z
    .enum(['INTERNAL', 'RESTRICTED', 'LEADERSHIP'])
    .default('INTERNAL'),

  notes: z
    .string()
    .max(1000, 'Notes must be 1000 characters or fewer')
    .optional()
    .or(z.literal('')),
})

/**
 * Partial schema for PATCH/PUT updates.
 * Slug is intentionally excluded — slugs are immutable after creation to
 * prevent breaking existing bookmarks / integrations.
 */
export const updateToolSchema = createToolSchema
  .omit({ slug: true })
  .partial()
  .extend({
    status: z.enum(['ACTIVE', 'PENDING', 'ARCHIVED']).optional(),
  })

export type CreateToolInput = z.infer<typeof createToolSchema>
export type UpdateToolInput = z.infer<typeof updateToolSchema>
