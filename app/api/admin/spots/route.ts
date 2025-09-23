import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET() {
  await requireAdmin()
  const spots = await prisma.touristSpot.findMany({ orderBy: { name: "asc" } })
  return NextResponse.json(spots)
}

export async function POST(req: Request) {
  await requireAdmin()
  const body = await req.json()
  const created = await prisma.touristSpot.create({ data: body })
  return NextResponse.json(created)
}

export async function PUT(req: Request) {
  await requireAdmin()
  const body = await req.json()
  const { id, ...data } = body
  const updated = await prisma.touristSpot.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(req: Request) {
  await requireAdmin()
  const { id } = await req.json()
  await prisma.coupon.deleteMany({ where: { spotId: id } })
  await prisma.touristSpot.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}


