import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "./prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error("No user found with this email");
        }

        if (!user.password) {
          throw new Error("Account not activated. Please check your invite email.");
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValidPassword) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as string,
          avatarUrl: user.avatarUrl ?? undefined,
          ownerId: user.ownerId ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "STAFF";
        token.avatarUrl = (user as { avatarUrl?: string }).avatarUrl ?? null;
        token.ownerId = (user as { ownerId?: string | null }).ownerId ?? null;
      }
      // Allow client-side session updates (name, avatarUrl)
      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
        if (session.avatarUrl !== undefined) token.avatarUrl = session.avatarUrl;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        // actualUserId is always the real logged-in user (used for profile updates)
        session.user.actualUserId = token.id as string;
        // id is the data owner — admin's ID for staff, own ID for admin
        session.user.id = (token.ownerId as string | null) ?? (token.id as string);
        session.user.role = (token.role as string) ?? "STAFF";
        session.user.avatarUrl = (token.avatarUrl as string | null) ?? null;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
