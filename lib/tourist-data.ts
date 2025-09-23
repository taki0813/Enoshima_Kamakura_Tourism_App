// NOTE: Do not import Prisma here to avoid bundling it in the browser.

export interface TouristSpot {
  id: string
  name: string
  description: string
  area: "enoshima" | "kamakura"
  category: "shrine" | "temple" | "nature" | "culture" | "food" | "shopping" | "activity"
  tags: string[]
  duration: number // minutes
  difficulty: "easy" | "moderate" | "hard"
  coordinates: {
    lat: number
    lng: number
  }
  openHours: string
  bestVisitTime?: string | null
  entrance_fee: number
  image: string
  tips: string[]
  coupons: Coupon[]
}

export interface Coupon {
  id: string
  title: string
  description: string
  discount: string
  validUntil: string
  spotId: string
}

// DBから全スポットを取得
export async function getAllSpots(): Promise<TouristSpot[]> {
  const res = await fetch('/api/spots', { method: 'GET' })
  if (!res.ok) throw new Error('Failed to load spots')
  return await res.json()
}

function safeParseArray(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// 観光プランを生成する関数 (データベースからデータを取得するように変更)
export async function generateTourPlan(diagnosisData: {
  gender: string
  age: string
  mustVisit: string
  travelStyle: string
}): Promise<TouristSpot[]> {
  const allSpots = await getAllSpots();
  let filteredSpots = [...allSpots];

  // Filter by area preference
  if (diagnosisData.mustVisit === "enoshima") {
    filteredSpots = filteredSpots.filter((spot) => spot.area === "enoshima")
  } else if (diagnosisData.mustVisit === "kamakura") {
    filteredSpots = filteredSpots.filter((spot) => spot.area === "kamakura")
  }

  // Score spots based on travel style and demographics
  const scoredSpots = filteredSpots.map((spot) => {
    let score = 0

    // Travel style scoring
    switch (diagnosisData.travelStyle) {
      case "relaxed":
        if (spot.tags.includes("癒し") || spot.tags.includes("庭園") || spot.tags.includes("静寂")) score += 3
        if (spot.difficulty === "easy") score += 2
        if (spot.duration <= 60) score += 1
        break
      case "active":
        if (spot.tags.includes("アクティブ") || spot.tags.includes("マリンスポーツ") || spot.tags.includes("活動"))
          score += 3
        if (spot.difficulty === "moderate" || spot.difficulty === "hard") score += 2
        if (spot.duration >= 90) score += 1
        break
      case "cultural":
        if (spot.tags.includes("歴史") || spot.tags.includes("文化財") || spot.tags.includes("武士")) score += 3
        if (spot.category === "temple" || spot.category === "shrine") score += 2
        break
      case "gourmet":
        if (spot.tags.includes("グルメ") || spot.tags.includes("食べ歩き")) score += 3
        if (spot.category === "food" || spot.category === "shopping") score += 2
        break
    }

    // Age-based scoring
    switch (diagnosisData.age) {
      case "10s":
      case "20s":
        if (spot.tags.includes("若者向け") || spot.tags.includes("インスタ映え") || spot.tags.includes("写真映え"))
          score += 2
        break
      case "30s":
      case "40s":
        if (spot.tags.includes("カップル") || spot.tags.includes("デート")) score += 2
        break
      case "50s":
        if (spot.tags.includes("大人向け") || spot.tags.includes("静寂") || spot.tags.includes("歴史")) score += 2
        break
    }

    // Gender-based scoring
    if (diagnosisData.gender === "female") {
      if (spot.tags.includes("女性人気") || spot.tags.includes("縁結び") || spot.tags.includes("花")) score += 1
    }

    return { ...spot, score }
  })

  // Sort by score and select top spots
  const selectedSpots = scoredSpots
    .sort((a, b) => b.score - a.score)
    .slice(0, diagnosisData.mustVisit === "both" ? 5 : 4)

  // Ensure variety in categories
  const finalSpots: TouristSpot[] = []
  const usedCategories = new Set<string>()

  for (const spot of selectedSpots) {
    if (finalSpots.length < 3 || !usedCategories.has(spot.category)) {
      finalSpots.push(spot)
      usedCategories.add(spot.category)
    }
    if (finalSpots.length >= 4) break
  }

  return finalSpots
}

export function getAvailableCoupons(spots: TouristSpot[]): Coupon[] {
  return spots.flatMap((spot) => spot.coupons)
}

export function calculateTourDuration(spots: TouristSpot[]): number {
  const totalSpotTime = spots.reduce((total, spot) => total + spot.duration, 0)
  const travelTime = (spots.length - 1) * 30 // 30 minutes between spots
  return totalSpotTime + travelTime
}

// 時間ベースの観光プランを生成
export function generateTimeBasedTourPlan(spots: TouristSpot[], startTime: string, startLocation: string): any[] {
  const startDateTime = new Date(`2024-01-01T${startTime}:00`)
  const timeBasedPlan = []
  let currentTime = new Date(startDateTime)

  // bestVisitTime を優先して並び替え（morning -> afternoon -> evening の順に開始時間へ揃える）
  let reorderedSpots = [...spots]
  const priority: Record<string, number> = { morning: 0, afternoon: 1, evening: 2 }
  reorderedSpots.sort((a, b) => (priority[a.bestVisitTime || ''] ?? 99) - (priority[b.bestVisitTime || ''] ?? 99))

  // 開始地点から最初のスポットへの移動時間を考慮
  const firstSpot = reorderedSpots[0]
  const travelTimeToFirst = getTravelTimeToFirstSpot(startLocation, firstSpot.area)
  currentTime.setMinutes(currentTime.getMinutes() + travelTimeToFirst)

  reorderedSpots.forEach((spot, index) => {
    const spotStartTime = new Date(currentTime)
    const spotEndTime = new Date(currentTime)
    spotEndTime.setMinutes(spotEndTime.getMinutes() + spot.duration)

    timeBasedPlan.push({
      ...spot,
      startTime: spotStartTime.toTimeString().slice(0, 5),
      endTime: spotEndTime.toTimeString().slice(0, 5),
      order: index + 1,
    })

    // 次のスポットへの移動時間を計算
    if (index < reorderedSpots.length - 1) {
      const nextSpot = reorderedSpots[index + 1]
      const travelTime = getTravelTimeBetweenSpots(spot, nextSpot)
      currentTime = new Date(spotEndTime)
      currentTime.setMinutes(currentTime.getMinutes() + travelTime)
    }
  })

  return timeBasedPlan
}

// 開始地点から最初のスポットへの移動時間を取得
function getTravelTimeToFirstSpot(startLocation: string, spotArea: string): number {
  const travelTimes: Record<string, Record<string, number>> = {
    "enoshima_station": {
      "enoshima": 10,
      "kamakura": 25,
    },
    "kamakura_station": {
      "enoshima": 25,
      "kamakura": 5,
    },
    "fujisawa_station": {
      "enoshima": 15,
      "kamakura": 20,
    },
  }

  return travelTimes[startLocation]?.[spotArea] || 20
}

// スポット間の移動時間を取得
function getTravelTimeBetweenSpots(fromSpot: TouristSpot, toSpot: TouristSpot): number {
  // 同じエリア内の場合は短時間
  if (fromSpot.area === toSpot.area) {
    return 15
  }
  
  // 異なるエリアの場合は長時間
  return 30
}

// スポット間のルート情報を取得
export async function getSpotRouteInfo(spots: TouristSpot[]): Promise<any> {
  try {
    const response = await fetch("/api/spot-route", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ spots }),
    })

    if (!response.ok) {
      console.warn("Spot route info failed:", response.status)
      return null
    }

    const data = await response.json()

    if (data.success && data.routeSegments) {
      return data.routeSegments
    }

    return null
  } catch (error) {
    console.warn("Spot route info failed:", error)
    return null
  }
}

