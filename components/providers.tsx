'use client'

import { SessionProvider } from 'next-auth/react'

/**
 * Client-side provider tree.
 * Wraps the app in SessionProvider so that useSession() works in any
 * Client Component without needing to be inside a Server Component.
 *
 * Rendered once in app/layout.tsx.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
