"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Spot = {
  id: string
  name: string
  description: string
  area: string
  category: string
  tags: string
  duration: number
  difficulty: string
  lat: number
  lng: number
  openHours: string
  bestVisitTime?: string | null
  entranceFee: number
  image: string
  tips: string
}

export default function AdminSpotsPage() {
  const [spots, setSpots] = useState<Spot[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<Spot> | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await fetch("/api/admin/spots")
    const data = await res.json()
    setSpots(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const save = async () => {
    if (!editing) return
    const method = editing.id ? "PUT" : "POST"
    const res = await fetch("/api/admin/spots", { method, body: JSON.stringify(editing) })
    if (res.ok) {
      setEditing(null)
      load()
    }
  }

  const remove = async (id: string) => {
    if (!confirm("削除しますか？")) return
    const res = await fetch("/api/admin/spots", { method: "DELETE", body: JSON.stringify({ id }) })
    if (res.ok) load()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">観光スポット管理</h1>
          <Button onClick={() => setEditing({ name: "", description: "", area: "", category: "", tags: "[]", duration: 60, difficulty: "", lat: 0, lng: 0, openHours: "", bestVisitTime: "", entranceFee: 0, image: "", tips: "[]" })}>新規作成</Button>
        </div>
        {loading ? (
          <div>読み込み中...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {spots.map((s) => (
              <Card key={s.id}>
                <CardHeader>
                  <CardTitle>{s.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm text-muted-foreground">{s.area} / {s.category}</div>
                  <div className="text-sm">滞在時間: {s.duration} 分</div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setEditing(s)}>編集</Button>
                    <Button variant="destructive" onClick={() => remove(s.id)}>削除</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {editing && (
          <Card>
            <CardHeader>
              <CardTitle>{editing.id ? "スポット編集" : "スポット作成"}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Input placeholder="名称" value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              <Input placeholder="説明" value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              <Input placeholder="エリア" value={editing.area || ""} onChange={(e) => setEditing({ ...editing, area: e.target.value })} />
              <Input placeholder="カテゴリ" value={editing.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
              <Input placeholder="tags(JSON文字列)" value={editing.tags || "[]"} onChange={(e) => setEditing({ ...editing, tags: e.target.value })} />
              <Input placeholder="滞在時間(分)" type="number" value={editing.duration ?? 60} onChange={(e) => setEditing({ ...editing, duration: Number(e.target.value) })} />
              <Input placeholder="難易度" value={editing.difficulty || ""} onChange={(e) => setEditing({ ...editing, difficulty: e.target.value })} />
              <Input placeholder="緯度" type="number" value={editing.lat ?? 0} onChange={(e) => setEditing({ ...editing, lat: Number(e.target.value) })} />
              <Input placeholder="経度" type="number" value={editing.lng ?? 0} onChange={(e) => setEditing({ ...editing, lng: Number(e.target.value) })} />
              <Input placeholder="営業時間" value={editing.openHours || ""} onChange={(e) => setEditing({ ...editing, openHours: e.target.value })} />
              <Input placeholder="行くべき時間帯(例: morning/afternoon/evening)" value={editing.bestVisitTime || ""} onChange={(e) => setEditing({ ...editing, bestVisitTime: e.target.value })} />
              <Input placeholder="入場料" type="number" value={editing.entranceFee ?? 0} onChange={(e) => setEditing({ ...editing, entranceFee: Number(e.target.value) })} />
              <div className="grid gap-2">
                <Input placeholder="画像URL" value={editing.image || ""} onChange={(e) => setEditing({ ...editing, image: e.target.value })} />
                <input type="file" accept="image/*" onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const fd = new FormData()
                  fd.append("file", file)
                  const res = await fetch("/api/admin/upload", { method: "POST", body: fd })
                  const data = await res.json()
                  if (res.ok && data.url) setEditing({ ...editing, image: data.url })
                }} />
              </div>
              <div className="grid gap-2">
                <Input placeholder="Tips を改行区切りで入力" value={(JSON.parse(editing.tips || "[]") as string[]).join("\n")} onChange={(e) => {
                  const arr = e.target.value.split(/\n+/).map(s => s.trim()).filter(Boolean)
                  setEditing({ ...editing, tips: JSON.stringify(arr) })
                }} />
              </div>
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


