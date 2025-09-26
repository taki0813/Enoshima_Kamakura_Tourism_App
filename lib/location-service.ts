// Enoshima_Kamakura_Tourism_App/lib/location-service.ts

export interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

export interface CheckInResult {
  success: boolean
  spotId?: string
  spotName?: string
  distance?: number
  message: string
}

// Calculate distance between two coordinates using Haversine formula
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

// Get user's current location
export function getCurrentLocation(): Promise<LocationData> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("位置情報サービスがサポートされていません"))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
        })
      },
      (error) => {
        let message = "位置情報の取得に失敗しました"
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "位置情報の使用が許可されていません"
            break
          case error.POSITION_UNAVAILABLE:
            message = "位置情報が利用できません"
            break
          case error.TIMEOUT:
            message = "位置情報の取得がタイムアウトしました"
            break
        }
        reject(new Error(message))
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    )
  })
}

// Check if user is within check-in range of any tourist spot
export function checkLocationForCheckIn(
  userLocation: LocationData,
  tourPlan: Array<{ id: string; name: string; coordinates: { lat: number; lng: number } }>,
): CheckInResult {
  const CHECK_IN_RADIUS = 100 // 100 meters radius for check-in

  for (const spot of tourPlan) {
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      spot.coordinates.lat,
      spot.coordinates.lng,
    )

    if (distance <= CHECK_IN_RADIUS) {
      return {
        success: true,
        spotId: spot.id,
        spotName: spot.name,
        distance: Math.round(distance),
        message: `${spot.name}にチェックインしました！`,
      }
    }
  }

  // Find closest spot for feedback
  let closestSpot = tourPlan[0]
  let closestDistance = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    tourPlan[0].coordinates.lat,
    tourPlan[0].coordinates.lng,
  )

  for (const spot of tourPlan.slice(1)) {
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      spot.coordinates.lat,
      spot.coordinates.lng,
    )
    if (distance < closestDistance) {
      closestDistance = distance
      closestSpot = spot
    }
  }

  return {
    success: false,
    distance: Math.round(closestDistance),
    message: `最寄りの観光地「${closestSpot.name}」まで約${Math.round(closestDistance)}mです`,
  }
}

// Progress tracking
export interface TourProgress {
  visitedSpots: string[]
  totalSpots: number
  completionPercentage: number
  points: number
}

export function updateTourProgress(currentProgress: TourProgress, checkedInSpotId: string): TourProgress {
  if (currentProgress.visitedSpots.includes(checkedInSpotId)) {
    return currentProgress // Already visited
  }

  const newVisitedSpots = [...currentProgress.visitedSpots, checkedInSpotId]
  const completionPercentage = (newVisitedSpots.length / currentProgress.totalSpots) * 100
  const points = currentProgress.points + 100 // 100 points per spot

  return {
    visitedSpots: newVisitedSpots,
    totalSpots: currentProgress.totalSpots,
    completionPercentage,
    points,
  }
}

// Cookie management for user tracking
export function getUserId(): string {
  if (typeof document === "undefined") return ""

  const cookies = document.cookie.split(";")
  const userIdCookie = cookies.find((cookie) => cookie.trim().startsWith("tourism_user_id="))

  if (userIdCookie) {
    return userIdCookie.split("=")[1]
  }

  // Generate new user ID
  const newUserId = "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
  document.cookie = `tourism_user_id=${newUserId}; path=/; max-age=${365 * 24 * 60 * 60}` // 1 year
  return newUserId
}

export function saveTourProgress(userId: string, progress: TourProgress): void {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(`tour_progress_${userId}`, JSON.stringify(progress))
}

export function loadTourProgress(userId: string, totalSpots: number): TourProgress {
  if (typeof localStorage === "undefined") {
    return {
      visitedSpots: [],
      totalSpots,
      completionPercentage: 0,
      points: 0,
    }
  }

  const saved = localStorage.getItem(`tour_progress_${userId}`)
  if (saved) {
    const progress = JSON.parse(saved)
    return {
      ...progress,
      totalSpots, // Update total spots in case tour plan changed
    }
  }

  return {
    visitedSpots: [],
    totalSpots,
    completionPercentage: 0,
    points: 0,
  }

}
export async function getCoordinatesFromAddress(address: string): Promise<{ lat: number, lng: number } | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error("Google Maps API key not configured for geocoding.");
    return null;
  }

  const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

  try {
      const response = await fetch(geocodeUrl);
      const data = await response.json();

      if (data.status === "OK" && data.results.length > 0) {
          const location = data.results[0].geometry.location;
          return { lat: location.lat, lng: location.lng };
      }
      return null;
  } catch (error) {
      console.error("Geocoding failed:", error);
      return null;
  }
}