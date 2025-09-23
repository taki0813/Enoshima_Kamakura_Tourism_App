import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || !(session.user as any)?.id) {
    throw new Error("Unauthorized")
  }
  const role = (session.user as any).role
  if (role !== "admin") {
    throw new Error("Forbidden")
  }
  return session
}


