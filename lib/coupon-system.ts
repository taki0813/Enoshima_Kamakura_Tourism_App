export interface UserCoupon {
  id: string
  couponId: string
  title: string
  description: string
  discount: string
  validUntil: string
  spotId: string
  spotName: string
  isUsed: boolean
  obtainedAt: number
  usedAt?: number
  category: "check-in" | "milestone" | "completion" | "special" | "instant"
  isInstant?: boolean
}

export interface RewardTier {
  percentage: number
  title: string
  description: string
  coupons: number
  specialReward?: string
}

export const REWARD_TIERS: RewardTier[] = [
  {
    percentage: 25,
    title: "25%達成",
    description: "観光スタート記念",
    coupons: 1,
  },
  {
    percentage: 50,
    title: "50%達成",
    description: "中間地点到達",
    coupons: 2,
  },
  {
    percentage: 75,
    title: "75%達成",
    description: "もうすぐゴール",
    coupons: 3,
  },
  {
    percentage: 100,
    title: "コンプリート",
    description: "全スポット制覇",
    coupons: 5,
    specialReward: "次回訪問時20%OFFクーポン",
  },
]

// Generate milestone reward coupons
export function generateMilestoneCoupons(percentage: number): UserCoupon[] {
  const tier = REWARD_TIERS.find((t) => t.percentage === percentage)
  if (!tier) return []

  const baseCoupons: Omit<UserCoupon, "id" | "obtainedAt">[] = [
    {
      couponId: `milestone-${percentage}-food`,
      title: "江ノ島グルメクーポン",
      description: "対象レストランで10%OFF",
      discount: "10%OFF",
      validUntil: "2024-12-31",
      spotId: "general",
      spotName: "江ノ島エリア",
      isUsed: false,
      category: percentage === 100 ? "completion" : "milestone",
    },
    {
      couponId: `milestone-${percentage}-souvenir`,
      title: "お土産ショップ割引券",
      description: "小町通りお土産店で5%OFF",
      discount: "5%OFF",
      validUntil: "2024-12-31",
      spotId: "komachi-street",
      spotName: "小町通り",
      isUsed: false,
      category: percentage === 100 ? "completion" : "milestone",
    },
  ]

  if (percentage >= 50) {
    baseCoupons.push({
      couponId: `milestone-${percentage}-transport`,
      title: "江ノ電乗車券割引",
      description: "江ノ電1日乗車券100円OFF",
      discount: "100円OFF",
      validUntil: "2024-12-31",
      spotId: "general",
      spotName: "江ノ電全線",
      isUsed: false,
      category: percentage === 100 ? "completion" : "milestone",
    })
  }

  if (percentage >= 75) {
    baseCoupons.push({
      couponId: `milestone-${percentage}-activity`,
      title: "アクティビティ割引券",
      description: "江ノ島アイランドスパ入場料15%OFF",
      discount: "15%OFF",
      validUntil: "2024-12-31",
      spotId: "enoshima-spa",
      spotName: "江ノ島アイランドスパ",
      isUsed: false,
      category: percentage === 100 ? "completion" : "milestone",
    })
  }

  if (percentage === 100) {
    baseCoupons.push({
      couponId: "completion-special",
      title: "次回訪問特別割引券",
      description: "次回江ノ島・鎌倉観光で使える20%OFF券",
      discount: "20%OFF",
      validUntil: "2025-12-31",
      spotId: "general",
      spotName: "江ノ島・鎌倉エリア",
      isUsed: false,
      category: "completion",
    })
  }

  return baseCoupons.slice(0, tier.coupons).map((coupon) => ({
    ...coupon,
    id: generateCouponId(),
    obtainedAt: Date.now(),
  }))
}

// Generate check-in reward coupons from tourist spots
export function generateCheckInCoupons(
  spotId: string,
  spotCoupons: Array<{
    id: string
    title: string
    description: string
    discount: string
    validUntil: string
    spotId: string
  }>,
): UserCoupon[] {
  return spotCoupons.map((coupon) => ({
    id: generateCouponId(),
    couponId: coupon.id,
    title: coupon.title,
    description: coupon.description,
    discount: coupon.discount,
    validUntil: coupon.validUntil,
    spotId: coupon.spotId,
    spotName: getSpotNameById(coupon.spotId),
    isUsed: false,
    obtainedAt: Date.now(),
    category: "check-in" as const,
  }))
}

function generateCouponId(): string {
  return "coupon_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
}

function getSpotNameById(spotId: string): string {
  const spotNames: Record<string, string> = {
    "enoshima-shrine": "江島神社",
    "enoshima-sea-candle": "江ノ島シーキャンドル",
    "enoshima-aquarium": "新江ノ島水族館",
    "kamakura-daibutsu": "鎌倉大仏",
    "hasedera-temple": "長谷寺",
    "tsurugaoka-hachimangu": "鶴岡八幡宮",
    "komachi-street": "小町通り",
    "hokokuji-temple": "報国寺",
    general: "全エリア",
  }
  return spotNames[spotId] || "観光スポット"
}

