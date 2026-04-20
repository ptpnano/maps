import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from './db';
import bcrypt from 'bcrypt';
import { z } from 'zod';

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: 'jwt', maxAge: 3600 },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          
          const user = await db.user.findUnique({
            where: { email }
          });

          if (!user || !user.isActive) return null;

          const passwordsMatch = await bcrypt.compare(password, user.passwordHash);

          if (passwordsMatch) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              trustScore: user.trustScore,
              workerStatus: user.workerStatus
            };
          }
        }
        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.workerStatus = user.workerStatus;
      }
      // Always refresh workerStatus from DB for workers so approval is reflected immediately
      if (token.role === 'worker' && token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { workerStatus: true, isActive: true }
        });
        if (dbUser) {
          token.workerStatus = dbUser.workerStatus;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.workerStatus = token.workerStatus as string | null;
      }
      return session;
    }
  }
});
