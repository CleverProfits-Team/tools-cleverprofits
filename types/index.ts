import type { Tool, User } from '@prisma/client'

/**
 * Serialized version of the Prisma Tool model.
 *
 * When a Server Component passes Tool objects to a Client Component via props,
 * Next.js serializes the data to JSON. Date objects become ISO string values.
 * TypeScript would not catch this mismatch if we used the raw `Tool` type in
 * client components — hence this explicit serialized variant.
 *
 * Always convert in the Server Component before passing down:
 *   const tools: SerializedTool[] = rawTools.map(t => ({
 *     ...t,
 *     createdAt: t.createdAt.toISOString(),
 *     updatedAt: t.updatedAt.toISOString(),
 *   }))
 */
export type SerializedTool = Omit<Tool, 'createdAt' | 'updatedAt'> & {
  createdAt: string
  updatedAt: string
}

export type SerializedUser = Omit<User, 'createdAt' | 'updatedAt'> & {
  createdAt: string
  updatedAt: string
}
