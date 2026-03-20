import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

// ─────────────────────────────────────────────────────────────────────────────
// Type augmentation
//
// Extends NextAuth's default Session and JWT interfaces with our custom fields.
// Without this, TypeScript would not know about `session.user.id` etc.
// ─────────────────────────────────────────────────────────────────────────────

declare module 'next-auth' {
  interface Session {
    user: {
      /** Google subject ID (`sub`) — stable across sign-ins */
      id: string
      name: string
      email: string
      image: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    /** Mirrors `Session.user.id` inside the token */
    id: string
    picture?: string | null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_DOMAIN = 'cleverprofits.com'

// ─────────────────────────────────────────────────────────────────────────────
// Auth configuration
// ─────────────────────────────────────────────────────────────────────────────

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          /**
           * `hd` (hosted domain) hints to Google's OAuth consent screen to
           * show only accounts from this domain. This is UX only — it does NOT
           * enforce the domain. Actual enforcement happens in the signIn
           * callback below where we hard-reject non-matching emails.
           */
          hd: ALLOWED_DOMAIN,
          prompt: 'select_account',
          access_type: 'offline',
        },
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    /**
     * 8-hour session lifetime — matches a typical workday.
     * Users are prompted to re-authenticate when the token expires.
     */
    maxAge: 8 * 60 * 60,
  },

  callbacks: {
    /**
     * Domain enforcement gate.
     *
     * Called immediately after Google returns the user profile. Returning
     * `false` aborts the sign-in and redirects the user to:
     *   /login?error=AccessDenied
     *
     * This is the authoritative security check — the `hd` param above is
     * only a UX hint and must not be relied upon for access control.
     */
    async signIn({ user }) {
      const email = user.email ?? ''
      if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        return false
      }
      return true
    },

    /**
     * JWT population.
     *
     * The `user` object is only present on the first sign-in request.
     * On subsequent requests only `token` is available — do not re-fetch
     * from a DB here; read from the existing token.
     */
    async jwt({ token, user }) {
      if (user) {
        // `user.id` is the Google account ID from the OAuth profile
        token.id = user.id ?? token.sub ?? ''
        token.picture = user.image ?? null
      }
      return token
    },

    /**
     * Session shape exposed to the client.
     *
     * Only include what the UI needs. Avoid putting sensitive data here —
     * the session object is serialised and sent to the browser.
     */
    async session({ session, token }) {
      session.user = {
        id: token.id,
        name: token.name ?? '',
        email: token.email ?? '',
        image: token.picture ?? '',
      }
      return session
    },
  },

  pages: {
    signIn: '/login',
    /**
     * Redirect all OAuth errors to /login with ?error=<code>.
     * The login page maps these codes to human-readable messages.
     */
    error: '/login',
  },

  // Explicit secret — prevents silent misconfiguration in environments where
  // NEXTAUTH_SECRET is not set. next-auth will throw at startup if undefined.
  secret: process.env.NEXTAUTH_SECRET,

  // Verbose logs in development only
  debug: process.env.NODE_ENV === 'development',
}
