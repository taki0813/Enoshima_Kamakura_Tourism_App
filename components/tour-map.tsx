"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Navigation, MapPin, Clock, AlertCircle, Train, Bus, Car, Wallet } from "lucide-react"
import type { TouristSpot } from "@/lib/tourist-data"
import { getSpotRouteInfo } from "@/lib/tourist-data"

interface TourMapProps {
  tourPlan: TouristSpot[]
  onBack: () => void
}

declare global {
  interface Window {
    google: any
    initMap: () => void
  }
}

export default function TourMap({ tourPlan, onBack }: TourMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [directionsService, setDirectionsService] = useState<any>(null)
  const [directionsRenderer, setDirectionsRenderer] = useState<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [selectedSpot, setSelectedSpot] = useState<TouristSpot | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [routeSegments, setRouteSegments] = useState<any[] | null>(null)
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "demo-key"

    if (!apiKey || apiKey === "demo-key") {
      setMapError("Google Maps APIキーが設定されていません。デモモードで表示します。")
      // デモモードでも地図を表示するため、ダミーのAPIキーで続行
    }

    if (!window.google) {
      const script = document.createElement("script")
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap`
      script.async = true
      script.defer = true

      script.onerror = () => {
        setMapError("Google Maps APIの読み込みに失敗しました。APIキーを確認してください。")
        setIsLoaded(true)
      }

      window.initMap = () => {
        setIsLoaded(true)
      }

      document.head.appendChild(script)
    } else {
      setIsLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (isLoaded && mapRef.current && tourPlan.length > 0) {
      initializeMap()
      loadRouteInfo()
    }
  }, [isLoaded, tourPlan])

  const initializeMap = () => {
    if (!window.google || !mapRef.current) return

    const bounds = new window.google.maps.LatLngBounds()
    tourPlan.forEach((spot) => {
      bounds.extend(new window.google.maps.LatLng(spot.coordinates.lat, spot.coordinates.lng))
    })

    const mapInstance = new window.google.maps.Map(mapRef.current, {
      zoom: 13,
      center: bounds.getCenter(),
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
    })

    const directionsServiceInstance = new window.google.maps.DirectionsService()
    const directionsRendererInstance = new window.google.maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: "#6366f1",
        strokeWeight: 4,
        strokeOpacity: 0.8,
      },
    })

    directionsRendererInstance.setMap(mapInstance)

    setMap(mapInstance)
    setDirectionsService(directionsServiceInstance)
    setDirectionsRenderer(directionsRendererInstance)

    tourPlan.forEach((spot, index) => {
      const marker = new window.google.maps.Marker({
        position: { lat: spot.coordinates.lat, lng: spot.coordinates.lng },
        map: mapInstance,
        title: spot.name,
        label: {
          text: (index + 1).toString(),
          color: "white",
          fontWeight: "bold",
        },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: "#6366f1",
          fillOpacity: 1,
          strokeColor: "white",
          strokeWeight: 2,
          scale: 15,
        },
      })

      marker.addListener("click", () => {
        setSelectedSpot(spot)
      })
    })

    if (tourPlan.length > 1) {
      calculateRoute(directionsServiceInstance, directionsRendererInstance)
    }

    mapInstance.fitBounds(bounds)
  }

  const calculateRoute = (service: any, renderer: any) => {
    if (tourPlan.length < 2) return

    const waypoints = tourPlan.slice(1, -1).map((spot) => ({
      location: { lat: spot.coordinates.lat, lng: spot.coordinates.lng },
      stopover: true,
    }))

    const request = {
      origin: { lat: tourPlan[0].coordinates.lat, lng: tourPlan[0].coordinates.lng },
      destination: {
        lat: tourPlan[tourPlan.length - 1].coordinates.lat,
        lng: tourPlan[tourPlan.length - 1].coordinates.lng,
      },
      waypoints: waypoints,
      travelMode: window.google.maps.TravelMode.WALKING,
      optimizeWaypoints: false,
    }

    service.route(request, (result: any, status: any) => {
      if (status === "OK") {
        renderer.setDirections(result)
      }
    })
  }

  const loadRouteInfo = async () => {
    if (tourPlan.length < 2) return

    setIsLoadingRoute(true)
    try {
      const routeData = await getSpotRouteInfo(tourPlan)
      if (routeData) {
        setRouteSegments(routeData)
      }
    } catch (error) {
      console.error("Failed to load route info:", error)
    } finally {
      setIsLoadingRoute(false)
    }
  }

  const openInGoogleMaps = () => {
    const origin = `${tourPlan[0].coordinates.lat},${tourPlan[0].coordinates.lng}`
    const destination = `${tourPlan[tourPlan.length - 1].coordinates.lat},${tourPlan[tourPlan.length - 1].coordinates.lng}`
    const waypoints = tourPlan
      .slice(1, -1)
      .map((spot) => `${spot.coordinates.lat},${spot.coordinates.lng}`)
      .join("|")

    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=transit`
    window.open(url, "_blank")
  }

  const getTravelModeIcon = (mode: string) => {
    switch (mode) {
      case "transit":
        return <Train className="h-4 w-4 text-accent" />
      case "walking":
        return <Car className="h-4 w-4 text-accent" />
      default:
        return <AlertCircle className="h-4 w-4 text-accent" />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">観光ルート地図</h1>
            <p className="text-sm text-muted-foreground">{tourPlan.length}箇所の観光スポット</p>
          </div>
        </div>
      </div>

      <div className="relative">
        <div ref={mapRef} className="w-full h-[60vh] bg-muted">
          {mapError ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3 p-6">
                <AlertCircle className="h-12 w-12 text-orange-500 mx-auto" />
                <div>
                  <h3 className="font-semibold text-foreground">地図の読み込みエラー</h3>
                  <p className="text-sm text-muted-foreground mt-1">{mapError}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Google Maps APIキーを設定すると、インタラクティブな地図が表示されます
                  </p>
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm text-foreground font-medium">観光スポット一覧</p>
                    <div className="mt-2 space-y-1">
                      {tourPlan.map((spot, index) => (
                        <div key={spot.id} className="text-xs text-muted-foreground">
                          {index + 1}. {spot.name} ({spot.area === "enoshima" ? "江ノ島" : "鎌倉"})
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : !isLoaded ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary mx-auto"></div>
                <p className="text-sm text-muted-foreground">地図を読み込み中...</p>
              </div>
            </div>
          ) : null}
        </div>

        {!mapError && (
          <div className="absolute bottom-4 right-4 space-y-2">
            <Button
              onClick={openInGoogleMaps}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-lg"
              size="sm"
            >
              <Navigation className="h-4 w-4 mr-2" />
              Googleマップで開く
            </Button>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">観光スポット一覧</h2>
          {tourPlan.length > 1 && (
            <Button
              onClick={loadRouteInfo}
              disabled={isLoadingRoute}
              variant="outline"
              size="sm"
            >
              {isLoadingRoute ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Train className="h-4 w-4 mr-2" />
              )}
              交通情報を更新
            </Button>
          )}
        </div>

        {routeSegments && routeSegments.length > 0 && (
          <Card className="bg-accent/10 border-accent/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-accent-foreground text-base flex items-center gap-2">
                <Navigation className="h-4 w-4" />
                移動時間・交通機関情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {routeSegments.map((segment: any, index: number) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-accent-foreground">
                    {segment.recommended?.method && getTravelModeIcon(segment.recommended.method)}
                    <span>
                      {segment.from.name} → {segment.to.name}
                    </span>
                    <span className="text-xs font-normal ml-auto opacity-75">
                      約 {segment.recommended?.duration || "不明"}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-lg">
                    {segment.recommended?.method === "transit" && segment.transit?.steps && segment.transit.steps.length > 0 ? (
                      <div className="space-y-3">
                        {segment.transit?.fare && (
                          <div className="flex items-center gap-2 text-sm text-card-foreground">
                            <Wallet className="h-4 w-4 text-green-600" />
                            <span>運賃: {segment.transit.fare}</span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          <span className="font-medium">ルート詳細:</span>
                        </p>
                        <ul className="mt-1 space-y-1">
                          {segment.transit.steps.map((step: any, stepIndex: number) => (
                            <li key={stepIndex} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <div className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {step.travelMode === "WALKING" ? "🚶" : "🚃"}
                              </div>
                              <div className="flex-1">
                                <p className="leading-snug text-card-foreground">{step.instruction}</p>
                                {step.transitDetails && (
                                  <div className="mt-1 flex items-center gap-2 text-xs opacity-75">
                                    <Clock className="h-3 w-3" />
                                    <span>{step.transitDetails.departureTime}</span>
                                    <span>→</span>
                                    <span>{step.transitDetails.arrivalTime}</span>
                                  </div>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">ルート情報を取得できませんでした。</span>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        {tourPlan.map((spot, index) => (
          <Card
            key={spot.id}
            className={`bg-card border-border cursor-pointer transition-colors ${
              selectedSpot?.id === spot.id ? "ring-2 ring-secondary" : ""
            }`}
            onClick={() => setSelectedSpot(spot)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-card-foreground">{spot.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{spot.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {spot.duration}分
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {spot.area === "enoshima" ? "江ノ島" : "鎌倉"}
                    </span>
                    {spot.entrance_fee > 0 && <span>{spot.entrance_fee}円</span>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedSpot && (
        <div className="fixed inset-x-0 bottom-0 bg-background border-t border-border p-4 max-h-[40vh] overflow-y-auto">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-card-foreground flex items-center justify-between">
                {selectedSpot.name}
                <Button variant="ghost" size="sm" onClick={() => setSelectedSpot(null)} className="p-1">
                  ×
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{selectedSpot.description}</p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">営業時間:</span>
                  <p className="text-card-foreground">{selectedSpot.openHours}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">入場料:</span>
                  <p className="text-card-foreground">
                    {selectedSpot.entrance_fee === 0 ? "無料" : `${selectedSpot.entrance_fee}円`}
                  </p>
                </div>
              </div>

              {selectedSpot.tips.length > 0 && (
                <div>
                  <span className="text-muted-foreground text-sm">おすすめTips:</span>
                  <ul className="mt-1 space-y-1">
                    {selectedSpot.tips.map((tip, index) => (
                      <li key={index} className="text-sm text-card-foreground">
                        • {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}