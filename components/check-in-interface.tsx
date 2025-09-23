"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, MapPin, Target, CheckCircle, Star, Gift, Loader2, Ticket } from "lucide-react"
import type { TouristSpot } from "@/lib/tourist-data"
import {
  getCurrentLocation,
  checkLocationForCheckIn,
  updateTourProgress,
  getUserId,
  saveTourProgress,
  loadTourProgress,
  type TourProgress,
  type LocationData,
  type CheckInResult,
} from "@/lib/location-service"
import {
  generateCheckInCoupons,
  checkAndAwardMilestoneCoupons,
  addCouponsToUser,
  getAvailableCoupons,
  type UserCoupon,
} from "@/lib/coupon-system"
import CouponInterface from "./coupon-interface"

interface CheckInInterfaceProps {
  tourPlan: TouristSpot[]
  onBack: () => void
}

export default function CheckInInterface({ tourPlan, onBack }: CheckInInterfaceProps) {
  const [userId] = useState(() => getUserId())
  const [tourProgress, setTourProgress] = useState<TourProgress>(() => loadTourProgress(userId, tourPlan.length))
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [lastCheckInResult, setLastCheckInResult] = useState<CheckInResult | null>(null)
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [showCoupons, setShowCoupons] = useState(false)
  const [newCoupons, setNewCoupons] = useState<UserCoupon[]>([])
  const [availableCouponsCount, setAvailableCouponsCount] = useState(0)

  useEffect(() => {
    saveTourProgress(userId, tourProgress)
    setAvailableCouponsCount(getAvailableCoupons(userId).length)
  }, [userId, tourProgress])

  const handleCheckIn = async () => {
    setIsCheckingIn(true)
    setLocationError(null)
    setLastCheckInResult(null)
    setNewCoupons([])

    try {
      const location = await getCurrentLocation()
      setCurrentLocation(location)

      const checkInResult = checkLocationForCheckIn(location, tourPlan)
      setLastCheckInResult(checkInResult)

      if (checkInResult.success && checkInResult.spotId) {
        const oldPercentage = tourProgress.completionPercentage
        const newProgress = updateTourProgress(tourProgress, checkInResult.spotId)
        setTourProgress(newProgress)

        // Award check-in coupons
        const checkedInSpot = tourPlan.find((spot) => spot.id === checkInResult.spotId)
        if (checkedInSpot && checkedInSpot.coupons.length > 0) {
          const checkInCoupons = generateCheckInCoupons(checkInResult.spotId, checkedInSpot.coupons)
          addCouponsToUser(userId, checkInCoupons)
          setNewCoupons((prev) => [...prev, ...checkInCoupons])
        }

        // Check for milestone rewards
        const milestoneCoupons = checkAndAwardMilestoneCoupons(userId, oldPercentage, newProgress.completionPercentage)
        if (milestoneCoupons.length > 0) {
          setNewCoupons((prev) => [...prev, ...milestoneCoupons])
        }

        // Update coupon count
        setAvailableCouponsCount(getAvailableCoupons(userId).length)
      }
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : "位置情報の取得に失敗しました")
    } finally {
      setIsCheckingIn(false)
    }
  }

  const getRewardForCompletion = (percentage: number): string => {
    if (percentage >= 100) return "🏆 コンプリート特典: 特別クーポン5枚"
    if (percentage >= 75) return "🥉 75%達成特典: クーポン3枚"
    if (percentage >= 50) return "🥈 50%達成特典: クーポン2枚"
    if (percentage >= 25) return "🥇 25%達成特典: クーポン1枚"
    return ""
  }

  const getNextSpot = () => {
    return tourPlan.find((spot) => !tourProgress.visitedSpots.includes(spot.id))
  }

  const nextSpot = getNextSpot()

  if (showCoupons) {
    return <CouponInterface onBack={() => setShowCoupons(false)} />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">観光チェックイン</h1>
            <p className="text-sm text-muted-foreground">
              {tourProgress.visitedSpots.length}/{tourProgress.totalSpots} 箇所訪問済み
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowCoupons(true)} className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            <span className="text-sm">{availableCouponsCount}</span>
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Progress Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <Star className="h-5 w-5 text-secondary" />
              観光進捗
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">完了率</span>
                <span className="font-medium text-card-foreground">
                  {Math.round(tourProgress.completionPercentage)}%
                </span>
              </div>
              <Progress value={tourProgress.completionPercentage} className="h-2" />
            </div>

            <div className="flex justify-between items-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary">{tourProgress.points}</div>
                <div className="text-xs text-muted-foreground">ポイント</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary">{tourProgress.visitedSpots.length}</div>
                <div className="text-xs text-muted-foreground">訪問済み</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">
                  {tourProgress.totalSpots - tourProgress.visitedSpots.length}
                </div>
                <div className="text-xs text-muted-foreground">残り</div>
              </div>
            </div>

            {getRewardForCompletion(tourProgress.completionPercentage) && (
              <div className="p-3 bg-accent/10 rounded-lg text-center">
                <p className="text-sm font-medium text-accent-foreground">
                  {getRewardForCompletion(tourProgress.completionPercentage)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* New Coupons Alert */}
        {newCoupons.length > 0 && (
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <Gift className="h-5 w-5" />
                新しいクーポンを獲得！
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {newCoupons.slice(0, 3).map((coupon) => (
                <div key={coupon.id} className="flex items-center justify-between p-2 bg-white rounded">
                  <div>
                    <h5 className="font-medium text-green-800 text-sm">{coupon.title}</h5>
                    <p className="text-xs text-green-600">{coupon.description}</p>
                  </div>
                  <div className="text-sm font-bold text-green-700">{coupon.discount}</div>
                </div>
              ))}
              {newCoupons.length > 3 && (
                <p className="text-xs text-green-600 text-center">
                  他{newCoupons.length - 3}枚のクーポンも獲得しました
                </p>
              )}
              <Button
                onClick={() => setShowCoupons(true)}
                className="w-full bg-green-600 text-white hover:bg-green-700"
                size="sm"
              >
                クーポンを確認する
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Check-in Button */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <Target className="h-5 w-5 text-secondary" />
              チェックイン
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {nextSpot && (
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-medium text-card-foreground mb-1">次の目的地</h4>
                <p className="text-sm text-muted-foreground">{nextSpot.name}</p>
              </div>
            )}

            <Button
              onClick={handleCheckIn}
              disabled={isCheckingIn}
              className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              {isCheckingIn ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  位置情報を取得中...
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 mr-2" />
                  現在地でチェックイン
                </>
              )}
            </Button>

            {locationError && (
              <div className="p-3 bg-destructive/10 rounded-lg">
                <p className="text-sm text-destructive">{locationError}</p>
              </div>
            )}

            {lastCheckInResult && (
              <div
                className={`p-3 rounded-lg ${
                  lastCheckInResult.success
                    ? "bg-green-50 border border-green-200"
                    : "bg-yellow-50 border border-yellow-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {lastCheckInResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <MapPin className="h-4 w-4 text-yellow-600" />
                  )}
                  <p
                    className={`text-sm font-medium ${
                      lastCheckInResult.success ? "text-green-800" : "text-yellow-800"
                    }`}
                  >
                    {lastCheckInResult.message}
                  </p>
                </div>
                {lastCheckInResult.success && <p className="text-xs text-green-600">+100ポイント獲得！</p>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completion Reward */}
        {tourProgress.completionPercentage === 100 && (
          <Card className="bg-gradient-to-r from-secondary/10 to-accent/10 border-secondary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Gift className="h-5 w-5 text-secondary" />
                コンプリート達成！
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-card-foreground mb-3">
                すべての観光スポットを訪問しました！特別な特典をお受け取りください。
              </p>
              <Button
                className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
                onClick={() => setShowCoupons(true)}
              >
                特典を受け取る
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Visited Spots List */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">訪問済みスポット</CardTitle>
          </CardHeader>
          <CardContent>
            {tourProgress.visitedSpots.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">まだ訪問したスポットがありません</p>
            ) : (
              <div className="space-y-3">
                {tourPlan
                  .filter((spot) => tourProgress.visitedSpots.includes(spot.id))
                  .map((spot, index) => (
                    <div key={spot.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-medium text-card-foreground">{spot.name}</h4>
                        <p className="text-sm text-muted-foreground">+100ポイント獲得</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
