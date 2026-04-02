import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: planId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  const plan = await prisma.mealPlan.findUnique({
    where: { id: planId, profileId: profile.id },
    include: {
      days: {
        orderBy: { dayIndex: "asc" },
        include: {
          slots: { include: { recipe: true } },
          candidates: {
            include: { recipe: { include: { ingredients: true } } },
            orderBy: { candidateOrder: "asc" },
          },
        },
      },
    },
  })

  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 })

  const days = plan.days.map((day) => ({
    id: day.id,
    dayIndex: day.dayIndex,
    planDate: day.planDate,
    candidates: {
      dinner: day.candidates.filter((c) => c.mealType === "dinner").map((c) => ({
        id: c.id,
        recipeId: c.recipeId,
        recipe: c.recipe,
      })),
      lunch: day.candidates.filter((c) => c.mealType === "lunch").map((c) => ({
        id: c.id,
        recipeId: c.recipeId,
        recipe: c.recipe,
      })),
    },
    selected: {
      dinner: day.slots.find((s) => s.mealType === "dinner")?.recipeId ?? undefined,
      lunch: day.slots.find((s) => s.mealType === "lunch")?.recipeId ?? undefined,
    },
  }))

  return NextResponse.json({ plan, days })
}
