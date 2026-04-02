import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { scrapePrice } from "@/lib/scraper"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { itemId, query, storeChain } = await req.json()

  if (!itemId || !query || !storeChain) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  // Check if we have a recent scrape (24-hour cache)
  const item = await prisma.groceryListItem.findUnique({ where: { id: itemId } })
  if (
    item?.priceLastFetched &&
    item.priceSource === "scraped" &&
    item.priceLastFetched > new Date(Date.now() - 24 * 60 * 60 * 1000)
  ) {
    return NextResponse.json({ price: Number(item.estimatedPrice), cached: true })
  }

  // Run the scraper
  const result = await scrapePrice(query, storeChain as "walmart" | "sams_club" | "costco")

  if (!result) {
    return NextResponse.json({ error: "Could not scrape price" }, { status: 404 })
  }

  // Update the grocery list item
  await prisma.groceryListItem.update({
    where: { id: itemId },
    data: {
      estimatedPrice: result.price,
      priceSource: "scraped",
      priceLastFetched: new Date(),
    },
  })

  // Recalculate list total
  const list = await prisma.groceryList.findFirst({
    where: { mealPlanId: planId, profileId: profile.id },
    include: { items: true },
  })

  if (list) {
    const total = list.items.reduce((sum, i) => sum + Number(i.estimatedPrice ?? 0), 0)
    const isOverBudget = profile.weeklyBudget ? total > Number(profile.weeklyBudget) : false
    await prisma.groceryList.update({
      where: { id: list.id },
      data: { totalEstimatedCost: total, isOverBudget },
    })
  }

  return NextResponse.json({ price: result.price, productName: result.productName })
}