// やりたいことから観光スポットを検索
export async function searchSpotsByWhatToDo(whatToDo: string, area: string, preferences: string): Promise<TouristSpot[]> {
  try {
    const response = await fetch("/api/process-what-to-do", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ whatToDo, area, preferences }),
    })

    if (!response.ok) {
      console.warn("What-to-do search failed:", response.status)
      return []
    }

    const data = await response.json()

    if (data.success && data.spots) {
      return data.spots.map((spot: any) => ({
        ...spot,
        id: `what-to-do-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        area: area,
        tags: [...spot.tags, "やりたいこと", "Web検索"],
      }))
    }

    return []
  } catch (error) {
    console.warn("What-to-do search failed:", error)
    return []
  }
}

export async function searchWebForTouristSpot(spotName: string, area: string): Promise<TouristSpot | null> {
  try {
    const response = await fetch("/api/search-spot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ spotName, area }),
    })

    if (!response.ok) {
      console.warn(`Web search failed for ${spotName}: ${response.status}`)
      return null
    }

    const data = await response.json()

    if (data.success && data.spot) {
      return {
        id: `web-${Date.now()}`,
        name: data.spot.name || spotName,
        description: data.spot.description || `${spotName}の詳細情報`,
        area: data.spot.area as "enoshima" | "kamakura",
        category: data.spot.category || "culture",
        tags: ["Web検索", "追加スポット", ...(data.spot.tags || [])],
        duration: data.spot.duration || 60,
        difficulty: data.spot.difficulty || "easy",
        coordinates: data.spot.coordinates || {
          lat: area === "enoshima" ? 35.2993 : 35.3167,
          lng: area === "enoshima" ? 139.4804 : 139.5358,
        },
        openHours: data.spot.openHours || "要確認",
        entrance_fee: data.spot.entrance_fee || 0,
        image: "/placeholder.svg?height=200&width=300&query=" + encodeURIComponent(spotName),
        tips: data.spot.tips || ["Webから検索された追加スポットです", "詳細は現地で確認してください"],
        coupons: [],
      }
    }

    return null
  } catch (error) {
    console.warn("Web search failed:", error)
    return null
  }
}

// 抽象的なカテゴリでスポットを検索する関数
export async function searchSpotsByCategory(category: string, area: string, preferences?: string): Promise<TouristSpot[]> {
  try {
    const response = await fetch("/api/search-category", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ category, area, preferences }),
    })

    if (!response.ok) {
      console.warn(`Category search failed for ${category}: ${response.status}`)
      return []
    }

    const data = await response.json()

    if (data.success && data.spots) {
      return data.spots.map((spot: any, index: number) => ({
        id: `category-${Date.now()}-${index}`,
        name: spot.name,
        description: spot.description,
        area: area as "enoshima" | "kamakura",
        category: spot.category,
        tags: ["カテゴリ検索", ...(spot.tags || [])],
        duration: spot.duration || 60,
        difficulty: spot.difficulty || "easy",
        coordinates: spot.coordinates || {
          lat: area === "enoshima" ? 35.2993 : 35.3167,
          lng: area === "enoshima" ? 139.4804 : 139.5358,
        },
        openHours: spot.openHours || "要確認",
        entrance_fee: spot.entrance_fee || 0,
        image: "/placeholder.svg?height=200&width=300&query=" + encodeURIComponent(spot.name),
        tips: spot.tips || [],
        coupons: [],
        reason: spot.reason || "おすすめスポットです",
      }))
    }

    return []
  } catch (error) {
    console.warn("Category search failed:", error)
    return []
  }
}

// ルート情報を取得する関数
export async function getRouteInfo(origin: string, destination: string, mode: string = "transit"): Promise<any> {
  try {
    const response = await fetch("/api/route-info", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ origin, destination, mode }),
    })

    if (!response.ok) {
      console.warn(`Route info failed: ${response.status}`)
      return null
    }

    const data = await response.json()

    if (data.success && data.routeInfo) {
      return data.routeInfo
    }

    return null
  } catch (error) {
    console.warn("Route info failed:", error)
    return null
  }
}

export async function generateEnhancedTourPlan(diagnosisData: {
  gender: string
  age: string
  mustVisit: string
  travelStyle: string
  interests: string[]
  customSpot?: string
  whatToDo?: string
}): Promise<TouristSpot[]> {
  const basePlan = await generateTourPlan(diagnosisData)
  const enhancedPlan: TouristSpot[] = []

  if (diagnosisData.customSpot) {
    // Ask API to find an existing spot by name (server executes Prisma)
    const existingResp = await fetch('/api/spots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ searchName: diagnosisData.customSpot }) })
    const existingJson = await existingResp.json().catch(() => ({} as any))
    const existingSpot = existingJson?.spot as any | null
    if (existingSpot) {
      const index = basePlan.findIndex(s => s.id === existingSpot.id);
      if (index === -1) {
        enhancedPlan.push(existingSpot as any);
      } else {
        enhancedPlan.push(...basePlan);
      }
    } else {
      const webSpot = await searchWebForTouristSpot(
        diagnosisData.customSpot,
        diagnosisData.mustVisit === "enoshima" ? "enoshima" : 
        diagnosisData.mustVisit === "kamakura" ? "kamakura" : "enoshima"
      )
      if (webSpot) {
        enhancedPlan.push(webSpot)
      }
    }
  }

  enhancedPlan.push(...basePlan)

  const area = diagnosisData.mustVisit === "both" ? "kamakura" : diagnosisData.mustVisit
  const preferences = `${diagnosisData.gender}、${diagnosisData.age}、${diagnosisData.travelStyle}`

  if (diagnosisData.travelStyle === "gourmet") {
    const foodSpots = await searchSpotsByCategory("グルメ・カフェ", area, preferences)
    enhancedPlan.push(...foodSpots.slice(0, 2))
  } else if (diagnosisData.travelStyle === "cultural") {
    const culturalSpots = await searchSpotsByCategory("文化・歴史", area, preferences)
    enhancedPlan.push(...culturalSpots.slice(0, 2))
  } else if (diagnosisData.travelStyle === "active") {
    const activeSpots = await searchSpotsByCategory("アクティビティ", area, preferences)
    enhancedPlan.push(...activeSpots.slice(0, 2))
  }

  for (const interest of diagnosisData.interests) {
    const interestSpots = await searchSpotsByCategory(interest, area, preferences)
    enhancedPlan.push(...interestSpots.slice(0, 1))
  }

  if (diagnosisData.whatToDo) {
    const whatToDoSpots = await searchSpotsByWhatToDo(
      diagnosisData.whatToDo, 
      area, 
      preferences
    )
    enhancedPlan.push(...whatToDoSpots.slice(0, 2))
  }

  const uniqueSpots = enhancedPlan.filter((spot, index, self) =>
    index === self.findIndex(s => s.name === spot.name)
  )

  return uniqueSpots.slice(0, 8)
}