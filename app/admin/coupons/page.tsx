"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Coupon = {
  id: string
  couponId: string
  title: string
  description: string
  discount: string
  validUntil: string
  spotId: string
  spotName: string
  isUsed: boolean
  obtainedAt: string
  usedAt?: string | null
  category: string
  isInstant?: boolean | null
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<Coupon> | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await fetch("/api/admin/coupons")
    const data = await res.json()
    setCoupons(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const save = async () => {
    if (!editing) return
    const method = editing.id ? "PUT" : "POST"
    const res = await fetch("/api/admin/coupons", { method, body: JSON.stringify(editing) })
    if (res.ok) {
      setEditing(null)
      load()
    }
  }

  const remove = async (id: string) => {
    if (!confirm("削除しますか？")) return
    const res = await fetch("/api/admin/coupons", { method: "DELETE", body: JSON.stringify({ id }) })
    if (res.ok) load()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">クーポン管理</h1>
          <Button onClick={() => setEditing({ couponId: '', title: '', description: '', discount: '', validUntil: '', spotId: '', spotName: '', isUsed: false, category: '', isInstant: false })}>新規作成</Button>
        </div>
        {loading ? (
          <div>読み込み中...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {coupons.map((c) => (
              <Card key={c.id}>
                <CardHeader>
                  <CardTitle>{c.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm text-muted-foreground">{c.discount} / {c.category}</div>
                  <div className="text-sm">有効期限: {c.validUntil}</div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setEditing(c)}>編集</Button>
                    <Button variant="destructive" onClick={() => remove(c.id)}>削除</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {editing && (
          <Card>
            <CardHeader>
              <CardTitle>{editing.id ? "クーポン編集" : "クーポン作成"}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Input placeholder="クーポンID" value={editing.couponId || ""} onChange={(e) => setEditing({ ...editing, couponId: e.target.value })} />
              <Input placeholder="タイトル" value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              <Input placeholder="説明" value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              <Input placeholder="割引表示" value={editing.discount || ""} onChange={(e) => setEditing({ ...editing, discount: e.target.value })} />
              <Input placeholder="有効期限(YYYY-MM-DD等)" value={editing.validUntil || ""} onChange={(e) => setEditing({ ...editing, validUntil: e.target.value })} />
              <Input placeholder="スポットID" value={editing.spotId || ""} onChange={(e) => setEditing({ ...editing, spotId: e.target.value })} />
              <Input placeholder="スポット名" value={editing.spotName || ""} onChange={(e) => setEditing({ ...editing, spotName: e.target.value })} />
              <Input placeholder="カテゴリ" value={editing.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditing(null)}>キャンセル</Button>
                <Button onClick={save}>保存</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}


