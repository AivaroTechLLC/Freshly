import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name } = await req.json()
  const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  const staple = await prisma.userStaple.create({
    data: {
      profileId: profile.id,
      customName: name,
      isRecurring: true,
    },
  })

  return NextResponse.json({
    staple: {
      id: staple.id,
      name,
      category: "Custom",
      isRecurring: true,
      isCustom: true,
    },
  })
}
