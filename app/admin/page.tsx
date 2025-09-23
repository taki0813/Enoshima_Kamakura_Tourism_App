import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function AdminHome() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">管理ダッシュボード</h1>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>観光スポット</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">スポットの作成・編集・削除</p>
              <Button asChild><Link href="/admin/spots">管理ページへ</Link></Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>クーポン</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">クーポンの作成・編集・削除</p>
              <Button asChild><Link href="/admin/coupons">管理ページへ</Link></Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}


