import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import type { Role } from '@prisma/client'
import { prisma } from '@/lib/db'

// ─────────────────────────────────────────────────────────────────────────────
// Type augmentation
//
// Extends NextAuth's default Session and JWT interfaces with our custom fields.
// ─────────────────────────────────────────────────────────────────────────────

declare module 'next-auth' {
  interface Session {
    user: {
      /** Database User.id (cuid) — replaces the previous Google sub ID */
      id: string
      name: string
      email: string
      image: string
      /** RBAC role — read from DB at sign-in, valid for session lifetime */
      role: Role
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: Role
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
           * `hd` hints Google to show only @cleverprofits.com accounts.
           * UX only — actual enforcement is in the signIn callback below.
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
    maxAge: 8 * 60 * 60, // 8 hours — one workday
  },

  callbacks: {
    /**
     * Step 1 — Domain enforcement + user persistence.
     *
     * Runs immediately after Google returns the profile. Returning false (or a
     * redirect string) aborts the sign-in before a JWT is ever issued.
     *
     * We upsert here so every sign-in keeps name and avatar current with the
     * Google profile. Role is intentionally excluded from the update so it
     * can only be changed via an explicit admin action.
     */
    async signIn({ user }) {
      const email = user.email ?? ''

      if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) return false

      const dbUser = await prisma.user.upsert({
        where: { email },
        update: {
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        },
        create: {
          email,
          name: user.name,
          image: user.image,
          // role defaults to VIEWER (schema default)
        },
        select: { status: true },
      })

      // Apply any pending invitation for this email
      const pendingInvite = await prisma.invitation.findFirst({
        where: { email, status: 'PENDING', expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      })
      if (pendingInvite) {
        await prisma.$transaction([
          prisma.user.update({ where: { email }, data: { role: pendingInvite.role } }),
          prisma.invitation.update({
            where: { id: pendingInvite.id },
            data: { status: 'USED', usedAt: new Date() },
          }),
        ])
      }

      if (dbUser.status === 'SUSPENDED') {
        return '/login?error=Suspended'
      }

      return true
    },

    /**
     * Step 2 — JWT construction.
     *
     * `user` is only present on the initial sign-in. On subsequent JWT
     * refreshes only `token` is available and we return it unchanged — no
     * per-request DB calls. Role changes require a new sign-in (max 8 h).
     */
    async jwt({ token, user }) {
      if (user) {
        // signIn callback guarantees the record exists
        const dbUser = await prisma.user.findUniqueOrThrow({
          where: { email: token.email! },
          select: { id: true, role: true },
        })
        token.id = dbUser.id
        token.role = dbUser.role
        token.picture = user.image ?? null
      }
      return token
    },

    /**
     * Step 3 — Session shape sent to the client.
     *
     * role is included so client components can gate admin UI without an
     * extra API call. Do not add sensitive data here — the session object
     * is serialised and sent to the browser.
     */
    async session({ session, token }) {
      session.user = {
        id: token.id,
        name: token.name ?? '',
        email: token.email ?? '',
        image: token.picture ?? '',
        role: token.role,
      }
      return session
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
}
