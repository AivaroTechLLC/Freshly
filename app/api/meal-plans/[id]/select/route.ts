import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: planId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { dayId, mealType, recipeId } = await req.json()

  await prisma.mealPlanSlot.upsert({
    where: {
      mealPlanDayId_mealType: {
        mealPlanDayId: dayId,
        mealType: mealType as never,
      },
    },
    create: {
      mealPlanDayId: dayId,
      mealType: mealType as never,
      recipeId,
    },
    update: { recipeId },
  })

  return NextResponse.json({ ok: true })
}
