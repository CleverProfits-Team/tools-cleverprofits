import { prisma } from '@/lib/db'

export type AuditAction =
  | 'TOOL_REGISTERED'
  | 'TOOL_APPROVED'
  | 'TOOL_REJECTED'
  | 'TOOL_ARCHIVED'
  | 'TOOL_RESTORED'
  | 'ROLE_CHANGED'
  | 'USER_SUSPENDED'
  | 'USER_ACTIVATED'

interface AuditParams {
  action: AuditAction
  actorEmail: string
  actorName: string
  toolId?: string
  toolName?: string
  targetEmail?: string
  detail?: string
}

/**
 * Fire-and-forget audit log write. Never throws — a logging failure
 * must never block the primary operation.
 */
export function writeAuditLog(params: AuditParams): void {
  prisma.auditLog.create({ data: params }).catch((err) => {
    console.error('[audit] failed to write log:', err)
  })
}
