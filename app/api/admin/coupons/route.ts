import { NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'
import { requireAdmin } from "@/lib/admin-auth"

export async function GET() {
  await requireAdmin()
  const coupons = await prisma.coupon.findMany({ orderBy: { obtainedAt: "desc" } })
  return NextResponse.json(coupons)
}

export async function POST(req: Request) {
  await requireAdmin()
  const body = await req.json()
  const created = await prisma.coupon.create({ data: body })
  return NextResponse.json(created)
}

export async function PUT(req: Request) {
  await requireAdmin()
  const body = await req.json()
  const { id, ...data } = body
  const updated = await prisma.coupon.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(req: Request) {
  await requireAdmin()
  const { id } = await req.json()
  await prisma.coupon.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}