// Coupon management functions
export function saveUserCoupons(userId: string, coupons: UserCoupon[]): void {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(`user_coupons_${userId}`, JSON.stringify(coupons))
}

export function loadUserCoupons(userId: string): UserCoupon[] {
  if (typeof localStorage === "undefined") return []
  const saved = localStorage.getItem(`user_coupons_${userId}`)
  return saved ? JSON.parse(saved) : []
}

export function addCouponsToUser(userId: string, newCoupons: UserCoupon[]): UserCoupon[] {
  const existingCoupons = loadUserCoupons(userId)
  const updatedCoupons = [...existingCoupons, ...newCoupons]
  saveUserCoupons(userId, updatedCoupons)
  return updatedCoupons
}

export function useCoupon(userId: string, couponId: string): boolean {
  const coupons = loadUserCoupons(userId)
  const couponIndex = coupons.findIndex((c) => c.id === couponId && !c.isUsed)

  if (couponIndex === -1) return false

  coupons[couponIndex].isUsed = true
  coupons[couponIndex].usedAt = Date.now()
  saveUserCoupons(userId, coupons)
  return true
}

export function getAvailableCoupons(userId: string, filterSpotIds?: string[]): UserCoupon[] {
  const list = loadUserCoupons(userId).filter((coupon) => !coupon.isUsed)
  if (!filterSpotIds || filterSpotIds.length === 0) return list
  const allow = new Set(filterSpotIds)
  return list.filter((c) => c.spotId && allow.has(c.spotId))
}

export function getUsedCoupons(userId: string): UserCoupon[] {
  return loadUserCoupons(userId).filter((coupon) => coupon.isUsed)
}

export function getCouponsByCategory(userId: string, category: UserCoupon["category"]): UserCoupon[] {
  return loadUserCoupons(userId).filter((coupon) => coupon.category === category)
}

// Check if user has reached a new milestone and award coupons
export function checkAndAwardMilestoneCoupons(
  userId: string,
  oldPercentage: number,
  newPercentage: number,
): UserCoupon[] {
  const newCoupons: UserCoupon[] = []

  for (const tier of REWARD_TIERS) {
    if (oldPercentage < tier.percentage && newPercentage >= tier.percentage) {
      const milestoneCoupons = generateMilestoneCoupons(tier.percentage)
      newCoupons.push(...milestoneCoupons)
    }
  }

  if (newCoupons.length > 0) {
    addCouponsToUser(userId, newCoupons)
  }

  return newCoupons
}

// Validate coupon before use
export function validateCoupon(coupon: UserCoupon): { valid: boolean; message: string } {
  if (coupon.isUsed) {
    return { valid: false, message: "このクーポンは既に使用済みです" }
  }

  const validUntil = new Date(coupon.validUntil)
  const now = new Date()

  if (now > validUntil) {
    return { valid: false, message: "このクーポンは有効期限が切れています" }
  }

  return { valid: true, message: "このクーポンは使用可能です" }
}

// ルート開始時に即座に獲得できるクーポンを生成
export function generateInstantCoupons(tourPlan: any[]): UserCoupon[] {
  const instantCoupons: UserCoupon[] = []

  // 観光スポット数に基づくクーポン
  if (tourPlan.length >= 3) {
    instantCoupons.push({
      id: generateCouponId(),
      couponId: `instant-route-${Date.now()}`,
      title: "ルート達成クーポン",
      description: "3箇所以上の観光スポットを巡るルートを選択しました",
      discount: "10%割引",
      validUntil: "2024-12-31",
      spotId: "general",
      spotName: "江ノ島・鎌倉エリア",
      isUsed: false,
      obtainedAt: Date.now(),
      category: "instant",
      isInstant: true,
    })
  }

  // エリア別クーポン
  const hasEnoshima = tourPlan.some((spot: any) => spot.area === "enoshima")
  const hasKamakura = tourPlan.some((spot: any) => spot.area === "kamakura")

  if (hasEnoshima && hasKamakura) {
    instantCoupons.push({
      id: generateCouponId(),
      couponId: `instant-area-${Date.now()}`,
      title: "江ノ島・鎌倉両方巡りクーポン",
      description: "江ノ島と鎌倉の両方を巡るルートを選択しました",
      discount: "15%割引",
      validUntil: "2024-12-31",
      spotId: "general",
      spotName: "江ノ島・鎌倉エリア",
      isUsed: false,
      obtainedAt: Date.now(),
      category: "instant",
      isInstant: true,
    })
  }

  // カテゴリ別クーポン
  const categories = [...new Set(tourPlan.map((spot: any) => spot.category))]
  if (categories.includes("food")) {
    instantCoupons.push({
      id: generateCouponId(),
      couponId: `instant-food-${Date.now()}`,
      title: "グルメスポット巡りクーポン",
      description: "グルメスポットを含むルートを選択しました",
      discount: "500円割引",
      validUntil: "2024-12-31",
      spotId: "general",
      spotName: "江ノ島・鎌倉エリア",
      isUsed: false,
      obtainedAt: Date.now(),
      category: "instant",
      isInstant: true,
    })
  }

  return instantCoupons
}