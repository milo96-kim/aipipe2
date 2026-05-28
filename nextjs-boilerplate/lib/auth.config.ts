// lib/auth.config.ts
import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"

// Edge-compatible auth config (no Prisma adapter — safe for middleware)
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
}
