"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Clock, MapPin, DollarSign, Image as ImageIcon, Tags, Check, X, Building2, Globe, AlertCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface TouristSpot {
  id: string
  name: string
  description: string
  area: string
  address?: string
  category: string
  tags: string[]
  duration: number
  difficulty: string
  coordinates: {
    lat: number
    lng: number
  }
  openHours: string
  entrance_fee: number
  image: string
  tips: string[]
  bestVisitTime: string | null
}

const spotCategories = [
  "shrine",
  "temple",
  "nature",
  "culture",
  "food",
  "shopping",
  "activity",
]

const tagOptions = [
  "若者向け",
  "インスタ映え",
  "写真映え",
  "グルメ",
  "食べ歩き",
  "歴史",
  "文化財",
  "武士",
  "カップル",
  "デート",
  "大人向け",
  "癒し",
  "庭園",
  "静寂",
  "女性人気",
  "縁結び",
  "花",
]

export default function AdminSpotsPage() {
  const [spots, setSpots] = useState<TouristSpot[]>([])
  const [selectedSpot, setSelectedSpot] = useState<TouristSpot | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [loading, setLoading] = useState(true)
  const [formState, setFormState] = useState({
    name: "",
    description: "",
    area: "",
    address: "",
    category: "",
    tags: "",
    duration: 0,
    difficulty: "",
    lat: 0,
    lng: 0,
    openHours: "",
    entrance_fee: 0,
    image: "",
    tips: "",
    bestVisitTime: "",
  })
  const [isGeocoding, setIsGeocoding] = useState(false)
  const { toast } = useToast()
  const { data: session, status } = useSession()
  const router = useRouter()

  const userIsAdmin = useMemo(() => {
    return session?.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
  }, [session])

  useEffect(() => {
    if (status === "loading") return
    if (!userIsAdmin) {
      router.push("/admin/login")
    } else {
      fetchSpots()
    }
  }, [userIsAdmin, status, router])

  const fetchSpots = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/spots")
      if (!res.ok) throw new Error("Failed to fetch spots")
      const data = await res.json()
      setSpots(data)
    } catch (error) {
      console.error(error)
      toast({
        title: "エラー",
        description: "スポット情報の取得に失敗しました。",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (spot: TouristSpot) => {
    setSelectedSpot(spot)
    setIsNew(false)
    setFormState({
      name: spot.name,
      description: spot.description,
      area: spot.area,
      address: spot.address || "",
      category: spot.category,
      tags: spot.tags.join(", "),
      duration: spot.duration,
      difficulty: spot.difficulty,
      lat: spot.coordinates.lat,
      lng: spot.coordinates.lng,
      openHours: spot.openHours,
      entrance_fee: spot.entrance_fee,
      image: spot.image,
      tips: spot.tips.join(", "),
      bestVisitTime: spot.bestVisitTime || "",
    })
  }

  const handleCreate = () => {
    setSelectedSpot(null)
    setIsNew(true)
    setFormState({
      name: "",
      description: "",
      area: "",
      address: "",
      category: "",
      tags: "",
      duration: 0,
      difficulty: "",
      lat: 0,
      lng: 0,
      openHours: "",
      entrance_fee: 0,
      image: "",
      tips: "",
      bestVisitTime: "",
    })
  }

  const handleGeocode = async () => {
    if (!formState.address) {
      toast({
        title: "エラー",
        description: "住所を入力してください。",
        variant: "destructive",
      })
      return
    }

    setIsGeocoding(true)
    try {
      const res = await fetch(`/api/search-spot?address=${encodeURIComponent(formState.address)}`)
      if (!res.ok) throw new Error("Failed to geocode address")
      const data = await res.json()

      if (data.success && data.coordinates) {
        setFormState((prev) => ({
          ...prev,
          lat: data.coordinates.lat,
          lng: data.coordinates.lng,
        }))
        toast({
          title: "成功",
          description: "住所から座標を割り出しました。",
        })
      } else {
        toast({
          title: "エラー",
          description: "住所が見つかりませんでした。別の住所を試してください。",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error(error)
      toast({
        title: "エラー",
        description: "ジオコーディングに失敗しました。",
        variant: "destructive",
      })
    } finally {
      setIsGeocoding(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = isNew ? "/api/admin/spots" : `/api/admin/spots/${selectedSpot?.id}`
    const method = isNew ? "POST" : "PUT"

    const payload = {
      ...formState,
      tags: formState.tags.split(",").map((t) => t.trim()),
      tips: formState.tips.split(",").map((t) => t.trim()),
      duration: Number(formState.duration),
      entrance_fee: Number(formState.entrance_fee),
      coordinates: {
        lat: Number(formState.lat),
        lng: Number(formState.lng),
      },
    }

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error("Failed to save spot")

      toast({
        title: "成功",
        description: isNew ? "新しいスポットが作成されました。" : "スポット情報が更新されました。",
      })
      fetchSpots()
      handleCreate() // Reset form
    } catch (error) {
      console.error(error)
      toast({
        title: "エラー",
        description: "スポットの保存に失敗しました。",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/spots/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete spot")

      toast({
        title: "成功",
        description: "スポットが削除されました。",
      })
      fetchSpots()
    } catch (error) {
      console.error(error)
      toast({
        title: "エラー",
        description: "スポットの削除に失敗しました。",
        variant: "destructive",
      })
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">ロード中...</p>
        </div>
      </div>
    )
  }

  if (!userIsAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold">アクセス拒否</h1>
          <p className="text-muted-foreground">このページにアクセスする権限がありません。</p>
          <Button onClick={() => router.push("/admin/login")}>ログインページへ</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">観光スポット管理</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>スポット一覧</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>名前</TableHead>
                        <TableHead>エリア</TableHead>
                        <TableHead>カテゴリ</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {spots.map((spot) => (
                        <TableRow key={spot.id}>
                          <TableCell className="font-medium">{spot.name}</TableCell>
                          <TableCell>{spot.area === "enoshima" ? "江ノ島" : "鎌倉"}</TableCell>
                          <TableCell>{spot.category}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="mr-2"
                              onClick={() => handleEdit(spot)}
                            >
                              編集
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  削除
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    この操作は元に戻すことができません。スポット「{spot.name}」を完全に削除します。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(spot.id)}>
                                    削除
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>{isNew ? "新規スポット作成" : "スポット情報編集"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">スポット名</Label>
                    <Input
                      id="name"
                      value={formState.name}
                      onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">説明</Label>
                    <Textarea
                      id="description"
                      value={formState.description}
                      onChange={(e) =>
                        setFormState({ ...formState, description: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="area">エリア</Label>
                    <Select
                      value={formState.area}
                      onValueChange={(value) => setFormState({ ...formState, area: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="エリアを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="enoshima">江ノ島</SelectItem>
                        <SelectItem value="kamakura">鎌倉</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">住所 (自動で座標に変換されます)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="address"
                        value={formState.address}
                        onChange={(e) => setFormState({ ...formState, address: e.target.value })}
                        placeholder="例: 神奈川県藤沢市江の島2-3-13"
                      />
                      <Button
                        type="button"
                        onClick={handleGeocode}
                        disabled={isGeocoding || !formState.address}
                      >
                        {isGeocoding ? (
                          <span className="flex items-center">
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                            変換中
                          </span>
                        ) : (
                          "変換"
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lat">緯度</Label>
                      <Input
                        id="lat"
                        type="number"
                        value={formState.lat}
                        onChange={(e) =>
                          setFormState({ ...formState, lat: Number(e.target.value) })
                        }
                        step="any"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lng">経度</Label>
                      <Input
                        id="lng"
                        type="number"
                        value={formState.lng}
                        onChange={(e) =>
                          setFormState({ ...formState, lng: Number(e.target.value) })
                        }
                        step="any"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">カテゴリ</Label>
                    <Select
                      value={formState.category}
                      onValueChange={(value) => setFormState({ ...formState, category: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="カテゴリを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {spotCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags">タグ (カンマ区切り)</Label>
                    <Input
                      id="tags"
                      value={formState.tags}
                      onChange={(e) => setFormState({ ...formState, tags: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tips">ヒント・コツ (カンマ区切り)</Label>
                    <Textarea
                      id="tips"
                      value={formState.tips}
                      onChange={(e) => setFormState({ ...formState, tips: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bestVisitTime">おすすめ訪問時間帯</Label>
                    <Select
                      value={formState.bestVisitTime}
                      onValueChange={(value) => setFormState({ ...formState, bestVisitTime: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="時間帯を選択（任意）" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">午前中 (〜12:00)</SelectItem>
                        <SelectItem value="afternoon">午後 (12:00〜17:00)</SelectItem>
                        <SelectItem value="evening">夕方以降 (17:00〜)</SelectItem>
                        <SelectItem value="">設定しない</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="duration">滞在時間 (分)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={formState.duration}
                        onChange={(e) =>
                          setFormState({ ...formState, duration: Number(e.target.value) })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="entrance_fee">入場料 (円)</Label>
                      <Input
                        id="entrance_fee"
                        type="number"
                        value={formState.entrance_fee}
                        onChange={(e) =>
                          setFormState({ ...formState, entrance_fee: Number(e.target.value) })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="openHours">営業時間</Label>
                    <Input
                      id="openHours"
                      value={formState.openHours}
                      onChange={(e) => setFormState({ ...formState, openHours: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="difficulty">難易度</Label>
                    <Select
                      value={formState.difficulty}
                      onValueChange={(value) => setFormState({ ...formState, difficulty: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="難易度を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="image">画像URL</Label>
                    <Input
                      id="image"
                      value={formState.image}
                      onChange={(e) => setFormState({ ...formState, image: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    <Check className="h-4 w-4 mr-2" />
                    {isNew ? "作成" : "更新"}
                  </Button>
                  {!isNew && (
                    <Button type="button" variant="outline" onClick={handleCreate} className="w-full">
                      <X className="h-4 w-4 mr-2" />
                      キャンセル
                    </Button>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}