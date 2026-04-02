import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { displayName, zipCode, weeklyBudget, dietaryRestrictions } = await req.json()

  const profile = await prisma.profile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, displayName, zipCode, weeklyBudget },
    update: { displayName, zipCode, weeklyBudget },
  })

  // Replace dietary restrictions
  await prisma.dietaryRestrictionEntry.deleteMany({ where: { profileId: profile.id } })
  if (dietaryRestrictions?.length > 0) {
    await prisma.dietaryRestrictionEntry.createMany({
      data: dietaryRestrictions.map((r: string) => ({
        profileId: profile.id,
        restriction: r as never,
        severity: "required" as never,
      })),
    })
  }

  return NextResponse.json({ ok: true })
}
