"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Gift, Ticket, CheckCircle, Clock, MapPin } from "lucide-react"
import { getAvailableCoupons, getUsedCoupons, useCoupon, validateCoupon, type UserCoupon } from "@/lib/coupon-system"
import { getUserId } from "@/lib/location-service"

interface CouponInterfaceProps {
  onBack: () => void
}

export default function CouponInterface({ onBack }: CouponInterfaceProps) {
  const [userId] = useState(() => getUserId())
  const [availableCoupons, setAvailableCoupons] = useState<UserCoupon[]>([])
  const [usedCoupons, setUsedCoupons] = useState<UserCoupon[]>([])
  const [selectedCoupon, setSelectedCoupon] = useState<UserCoupon | null>(null)
  const [showUseConfirm, setShowUseConfirm] = useState(false)

  useEffect(() => {
    loadCoupons()
  }, [userId])

  const loadCoupons = () => {
    setAvailableCoupons(getAvailableCoupons(userId))
    setUsedCoupons(getUsedCoupons(userId))
  }

  const handleUseCoupon = (coupon: UserCoupon) => {
    const validation = validateCoupon(coupon)
    if (!validation.valid) {
      alert(validation.message)
      return
    }

    setSelectedCoupon(coupon)
    setShowUseConfirm(true)
  }

  const confirmUseCoupon = () => {
    if (!selectedCoupon) return

    const success = useCoupon(userId, selectedCoupon.id)
    if (success) {
      loadCoupons()
      setShowUseConfirm(false)
      setSelectedCoupon(null)
      alert("クーポンを使用しました！")
    } else {
      alert("クーポンの使用に失敗しました")
    }
  }

  const getCategoryBadge = (category: UserCoupon["category"]) => {
    const styles = {
      "check-in": "bg-blue-100 text-blue-800",
      milestone: "bg-green-100 text-green-800",
      completion: "bg-purple-100 text-purple-800",
      special: "bg-yellow-100 text-yellow-800",
      instant: "bg-orange-100 text-orange-800",
    }

    const labels = {
      "check-in": "チェックイン",
      milestone: "マイルストーン",
      completion: "コンプリート",
      special: "特別",
      instant: "即座獲得",
    }

    return <Badge className={styles[category]}>{labels[category]}</Badge>
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const CouponCard = ({ coupon, isUsed = false }: { coupon: UserCoupon; isUsed?: boolean }) => (
    <Card className={`bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden ${isUsed ? "opacity-60" : ""}`}>
      <CardHeader className="bg-gradient-to-r from-blue-500 to-green-500 text-white p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-white text-lg font-bold">{coupon.title}</CardTitle>
            <p className="text-blue-100 text-sm mt-1">{coupon.description}</p>
          </div>
          <div className="text-right ml-3">
            <div className="text-2xl font-bold text-white">{coupon.discount}</div>
            {getCategoryBadge(coupon.category)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
            <MapPin className="h-3 w-3" />
            {coupon.spotName}
          </span>
          <span className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
            <Clock className="h-3 w-3" />
            {coupon.validUntil}まで
          </span>
        </div>

        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-xl">
          取得日: {formatDate(coupon.obtainedAt)}
          {isUsed && coupon.usedAt && <span className="ml-2">使用日: {formatDate(coupon.usedAt)}</span>}
        </div>

        {!isUsed && (
          <Button
            onClick={() => handleUseCoupon(coupon)}
            className="w-full bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white rounded-xl h-12 font-semibold shadow-lg transform transition-all duration-200 hover:scale-105"
          >
            <Ticket className="h-5 w-5 mr-2" />
            クーポンを使用
          </Button>
        )}

        {isUsed && (
          <div className="flex items-center justify-center gap-2 py-3 bg-green-50 rounded-xl text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="font-semibold">使用済み</span>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-2 hover:bg-gray-100 rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              マイクーポン
            </h1>
            <p className="text-sm text-gray-600">
              利用可能: {availableCoupons.length}枚 | 使用済み: {usedCoupons.length}枚
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <Tabs defaultValue="available" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-100 rounded-2xl p-1">
            <TabsTrigger 
              value="available" 
              className="flex items-center gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
            >
              <Gift className="h-4 w-4" />
              <span className="font-semibold">利用可能 ({availableCoupons.length})</span>
            </TabsTrigger>
            <TabsTrigger 
              value="used" 
              className="flex items-center gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
            >
              <CheckCircle className="h-4 w-4" />
              <span className="font-semibold">使用済み ({usedCoupons.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="space-y-4 mt-6">
            {availableCoupons.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="text-center space-y-3">
                    <Gift className="h-12 w-12 text-muted-foreground mx-auto" />
                    <div>
                      <h3 className="font-medium text-card-foreground">クーポンがありません</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        観光スポットをチェックインしてクーポンを獲得しましょう！
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {availableCoupons.map((coupon) => (
                  <CouponCard key={coupon.id} coupon={coupon} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="used" className="space-y-4 mt-6">
            {usedCoupons.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="text-center space-y-3">
                    <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                    <div>
                      <h3 className="font-medium text-card-foreground">使用済みクーポンがありません</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        クーポンを使用すると、こちらに履歴が表示されます
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {usedCoupons.map((coupon) => (
                  <CouponCard key={coupon.id} coupon={coupon} isUsed />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Use Confirmation Modal */}
      {showUseConfirm && selectedCoupon && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="bg-card border-border max-w-sm w-full">
            <CardHeader>
              <CardTitle className="text-card-foreground">クーポン使用確認</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-medium text-card-foreground">{selectedCoupon.title}</h4>
                <p className="text-sm text-muted-foreground">{selectedCoupon.description}</p>
                <div className="text-lg font-bold text-secondary mt-2">{selectedCoupon.discount}</div>
              </div>

              <p className="text-sm text-muted-foreground">このクーポンを使用しますか？使用後は元に戻せません。</p>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUseConfirm(false)
                    setSelectedCoupon(null)
                  }}
                  className="flex-1"
                >
                  キャンセル
                </Button>
                <Button
                  onClick={() => {
                    const success = useCoupon(userId, selectedCoupon.id)
                    if (success) {
                      loadCoupons()
                      setShowUseConfirm(false)
                      setSelectedCoupon(null)
                      alert("クーポンを使用しました！")
                    } else {
                      alert("クーポンの使用に失敗しました")
                    }
                  }}
                  className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                >
                  使用する
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
