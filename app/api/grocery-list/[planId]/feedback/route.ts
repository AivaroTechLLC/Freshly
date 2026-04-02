import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { itemId, feedback, actualPrice } = await req.json()

  if (!itemId || ![-1, 1].includes(feedback)) {
    return NextResponse.json({ error: "Invalid feedback" }, { status: 400 })
  }

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  const item = await prisma.groceryListItem.findUnique({ where: { id: itemId } })
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 })

  // Save feedback
  await prisma.priceFeedback.create({
    data: {
      profileId: profile.id,
      groceryListItemId: itemId,
      ingredientName: item.ingredientName,
      estimatedPrice: item.estimatedPrice,
      feedback,
      actualPrice: actualPrice ?? null,
    },
  })

  // Update item feedback
  await prisma.groceryListItem.update({
    where: { id: itemId },
    data: { userPriceFeedback: feedback },
  })

  return NextResponse.json({ ok: true })
}
