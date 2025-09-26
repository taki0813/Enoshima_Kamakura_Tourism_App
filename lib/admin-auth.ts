import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || !(session.user as any)?.id) {
    // 認証されていない場合はエラーをスロー
    throw new Error("Unauthorized")
  }
  const role = (session.user as any).role
  if (role !== "admin") {
    // 管理者ロールでない場合はエラーをスロー
    throw new Error("Forbidden")
  }
  return session
}

/**
 * Next.js API Routeで使用するための認証チェック関数。
 * 認証成功/失敗をbooleanで返す。
 * @param request NextRequestオブジェクト
 * @returns 認証が成功した場合はtrue、失敗した場合はfalse
 */
export async function checkAdminAuth(request: Request): Promise<boolean> {
  try {
    // getServerSessionは引数を取らないため、requestは使用しない（内部でNextAuthがContextを使用）
    const session = await getServerSession(authOptions);
    
    // 認証ロジックをrequireAdminからコピーして使用
    if (!session || !(session.user as any)?.id) {
      return false; // Unauthorized
    }
    if ((session.user as any).role !== "admin") {
      return false; // Forbidden
    }
    
    return true; // 認証成功
  } catch (error) {
    // 予期せぬエラーが発生した場合
    console.error("Admin authentication check failed:", error);
    return false;
  }
}