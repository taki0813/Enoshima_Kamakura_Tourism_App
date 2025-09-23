import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { origin, destination, mode = "transit" } = await request.json()

    if (!origin || !destination) {
      return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 })
    }

    // Prefer server-only key if provided
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!googleMapsApiKey) {
      return NextResponse.json({ 
        success: false, 
        error: "Google Maps API key not configured" 
      }, { status: 500 })
    }

    // Google Maps Directions APIを使用してルート情報を取得（公共交通機関の時刻・運賃のために出発時刻=nowを付与）
    const departureTime = Math.floor(Date.now() / 1000)
    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=${mode}&departure_time=${departureTime}&key=${googleMapsApiKey}&language=ja`

    const response = await fetch(directionsUrl, {
      method: "GET",
      signal: AbortSignal.timeout(10000), // 10秒のタイムアウト
    })

    if (!response.ok) {
      throw new Error(`Google Maps API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.status !== "OK") {
      return NextResponse.json({ 
        success: false, 
        error: `Google Maps API error: ${data.status}` 
      }, { status: 400 })
    }

    const route = data.routes[0]
    const leg = route.legs[0]

    // 交通機関の詳細情報を抽出
    const transitInfo = {
      duration: leg.duration.text,
      durationValue: leg.duration.value, // 秒単位
      distance: leg.distance.text,
      distanceValue: leg.distance.value, // メートル単位
      fare: (route.fare && route.fare.text) ? route.fare.text : null,
      steps: leg.steps.map((step: any) => ({
        instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // HTMLタグを除去
        duration: step.duration?.text || "不明",
        distance: step.distance?.text || "不明",
        travelMode: step.travel_mode,
        transitDetails: step.transit_details ? {
          line: step.transit_details.line?.name || "不明",
          departureStop: step.transit_details.departure_stop?.name || "不明",
          arrivalStop: step.transit_details.arrival_stop?.name || "不明",
          departureTime: step.transit_details.departure_time?.text || "不明",
          arrivalTime: step.transit_details.arrival_time?.text || "不明",
          numStops: step.transit_details.num_stops || 0,
        } : null
      })),
      summary: route.summary || "ルート情報",
      warnings: route.warnings || []
    }

    return NextResponse.json({ 
      success: true, 
      routeInfo: transitInfo 
    })

  } catch (error) {
    console.error("Route info API error:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Failed to get route information" 
    }, { status: 500 })
  }
}



