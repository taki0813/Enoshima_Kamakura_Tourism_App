import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function POST(req: Request) {
  await requireAdmin()
  const form = await req.formData()
  const file = form.get("file") as unknown as File | null
  if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 })

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const uploadsDir = path.join(process.cwd(), "public", "uploads")
  await mkdir(uploadsDir, { recursive: true })
  const ext = path.extname(file.name) || ".bin"
  const base = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, "_")
  const filename = `${Date.now()}_${base}${ext}`
  const filepath = path.join(uploadsDir, filename)
  await writeFile(filepath, buffer)
  const url = `/uploads/${filename}`
  return NextResponse.json({ url })
}


