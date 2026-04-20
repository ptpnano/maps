import NextAuth, { type DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      workerStatus: string | null
    } & DefaultSession["user"]
  }

  interface User {
    role?: string
    workerStatus?: string | null
    trustScore?: number
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: string
    workerStatus?: string | null
  }
}
