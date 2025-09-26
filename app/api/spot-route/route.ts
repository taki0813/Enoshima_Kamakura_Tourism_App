import { type NextRequest, NextResponse } from "next/server"
import {prisma} from "@/lib/prisma" 

export async function POST(request: NextRequest) {
  try {
    const { spots } = await request.json()

    if (!spots || !Array.isArray(spots) || spots.length < 2) {
      return NextResponse.json({ success: false, error: "Invalid spots data" }, { status: 400 })
    }

    const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!googleMapsApiKey) {
      return NextResponse.json({ 
        success: false, 
        error: "Google Maps API key not configured" 
      }, { status: 500 })
    }

    const routeSegments = []

    // 各スポット間の移動情報を取得
    for (let i = 0; i < spots.length - 1; i++) {
      const currentSpot = spots[i]
      const nextSpot = spots[i + 1]

      try {
        const origin = `${currentSpot.coordinates.lat},${currentSpot.coordinates.lng}`
        const destination = `${nextSpot.coordinates.lat},${nextSpot.coordinates.lng}`
        const departureTime = Math.floor(Date.now() / 1000)

        // 公共交通機関でのルート情報を取得
        const transitUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=transit&departure_time=${departureTime}&key=${googleMapsApiKey}&language=ja`

        const transitResponse = await fetch(transitUrl, {
          method: "GET",
          signal: AbortSignal.timeout(10000),
        })

        const transitData = await transitResponse.json()

        // 徒歩でのルート情報も取得
        const walkingUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=walking&key=${googleMapsApiKey}&language=ja`

        const walkingResponse = await fetch(walkingUrl, {
          method: "GET",
          signal: AbortSignal.timeout(10000),
        })

        const walkingData = await walkingResponse.json()

        const segment = {
          from: {
            name: currentSpot.name,
            coordinates: currentSpot.coordinates,
          },
          to: {
            name: nextSpot.name,
            coordinates: nextSpot.coordinates,
          },
          transit: transitData.status === "OK" ? {
            duration: transitData.routes[0]?.legs[0]?.duration?.text || "不明",
            durationValue: transitData.routes[0]?.legs[0]?.duration?.value || 0,
            distance: transitData.routes[0]?.legs[0]?.distance?.text || "不明",
            fare: transitData.routes[0]?.fare?.text || null,
            steps: transitData.routes[0]?.legs[0]?.steps?.map((step: any) => ({
              instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
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
            })) || []
          } : null,
          walking: walkingData.status === "OK" ? {
            duration: walkingData.routes[0]?.legs[0]?.duration?.text || "不明",
            durationValue: walkingData.routes[0]?.legs[0]?.duration?.value || 0,
            distance: walkingData.routes[0]?.legs[0]?.distance?.text || "不明",
          } : null,
          recommended: null as any
        }

        // 推奨移動方法を決定
        if (segment.transit && segment.walking) {
          if (segment.transit.durationValue < segment.walking.durationValue) {
            segment.recommended = {
              method: "transit",
              duration: segment.transit.duration,
              reason: "公共交通機関の方が早いです"
            }
          } else if (segment.walking.durationValue < 1800) { // 30分未満
            segment.recommended = {
              method: "walking",
              duration: segment.walking.duration,
              reason: "徒歩で十分近いです"
            }
          } else {
            segment.recommended = {
              method: "transit",
              duration: segment.transit.duration,
              reason: "徒歩では時間がかかりすぎます"
            }
          }
        } else if (segment.transit) {
          segment.recommended = {
            method: "transit",
            duration: segment.transit.duration,
            reason: "公共交通機関を利用してください"
          }
        } else if (segment.walking) {
          segment.recommended = {
            method: "walking",
            duration: segment.walking.duration,
            reason: "徒歩で移動できます"
          }
        } else {
          segment.recommended = {
            method: "unknown",
            duration: "不明",
            reason: "ルート情報を取得できませんでした"
          }
        }

        routeSegments.push(segment)

      } catch (error) {
        console.error(`Error getting route from ${currentSpot.name} to ${nextSpot.name}:`, error)
        // エラーが発生した場合でも基本的な情報を提供
        routeSegments.push({
          from: {
            name: currentSpot.name,
            coordinates: currentSpot.coordinates,
          },
          to: {
            name: nextSpot.name,
            coordinates: nextSpot.coordinates,
          },
          transit: null,
          walking: null,
          recommended: {
            method: "unknown",
            duration: "不明",
            reason: "ルート情報を取得できませんでした"
          }
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      routeSegments 
    })

  } catch (error) {
    console.error("Spot route API error:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Failed to get route information" 
    }, { status: 500 })
  }
}