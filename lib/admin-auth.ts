import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || !(session.user as any)?.id) {
    // throw new Error("Unauthorized") // Next.js API RouteではResponseを返すのが一般的ですが、ここではエラーを投げる既存のロジックに従います
    throw new Error("Unauthorized")
  }
  const role = (session.user as any).role
  if (role !== "admin") {
    throw new Error("Forbidden")
  }
  return session
}

// 追加する関数: エラーを投げずに認証チェックを行うための関数
export async function checkAdminAuth(): Promise<boolean> {
  try {
    // requireAdminを呼び出して認証を試みる
    await requireAdmin();
    return true; // 認証成功
  } catch (error) {
    // 認証失敗（UnauthorizedまたはForbidden）
    return false; // 認証失敗
  }
}