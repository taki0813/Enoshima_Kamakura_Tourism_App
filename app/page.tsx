"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { MapPin, Clock, Gift, Star, Camera, Heart, Ticket, Search, Users, Building2, Route } from "lucide-react"
import {
  generateTourPlan,
  generateEnhancedTourPlan,
  calculateTourDuration,
  generateTimeBasedTourPlan,
  getSpotRouteInfo,
  searchSpotsByWhatToDo,
  type TouristSpot,
} from "@/lib/tourist-data"
import { generateInstantCoupons, addCouponsToUser, getAvailableCoupons } from "@/lib/coupon-system"
import { getUserId } from "@/lib/location-service"
import TourMap from "@/components/tour-map"
import CheckInInterface from "@/components/check-in-interface"
import CouponInterface from "@/components/coupon-interface"

interface DiagnosisData {
  gender: string
  age: string
  mustVisit: string
  travelStyle: string
  interests: string[]
  customSpot?: string
  startTime?: string
  startLocation?: string
  customStartLocation?: string
  endTime?: string
  whatToDo?: string
  visitTimePreference?: "morning" | "afternoon" | "evening" | "recommended" | ""
}

export default function HomePage() {
  const [showIntro, setShowIntro] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  const [diagnosisData, setDiagnosisData] = useState<DiagnosisData>({
    gender: "",
    age: "",
    mustVisit: "",
    travelStyle: "",
    interests: [],
    visitTimePreference: ""
  })
  const [showResults, setShowResults] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [showCoupons, setShowCoupons] = useState(false)
  const [tourPlan, setTourPlan] = useState<TouristSpot[]>([])
  const [timeBasedPlan, setTimeBasedPlan] = useState<any[]>([])
  const [routeInfo, setRouteInfo] = useState<any[]>([])
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false)
  const [instantCoupons, setInstantCoupons] = useState<any[]>([])
  const [currentView, setCurrentView] = useState<'intro' | 'diagnosis' | 'results' | 'map' | 'checkin' | 'coupons'>('intro')

  const steps = [
    {
      title: "性別を教えてください",
      key: "gender" as keyof DiagnosisData,
      options: [
        { value: "male", label: "男性" },
        { value: "female", label: "女性" },
        { value: "other", label: "その他" },
      ],
    },
    {
      title: "年齢層を教えてください",
      key: "age" as keyof DiagnosisData,
      options: [
        { value: "10s", label: "10代" },
        { value: "20s", label: "20代" },
        { value: "30s", label: "30代" },
        { value: "40s", label: "40代" },
        { value: "50s", label: "50代以上" },
      ],
    },
    {
      title: "絶対に行きたい場所はありますか？",
      key: "mustVisit" as keyof DiagnosisData,
      options: [
        { value: "enoshima", label: "江ノ島" },
        { value: "kamakura", label: "鎌倉" },
        { value: "both", label: "両方" },
        { value: "undecided", label: "まだ決めていない" },
      ],
    },
    {
      title: "旅行スタイルを教えてください",
      key: "travelStyle" as keyof DiagnosisData,
      options: [
        { value: "relaxed", label: "ゆっくり観光" },
        { value: "active", label: "アクティブに回る" },
        { value: "cultural", label: "文化・歴史重視" },
        { value: "gourmet", label: "グルメ重視" },
      ],
    },
    {
      title: "観光開始場所を教えてください",
      key: "startLocation" as keyof DiagnosisData,
      options: [
        { value: "enoshima_station", label: "江ノ島駅" },
        { value: "kamakura_station", label: "鎌倉駅" },
        { value: "fujisawa_station", label: "藤沢駅" },
        { value: "other", label: "その他（自由記述）" },
      ],
    },
    {
      title: "その他の場合は開始場所を教えてください",
      key: "customStartLocation" as keyof DiagnosisData,
      isCustomInput: true,
      options: [],
      condition: (data: DiagnosisData) => data.startLocation === "other",
    },
    {
      title: "観光開始時間を教えてください",
      key: "startTime" as keyof DiagnosisData,
      isTimeInput: true,
      options: [],
    },
    {
      title: "帰路につく時間を教えてください",
      key: "endTime" as keyof DiagnosisData,
      isTimeInput: true,
      options: [],
    },
    {
      title: "やりたいことを自由に教えてください",
      key: "whatToDo" as keyof DiagnosisData,
      isCustomInput: true,
      options: [],
      isOptional: true,
    },
    {
      title: "特に行きたい場所があれば教えてください",
      key: "customSpot" as keyof DiagnosisData,
      isCustomInput: true,
      options: [],
      isOptional: true,
    },
    {
      title: "おすすめの訪問時間帯はありますか？",
      key: "visitTimePreference" as keyof DiagnosisData,
      options: [
        { value: "recommended", label: "AIのおすすめ時間帯で" },
        { value: "morning", label: "午前中（〜12:00）" },
        { value: "afternoon", label: "午後（12:00〜17:00）" },
        { value: "evening", label: "夕方以降（17:00〜）" },
      ],
    },
  ]

  const handleNext = async () => {
    const nextStep = getNextStep(currentStep)
    if (nextStep < steps.length) {
      setCurrentStep(nextStep)
    } else {
      setIsGeneratingPlan(true)
      try {
        const generatedPlan = await generateEnhancedTourPlan(diagnosisData)
        setTourPlan(generatedPlan)
        
        if (diagnosisData.startTime && diagnosisData.startLocation) {
          const timeBased = generateTimeBasedTourPlan(
            generatedPlan, 
            diagnosisData.startTime, 
            diagnosisData.startLocation
          )
          setTimeBasedPlan(timeBased)
        }
        
        const routeData = await getSpotRouteInfo(generatedPlan)
        if (routeData) {
          setRouteInfo(routeData)
        }
        
        const instantCouponsData = generateInstantCoupons(generatedPlan)
        setInstantCoupons(instantCouponsData)

        const userId = getUserId()
        if (instantCouponsData.length > 0) {
          addCouponsToUser(userId, instantCouponsData)
        }

        // Attach DB coupons for only the recommended spots
        try {
          const spotIds = generatedPlan.map((s) => s.id)
          const res = await fetch('/api/coupons/by-spots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ spotIds }) })
          if (res.ok) {
            const dbCoupons = await res.json()
            if (Array.isArray(dbCoupons) && dbCoupons.length > 0) {
              const mapped = dbCoupons.map((c: any) => ({
                id: 'coupon_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9),
                couponId: c.id,
                title: c.title,
                description: c.description,
                discount: c.discount,
                validUntil: c.validUntil,
                spotId: c.spotId,
                spotName: c.spotName || '',
                isUsed: false,
                obtainedAt: Date.now(),
                category: 'instant' as const,
                isInstant: true,
              }))
              addCouponsToUser(userId, mapped)
            }
          }
        } catch {}
        
        setShowResults(true)
      } catch (error) {
        console.error("Failed to generate tour plan:", error)
        const fallbackPlan = await generateTourPlan(diagnosisData)
        setTourPlan(fallbackPlan)
        setShowResults(true)
      } finally {
        setIsGeneratingPlan(false)
      }
    }
  }

  const handlePrevious = () => {
    const prevStep = getPreviousStep(currentStep)
    if (prevStep >= 0) {
      setCurrentStep(prevStep)
    }
  }

  const handleOptionChange = (value: string) => {
    const currentKey = steps[currentStep].key
    setDiagnosisData((prev) => ({
      ...prev,
      [currentKey]: value,
    }))
  }

  const handleCustomInputChange = (value: string) => {
    setDiagnosisData((prev) => ({
      ...prev,
      customSpot: value,
    }))
  }

  const handleTimeInputChange = (value: string) => {
    setDiagnosisData((prev) => ({
      ...prev,
      startTime: value,
    }))
  }

  const handleCustomStartLocationChange = (value: string) => {
      setDiagnosisData((prev) => ({
        ...prev,
        customStartLocation: value,
      }))
  }

  const handleEndTimeInputChange = (value: string) => {
    setDiagnosisData((prev) => ({
      ...prev,
      endTime: value,
    }))
  }

  const handleWhatToDoChange = (value: string) => {
    setDiagnosisData((prev) => ({
      ...prev,
      whatToDo: value,
    }))
  }

  const getNextStep = (currentStep: number) => {
    let nextStep = currentStep + 1
    while (nextStep < steps.length) {
      const step = steps[nextStep]
      if (step.condition && !step.condition(diagnosisData)) {
        nextStep++
      } else {
        break
      }
    }
    return nextStep
  }

  const getPreviousStep = (currentStep: number) => {
    let prevStep = currentStep - 1
    while (prevStep >= 0) {
      const step = steps[prevStep]
      if (step.condition && !step.condition(diagnosisData)) {
        prevStep--
      } else {
        break
      }
    }
    return prevStep
  }

  const progress = ((currentStep + 1) / steps.length) * 100

  const startDiagnosis = () => {
    setShowIntro(false)
    setCurrentView('diagnosis')
  }

  const NavigationBar = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 p-4 z-50">
      <div className="max-w-md mx-auto flex justify-around">
        <button
          onClick={() => setCurrentView('intro')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 ${
            currentView === 'intro' ? 'bg-blue-100 text-blue-600' : 'text-gray-500'
          }`}
        >
          <MapPin className="h-5 w-5" />
          <span className="text-xs font-medium">ホーム</span>
        </button>
        <button
          onClick={() => setCurrentView('diagnosis')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 ${
            currentView === 'diagnosis' ? 'bg-blue-100 text-blue-600' : 'text-gray-500'
          }`}
        >
          <Search className="h-5 w-5" />
          <span className="text-xs font-medium">診断</span>
        </button>
        <button
          onClick={() => setCurrentView('results')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 ${
            currentView === 'results' ? 'bg-blue-100 text-blue-600' : 'text-gray-500'
          }`}
        >
          <Star className="h-5 w-5" />
          <span className="text-xs font-medium">プラン</span>
        </button>
        <button
          onClick={() => setCurrentView('map')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 ${
            currentView === 'map' ? 'bg-blue-100 text-blue-600' : 'text-gray-500'
          }`}
        >
          <MapPin className="h-5 w-5" />
          <span className="text-xs font-medium">地図</span>
        </button>
        <button
          onClick={() => setCurrentView('coupons')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 ${
            currentView === 'coupons' ? 'bg-blue-100 text-blue-600' : 'text-gray-500'
          }`}
        >
          <Gift className="h-5 w-5" />
          <span className="text-xs font-medium">クーポン</span>
        </button>
      </div>
    </div>
  )

  if (currentView === 'intro' || showIntro) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="max-w-md mx-auto p-4 space-y-8 pb-20">
          <div className="text-center space-y-6 pt-12">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-green-500 rounded-3xl flex items-center justify-center mx-auto shadow-lg">
                <MapPin className="h-12 w-12 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                <Star className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                江ノ島・鎌倉
              </h1>
              <h2 className="text-xl font-semibold text-gray-700">AI観光ルート生成</h2>
              <p className="text-sm text-gray-500 bg-white/60 backdrop-blur-sm rounded-full px-4 py-2 inline-block">
                中央大学岡嶋ゼミ × 神奈川県観光協会
              </p>
            </div>
          </div>
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-green-500 text-white p-6">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Users className="h-6 w-6" />
                プロジェクトについて
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <p className="text-gray-600 leading-relaxed text-center">
                あなたの好みや興味に合わせて、江ノ島・鎌倉エリアの最適な観光ルートを自動生成します。
              </p>
              <div className="grid gap-4">
                <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl">
                  <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Route className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 text-base">AIパーソナライズ</h4>
                    <p className="text-sm text-gray-600 mt-1">診断結果に基づいて、あなただけの観光プランを生成</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-2xl">
                  <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 text-base">リアルタイムチェックイン</h4>
                    <p className="text-sm text-gray-600 mt-1">GPS連動で観光地を訪問してポイントを獲得</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-2xl">
                  <div className="w-12 h-12 bg-yellow-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Gift className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 text-base">特典クーポン</h4>
                    <p className="text-sm text-gray-600 mt-1">観光地での割引や特典を即座に獲得</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-0 shadow-lg rounded-2xl">
            <CardContent className="p-6">
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-2xl text-gray-400">×</div>
                  <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    中央大学岡嶋ゼミ × 神奈川県観光協会
                  </p>
                  <p className="text-xs text-gray-500 mt-1">産学連携による観光DXプロジェクト</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Button
            onClick={startDiagnosis}
            className="w-full bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white py-6 text-lg font-semibold rounded-2xl shadow-lg transform transition-all duration-200 hover:scale-105"
          >
            <Route className="h-6 w-6 mr-3" />
            AI観光ルート生成を開始
          </Button>
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>所要時間：約1分</span>
              </div>
              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>質問数：7問</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (showCoupons) {
    return <CouponInterface onBack={() => setShowCoupons(false)} />
  }

  if (showCheckIn) {
    return <CheckInInterface tourPlan={tourPlan} onBack={() => setShowCheckIn(false)} />
  }

  if (currentView === 'map' || showMap) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <TourMap tourPlan={tourPlan} onBack={() => setCurrentView('results')} />
        <NavigationBar />
      </div>
    )
  }

  if (currentView === 'checkin' || showCheckIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <CheckInInterface onBack={() => setCurrentView('results')} tourPlan={tourPlan} />
        <NavigationBar />
      </div>
    )
  }

  if (currentView === 'coupons' || showCoupons) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <CouponInterface onBack={() => setShowCoupons(false)} />
        <NavigationBar />
      </div>
    )
  }

  if (currentView === 'results' || showResults) {
    const userId = getUserId()
    const displayPlan = timeBasedPlan.length > 0 ? timeBasedPlan : tourPlan
    const spotIdsForFilter = (displayPlan as any[]).map((s) => s.id)
    const availableCoupons = getAvailableCoupons(userId, spotIdsForFilter)
    const totalDuration = tourPlan && tourPlan.length > 0 ? calculateTourDuration(tourPlan) : 0
    const durationHours = Math.floor(totalDuration / 60)
    const durationMinutes = totalDuration % 60

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="max-w-md mx-auto p-4 space-y-6 pb-20">
          <div className="text-center space-y-4 pt-8">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-green-500 rounded-3xl flex items-center justify-center mx-auto shadow-lg">
                <Star className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                <Gift className="h-4 w-4 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                あなたにおすすめの観光プラン
              </h1>
              <p className="text-gray-600 mt-2">診断結果に基づいて最適なルートをご提案します</p>
            </div>
            {diagnosisData.customSpot && (
              <div className="flex items-center justify-center gap-2 text-sm text-accent">
                <Search className="h-4 w-4" />
                <span>Web検索で追加スポットを含めました</span>
              </div>
            )}
            {instantCoupons.length > 0 && (
              <div className="flex items-center justify-center gap-3 text-sm text-green-700 bg-gradient-to-r from-green-100 to-green-200 p-4 rounded-2xl shadow-sm">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <Gift className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold">ルート選択で{instantCoupons.length}枚のクーポンを獲得しました！</span>
              </div>
            )}
          </div>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-green-500 text-white p-6">
              <CardTitle className="flex items-center gap-3 text-xl">
                <MapPin className="h-6 w-6" />
                {diagnosisData.mustVisit === "enoshima" && "江ノ島"}
                {diagnosisData.mustVisit === "kamakura" && "鎌倉"}
                {(diagnosisData.mustVisit === "both" || diagnosisData.mustVisit === "undecided") && "江ノ島・鎌倉"}{" "}
                観光コース
              </CardTitle>
              <div className="text-blue-100 mt-2">
                {diagnosisData.travelStyle === "relaxed" && "ゆったりと楽しむコース"}
                {diagnosisData.travelStyle === "active" && "アクティブに回るコース"}
                {diagnosisData.travelStyle === "cultural" && "文化・歴史を感じるコース"}
                {diagnosisData.travelStyle === "gourmet" && "グルメを堪能するコース"}
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-2xl">
                <Clock className="h-5 w-5 text-blue-500" />
                <span className="font-semibold">所要時間: 約{durationHours}時間{durationMinutes > 0 && `${durationMinutes}分`}</span>
              </div>

              <div className="space-y-4">
                {displayPlan.map((spot, index) => (
                  <div key={spot.id} className="relative">
                    <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                          {spot.order || index + 1}
                        </div>
                        {index < displayPlan.length - 1 && (
                          <div className="w-1 h-12 bg-gradient-to-b from-blue-300 to-green-300 mt-2 rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-800 text-lg">{spot.name}</h4>
                          <div className="flex gap-1">
                            {spot.tags.includes("写真映え") && <Camera className="h-4 w-4 text-pink-500" />}
                            {spot.tags.includes("縁結び") && <Heart className="h-4 w-4 text-red-500" />}
                            {spot.tags.includes("Web検索") && <Search className="h-4 w-4 text-blue-500" />}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-3 leading-relaxed">{spot.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                          <span className="bg-white px-3 py-1 rounded-full">滞在時間: {spot.duration}分</span>
                          {spot.entrance_fee > 0 && (
                            <span className="bg-white px-3 py-1 rounded-full">入場料: {spot.entrance_fee}円</span>
                          )}
                          {spot.startTime && spot.endTime && (
                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">
                              {spot.startTime} - {spot.endTime}
                            </span>
                          )}
                        </div>
                        {spot.tips.length > 0 && (
                          <div className="mt-3 p-3 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200">
                            <div className="flex items-start gap-2">
                              <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-xs">💡</span>
                              </div>
                              <p className="text-xs text-yellow-800 font-medium">{spot.tips[0]}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {availableCoupons.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-accent/10 rounded-lg">
                  <Gift className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium text-accent-foreground">
                    特典クーポンを{availableCoupons.length}枚獲得しました！
                  </span>
                </div>
              )}

              {routeInfo.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-card-foreground">移動情報</h4>
                  {routeInfo.map((segment: any, index: number) => (
                    <div key={index} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-card-foreground">
                          {segment.from.name} → {segment.to.name}
                        </span>
                        {segment.recommended && (
                          <span className="text-xs text-accent font-medium">
                            {segment.recommended.duration}
                          </span>
                        )}
                      </div>
                      {segment.recommended && (
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">
                            {segment.recommended.method === "transit" ? "🚌 公共交通機関" : 
                             segment.recommended.method === "walking" ? "🚶 徒歩" : "❓ 不明"}
                          </span>
                          <span className="ml-2">{segment.recommended.reason}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {availableCoupons.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground text-lg">獲得クーポン</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {availableCoupons.slice(0, 3).map((coupon) => (
                  <div key={coupon.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <h5 className="font-medium text-card-foreground text-sm">{coupon.title}</h5>
                      <p className="text-xs text-muted-foreground">{coupon.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-accent">{coupon.discount}</div>
                      <div className="text-xs text-muted-foreground">〜{coupon.validUntil}</div>
                    </div>
                  </div>
                ))}
                <Button onClick={() => setShowCoupons(true)} variant="outline" className="w-full">
                  <Ticket className="h-4 w-4 mr-2" />
                  すべてのクーポンを見る
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <Button
              className="w-full h-14 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl shadow-lg transform transition-all duration-200 hover:scale-105"
              onClick={() => setCurrentView('map')}
            >
              <MapPin className="h-5 w-5 mr-3" />
              <span className="font-semibold text-lg">地図で詳細ルートを見る</span>
            </Button>

            <Button
              variant="outline"
              className="w-full h-14 border-2 border-green-500 text-green-600 hover:bg-green-50 hover:border-green-600 rounded-2xl transition-all duration-200"
              onClick={() => setCurrentView('checkin')}
            >
              <Camera className="h-5 w-5 mr-3" />
              <span className="font-semibold text-lg">観光を開始する</span>
            </Button>
          </div>

          <Card className="bg-muted/50 border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="h-4 w-4" />
                <span>観光地を訪問してポイントを貯めよう！</span>
              </div>
            </CardContent>
          </Card>
        </div>
        <NavigationBar />
      </div>
    )
  }

  if (currentView === 'diagnosis') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="max-w-md mx-auto p-4 space-y-6 pb-20">
        <div className="text-center space-y-4 pt-8">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <MapPin className="h-8 w-8 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">{currentStep + 1}</span>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              江ノ島・鎌倉観光ガイド
            </h1>
            <p className="text-gray-600 mt-2">あなたにぴったりの観光プランを診断します</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm text-gray-600">
            <span className="font-medium">診断進行状況</span>
            <span className="bg-white/60 backdrop-blur-sm px-3 py-1 rounded-full">
              {currentStep + 1} / {steps.length}
            </span>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-full p-1">
            <Progress value={progress} className="h-3 rounded-full" />
          </div>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-3xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-green-500 text-white p-6">
            <CardTitle className="text-xl">{steps[currentStep].title}</CardTitle>
            {steps[currentStep].isCustomInput && (
              <CardDescription className="text-blue-100 mt-2">
                データベースにない場所でも、Web検索でサポートします（任意）
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="p-6">
            {steps[currentStep].isCustomInput ? (
              <div className="space-y-4">
                <Input
                  placeholder={
                    steps[currentStep].key === "customStartLocation" 
                      ? "例: 新宿駅、横浜駅、自宅住所など"
                      : steps[currentStep].key === "whatToDo"
                      ? "例: 写真をたくさん撮りたい、美味しいものを食べたい、歴史を学びたいなど"
                      : "例: 江島神社の奥津宮、鎌倉文学館など"
                  }
                  value={
                    steps[currentStep].key === "customStartLocation" 
                      ? diagnosisData.customStartLocation || ""
                      : steps[currentStep].key === "whatToDo"
                      ? diagnosisData.whatToDo || ""
                      : diagnosisData.customSpot || ""
                  }
                  onChange={(e) => {
                    if (steps[currentStep].key === "customStartLocation") {
                      handleCustomStartLocationChange(e.target.value)
                    } else if (steps[currentStep].key === "whatToDo") {
                      handleWhatToDoChange(e.target.value)
                    } else {
                      handleCustomInputChange(e.target.value)
                    }
                  }}
                  className="w-full h-12 rounded-2xl border-2 border-gray-200 focus:border-blue-500 transition-colors"
                />
                <p className="text-xs text-gray-500 text-center">
                  {steps[currentStep].isOptional && "（任意項目）"}
                  {steps[currentStep].key === "customStartLocation" 
                    ? "開始場所を自由に記述してください"
                    : "空欄のままでも診断結果に基づいたおすすめプランを提案します"
                  }
                </p>
              </div>
            ) : steps[currentStep].isTimeInput ? (
              <div className="space-y-4">
                <Input
                  type="time"
                  value={
                    steps[currentStep].key === "endTime" 
                      ? diagnosisData.endTime || ""
                      : diagnosisData.startTime || ""
                  }
                  onChange={(e) => {
                    if (steps[currentStep].key === "endTime") {
                      handleEndTimeInputChange(e.target.value)
                    } else {
                      handleTimeInputChange(e.target.value)
                    }
                  }}
                  className="w-full h-12 rounded-2xl border-2 border-gray-200 focus:border-blue-500 transition-colors text-center text-lg"
                />
                <p className="text-xs text-gray-500 text-center">
                  {steps[currentStep].key === "endTime" 
                    ? "帰路につく時間を選択してください"
                    : "観光を開始したい時間を選択してください"
                  }
                </p>
              </div>
            ) : (
              <RadioGroup
                value={diagnosisData[steps[currentStep].key] as string}
                onValueChange={handleOptionChange}
                className="space-y-3"
              >
                {steps[currentStep].options.map((option) => (
                  <div key={option.value}>
                    <RadioGroupItem 
                      value={option.value} 
                      id={option.value} 
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={option.value}
                      className="flex items-center space-x-4 p-4 rounded-2xl border-2 border-gray-200 peer-data-[state=checked]:border-blue-300 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all duration-200"
                    >
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-500 flex items-center justify-center transition-colors">
                        <div className="w-2 h-2 rounded-full bg-white opacity-0 peer-data-[state=checked]:opacity-100 transition-opacity"></div>
                      </div>
                      <span className="text-gray-700 font-medium flex-1 peer-data-[state=checked]:text-blue-500 transition-colors">{option.label}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={handlePrevious}
              className="flex-1 h-12 rounded-2xl border-2 border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
              disabled={isGeneratingPlan}
            >
              戻る
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={
              (!diagnosisData[steps[currentStep].key] && !steps[currentStep].isCustomInput && !steps[currentStep].isOptional) || 
              isGeneratingPlan
            }
            className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white rounded-2xl shadow-lg transform transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:transform-none"
          >
            {isGeneratingPlan ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>AI生成中...</span>
              </div>
            ) : currentStep === steps.length - 1 ? (
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                <span>診断結果を見る</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>次へ</span>
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            )}
          </Button>
        </div>

        {currentStep === 0 && (
          <Card className="bg-muted/50 border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground text-center">
                簡単な質問にお答えいただくだけで、あなたの好みに合った観光プランをご提案します。 所要時間は約1分です。
              </p>
            </CardContent>
          </Card>
        )}
        <NavigationBar />
      </div>
    </div>
  );
}
}