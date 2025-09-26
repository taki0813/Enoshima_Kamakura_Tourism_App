import { NextResponse, type NextRequest } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { prisma } from '@/lib/prisma'
import { getCoordinatesFromAddress } from "@/lib/location-service" // getCoordinatesFromAddressはlib/location-service.tsで定義されている前提

export async function GET(request: NextRequest) {
  // 修正: checkAdminAuthにrequestを渡す
  if (!await checkAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const spots = await prisma.touristSpot.findMany({
      orderBy: {
        id: "asc", // MongoDBスキーマに合わせてidでソート
      },
    })
    return NextResponse.json(spots)
  } catch (error) {
    console.error("Failed to fetch spots:", error)
    return NextResponse.json({ error: "Failed to fetch spots" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // 修正: checkAdminAuthにrequestを渡す
  if (!await checkAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const data = await request.json()
    // 座標取得のため、一時的なプロパティとして扱われることを考慮
    const { lat, lng, address, ...rest } = data

    let coordinates = { lat, lng }
    if (address) {
      // getCoordinatesFromAddressはlib/location-serviceで定義されていることが前提
      const geocoded = await getCoordinatesFromAddress(address)
      if (geocoded) {
        coordinates = geocoded
      }
    }

    const newSpot = await prisma.touristSpot.create({
      data: {
        ...rest,
        coordinates: JSON.stringify(coordinates),
      },
    })
    return NextResponse.json(newSpot, { status: 201 })
  } catch (error) {
    console.error("Failed to create spot:", error)
    return NextResponse.json({ error: "Failed to create spot" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  // 修正: checkAdminAuthにrequestを渡す
  if (!await checkAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const data = await request.json()
    const { id, lat, lng, address, ...rest } = data

    let coordinates = { lat, lng }
    if (address) {
      const geocoded = await getCoordinatesFromAddress(address)
      if (geocoded) {
        coordinates = geocoded
      }
    }

    const updatedSpot = await prisma.touristSpot.update({
      where: { id },
      data: {
        ...rest,
        coordinates: JSON.stringify(coordinates),
      },
    })
    return NextResponse.json(updatedSpot)
  } catch (error) {
    console.error("Failed to update spot:", error)
    return NextResponse.json({ error: "Failed to update spot" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  // 修正: checkAdminAuthにrequestを渡す
  if (!await checkAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const data = await request.json()
    const { id } = data
    await prisma.touristSpot.delete({
      where: { id },
    })
    return NextResponse.json({ message: "Spot deleted successfully" })
  } catch (error) {
    console.error("Failed to delete spot:", error)
    return NextResponse.json({ error: "Failed to delete spot" }, { status: 500 })
  }
}