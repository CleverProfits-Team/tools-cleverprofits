import { redirect } from 'next/navigation'

/**
 * Root route — redirect to dashboard.
 * Phase 3 will add an auth check before the redirect:
 * if not authenticated → /login, else → /dashboard
 */
export default function Home() {
  redirect('/dashboard')
}
