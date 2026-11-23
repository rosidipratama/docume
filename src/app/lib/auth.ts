import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "./db";
import { verifyPassword } from "./password";

declare module "next-auth" {
  interface Session {
    user: { id: string; name?: string | null; email?: string | null; image?: string | null };
  }
}

export const username = z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_-]{1,29}$/);

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [Credentials({
    credentials: { username: {}, password: { type: "password" } },
    async authorize(credentials) {
      const result = z.object({ username, password: z.string().min(1).max(128) }).safeParse(credentials);
      if (!result.success) return null;
      const user = await db.user.findUnique({ where: { username: result.data.username } });
      if (!await verifyPassword(result.data.password, user?.passwordHash) || !user) return null;
      return { id: user.id, name: user.name ?? user.username };
    },
  })],
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
