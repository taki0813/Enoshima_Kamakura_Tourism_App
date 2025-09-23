import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function POST(req: Request) {
  const { spotIds } = await req.json().catch(() => ({ spotIds: [] }))
  if (!Array.isArray(spotIds) || spotIds.length === 0) {
    return NextResponse.json([])
  }
  const coupons = await prisma.coupon.findMany({ where: { spotId: { in: spotIds } } })
  return NextResponse.json(coupons)
}


