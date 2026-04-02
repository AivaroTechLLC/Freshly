import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: recipeId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  await prisma.userFavoriteRecipe.upsert({
    where: { profileId_recipeId: { profileId: profile.id, recipeId } },
    create: { profileId: profile.id, recipeId },
    update: {},
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: recipeId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  await prisma.userFavoriteRecipe.deleteMany({
    where: { profileId: profile.id, recipeId },
  })

  return NextResponse.json({ ok: true })
}
