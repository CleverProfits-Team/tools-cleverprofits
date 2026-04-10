// ─────────────────────────────────────────────────────────────────────────────
// Per-tool accent palette
// Hashed from tool name → deterministic color. Single source of truth.
// ─────────────────────────────────────────────────────────────────────────────

export const TOOL_PALETTE = [
  { bg: 'bg-blue-500',    hex: '#3b82f6' },
  { bg: 'bg-violet-500',  hex: '#8b5cf6' },
  { bg: 'bg-emerald-500', hex: '#10b981' },
  { bg: 'bg-amber-500',   hex: '#f59e0b' },
  { bg: 'bg-rose-500',    hex: '#f43f5e' },
  { bg: 'bg-sky-500',     hex: '#0ea5e9' },
  { bg: 'bg-orange-500',  hex: '#f97316' },
  { bg: 'bg-teal-500',    hex: '#14b8a6' },
  { bg: 'bg-pink-500',    hex: '#ec4899' },
  { bg: 'bg-indigo-500',  hex: '#6366f1' },
] as const

export function getToolAccent(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0
  }
  return TOOL_PALETTE[Math.abs(hash) % TOOL_PALETTE.length]
}
