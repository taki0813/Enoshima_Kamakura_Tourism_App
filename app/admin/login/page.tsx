"use client"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function AdminLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const params = useSearchParams()
  const callbackUrl = params.get("callbackUrl") || "/admin"

  const handleLogin = async () => {
    setLoading(true)
    setError("")
    const res = await signIn("credentials", { email, password, redirect: false, callbackUrl })
    setLoading(false)
    if (res?.error) {
      setError("メールまたはパスワードが正しくありません")
      return
    }
    if (res?.ok) {
      window.location.href = callbackUrl
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4">
      <Card className="w-full max-w-sm bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-3xl">
        <CardHeader>
          <CardTitle className="text-center">管理者ログイン</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input placeholder="メールアドレス" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input type="password" placeholder="パスワード" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <Button className="w-full" onClick={handleLogin} disabled={loading}>
            {loading ? "ログイン中..." : "ログイン"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}


