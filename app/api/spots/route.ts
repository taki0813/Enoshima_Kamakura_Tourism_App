import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

function mapSpot(s: any) {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    area: s.area,
    category: s.category,
    tags: safeParseArray(s.tags),
    duration: s.duration,
    difficulty: s.difficulty,
    coordinates: { lat: s.lat, lng: s.lng },
    openHours: s.openHours,
    bestVisitTime: s.bestVisitTime ?? null,
    entrance_fee: s.entranceFee,
    image: s.image,
    tips: safeParseArray(s.tips),
    coupons: (s.coupons || []).map((c: any) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      discount: c.discount,
      validUntil: c.validUntil,
      spotId: c.spotId,
    })),
  }
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

export async function GET() {
  const spots = await prisma.touristSpot.findMany({ include: { coupons: true }, orderBy: { name: "asc" } })
  return NextResponse.json(spots.map(mapSpot))
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const searchName = body?.searchName as string | undefined
  if (!searchName) return NextResponse.json({ spot: null })
  const existing = await prisma.touristSpot.findFirst({ where: { name: { contains: searchName, mode: "insensitive" } }, include: { coupons: true } })
  return NextResponse.json({ spot: existing ? mapSpot(existing) : null })
}


