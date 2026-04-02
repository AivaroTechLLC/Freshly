import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  const { numDays } = await req.json()

  const startDate = new Date()
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + numDays - 1)

  const plan = await prisma.mealPlan.create({
    data: {
      profileId: profile.id,
      name: `Week of ${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      startDate,
      endDate,
      numDays,
      status: "draft",
      days: {
        create: Array.from({ length: numDays }, (_, i) => {
          const dayDate = new Date(startDate)
          dayDate.setDate(startDate.getDate() + i)
          return {
            dayIndex: i,
            planDate: dayDate,
          }
        }),
      },
    },
  })

  // Trigger async candidate generation in the background
  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/meal-plans/${plan.id}/generate-candidates`, {
    method: "POST",
    headers: { Cookie: req.headers.get("cookie") ?? "" },
  }).catch(() => null)

  return NextResponse.json({ planId: plan.id })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
  if (!profile) return NextResponse.json({ plans: [] })

  const plans = await prisma.mealPlan.findMany({
    where: { profileId: profile.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  })

  return NextResponse.json({ plans })
}
