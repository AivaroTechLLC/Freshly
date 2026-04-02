import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { zipCode, selectedStoreIds, dietaryRestrictions, weeklyBudget, stapleItemIds, customStaples } =
    await req.json()

  // Upsert profile
  const profile = await prisma.profile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      displayName: user.user_metadata?.display_name ?? null,
      zipCode,
      weeklyBudget,
      inviteCodeUsed: user.user_metadata?.invite_code ?? null,
    },
    update: {
      zipCode,
      weeklyBudget,
    },
  })

  // Save dietary restrictions
  await prisma.dietaryRestrictionEntry.deleteMany({ where: { profileId: profile.id } })
  if (dietaryRestrictions.length > 0) {
    await prisma.dietaryRestrictionEntry.createMany({
      data: dietaryRestrictions.map((r: string) => ({
        profileId: profile.id,
        restriction: r as never,
        severity: "required" as never,
      })),
    })
  }

  // Save store preferences
  await prisma.userStore.deleteMany({ where: { profileId: profile.id } })
  if (selectedStoreIds.length > 0) {
    const storeDetails = await prisma.store.findMany({
      where: { id: { in: selectedStoreIds } },
    })

    await prisma.userStore.createMany({
      data: selectedStoreIds.map((storeId: string, i: number) => ({
        profileId: profile.id,
        storeId,
        isPreferred: true,
        isBulkStore: storeDetails.find((s) => s.id === storeId)?.isBulkStore ?? false,
        priority: i,
      })),
    })
  }

  // Save system staple items
  if (stapleItemIds.length > 0) {
    // Seed staple items if not exist (from default list)
    const existingItems = await prisma.stapleItem.findMany({
      where: { id: { in: stapleItemIds } },
    })

    await prisma.userStaple.createMany({
      data: existingItems.map((item) => ({
        profileId: profile.id,
        stapleItemId: item.id,
        isRecurring: true,
      })),
    })
  }

  // Save custom staples
  if (customStaples.length > 0) {
    await prisma.userStaple.createMany({
      data: (customStaples as string[]).map((name) => ({
        profileId: profile.id,
        customName: name,
        isRecurring: true,
      })),
    })
  }

  return NextResponse.json({ ok: true })
}
