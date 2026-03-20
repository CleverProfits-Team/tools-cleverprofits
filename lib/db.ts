import { PrismaClient } from '@prisma/client'

// ─────────────────────────────────────────────────────────────────────────────
// Prisma singleton
//
// Next.js hot-module replacement in development creates a new module scope on
// every reload, which would instantiate a new PrismaClient each time and
// exhaust the database connection pool. We store one instance on the Node.js
// global object so it survives HMR without leaking connections.
//
// In production, the module is evaluated once per process, so `global.__prisma`
// is never set and we always use the freshly constructed client.
// ─────────────────────────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

export const prisma: PrismaClient =
  globalThis.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}
