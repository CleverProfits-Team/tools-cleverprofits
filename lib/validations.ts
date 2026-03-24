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

  tags: z
    .array(
      z.string()
        .min(1, 'Tag cannot be empty')
        .max(50, 'Tag must be 50 characters or fewer')
        .regex(/^[a-zA-Z0-9 _-]+$/, 'Tags may only contain letters, numbers, spaces, hyphens, and underscores'),
    )
    .max(10, 'Maximum 10 tags allowed')
    .optional()
    .default([]),
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
    status: z.enum(['ACTIVE', 'PENDING', 'ARCHIVED', 'REJECTED']).optional(),
    rejectionReason: z.string().max(1000).optional(),
  })

export type CreateToolInput = z.infer<typeof createToolSchema>
export type UpdateToolInput = z.infer<typeof updateToolSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Smart Registration schemas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Step 1 — Identify: minimum data to create a DRAFT tool record.
 * Name is optional (auto-derived from URL hostname if not provided).
 */
export const createDraftSchema = z.object({
  externalUrl: z
    .string()
    .min(1, 'Tool URL is required')
    .url('Must be a valid URL (include https://)')
    .refine(
      (url) => url.startsWith('http://') || url.startsWith('https://'),
      'URL must start with http:// or https://',
    )
    .refine(
      (url) => !isBlockedUrl(url),
      'URL must not point to a private, loopback, or internal network address',
    ),

  name: z
    .string()
    .max(100, 'Name must be 100 characters or fewer')
    .optional()
    .or(z.literal('')),

  githubRepoUrl: z
    .string()
    .min(1, 'GitHub repo URL is required')
    .url('Must be a valid URL')
    .refine((url) => url.includes('github.com'), 'Must be a GitHub URL'),

  description: z
    .string()
    .min(1, 'Brief description is required')
    .max(500, 'Description must be 500 characters or fewer'),
})

/**
 * Step 2 + review step — update a DRAFT tool's governance and AI fields.
 * All fields optional; only provided fields are written.
 */
export const updateDraftSchema = z.object({
  // Step 2: ownership & governance
  name:           z.string().min(1).max(100).optional(),
  team:           z.string().max(100).optional().or(z.literal('')),
  accessLevel:    z.enum(['INTERNAL', 'RESTRICTED', 'LEADERSHIP']).optional(),
  isExperimental: z.boolean().optional(),
  githubRepoUrl:  z.string().url().optional().or(z.literal('')),

  // Review step: human-edited copy
  description: z.string().max(500).optional().or(z.literal('')),
  notes:       z.string().max(1000).optional().or(z.literal('')),
  tags:        z
    .array(
      z.string().min(1).max(50)
        .regex(/^[a-zA-Z0-9 _-]+$/, 'Tags may only contain letters, numbers, spaces, hyphens, and underscores'),
    )
    .max(10)
    .optional(),

  // Review step: AI field overrides (user accepts/edits generated values)
  aiTitle:          z.string().max(100).optional().or(z.literal('')),
  aiSummary:        z.string().max(500).optional().or(z.literal('')),
  aiDescription:    z.string().max(2000).optional().or(z.literal('')),
  aiObjective:      z.string().max(500).optional().or(z.literal('')),
  aiSuggestedUsers: z.string().max(500).optional().or(z.literal('')),
  aiCategory:       z.string().max(50).optional().or(z.literal('')),
  aiTechStack:      z.string().max(200).optional().or(z.literal('')),
  aiFrameworkGuess: z.string().max(100).optional().or(z.literal('')),
})

export type CreateDraftInput = z.infer<typeof createDraftSchema>
export type UpdateDraftInput = z.infer<typeof updateDraftSchema>

export const updateUserSchema = z.object({
  role:   z.enum(['SUPER_ADMIN', 'ADMIN', 'BUILDER', 'VIEWER']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
})

export const createInvitationSchema = z.object({
  email: z.string().email(),
  role:  z.enum(['SUPER_ADMIN', 'ADMIN', 'BUILDER', 'VIEWER']),
})
