import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { optimizeGroceryList, applyKrogerPrices, applyAiPriceEstimates } from "@/lib/grocery-optimizer"
import { searchKrogerProducts } from "@/lib/kroger-client"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    include: {
      userStores: { include: { store: true } },
      userStaples: { include: { stapleItem: true } },
    },
  })
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  // Get all selected meals for this plan
  const plan = await prisma.mealPlan.findUnique({
    where: { id: planId, profileId: profile.id },
    include: {
      days: {
        orderBy: { dayIndex: "asc" },
        include: {
          slots: {
            include: {
              recipe: {
                include: { ingredients: true },
              },
            },
          },
        },
      },
    },
  })

  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 })

  // Collect all raw ingredients
  const rawIngredients = []
  for (const day of plan.days) {
    for (const slot of day.slots) {
      if (!slot.recipe) continue
      const dayLabel = new Date(day.planDate).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
      const mealLabel = `${dayLabel} ${slot.mealType}`

      for (const ing of slot.recipe.ingredients) {
        rawIngredients.push({
          ingredientName: ing.ingredientName,
          quantity: Number(ing.quantity),
          unit: ing.unit,
          canonicalSearchTerm: ing.canonicalSearchTerm,
          recipeName: slot.recipe.title,
          mealDate: mealLabel,
        })
      }
    }
  }

  // Add staples
  for (const staple of profile.userStaples) {
    if (!staple.isRecurring) continue
    rawIngredients.push({
      ingredientName: staple.customName ?? staple.stapleItem?.name ?? "Unknown",
      quantity: Number(staple.quantity ?? 1),
      unit: staple.unit ?? "each",
      canonicalSearchTerm: staple.stapleItem?.canonicalSearchTerm ?? null,
      recipeName: "Weekly Staple",
      mealDate: "This week",
    })
  }

  // Run optimizer
  let optimized = await optimizeGroceryList(rawIngredients)

  // Get Kroger location if user has Kroger store selected
  const krogerUserStore = profile.userStores.find(
    (us) => us.store.chain === "kroger" && us.store.krogerLocationId
  )

  if (krogerUserStore?.store.krogerLocationId) {
    const locationId = krogerUserStore.store.krogerLocationId

    // Fetch Kroger prices for each item
    const productMatches = []
    for (const item of optimized) {
      // Check cache first (4-hour TTL)
      const cached = await prisma.storeProduct.findFirst({
        where: {
          storeId: krogerUserStore.storeId,
          ingredientMatch: item.canonicalName,
          lastFetchedAt: { gte: new Date(Date.now() - 4 * 60 * 60 * 1000) },
        },
      })

      if (cached) {
        productMatches.push({
          ingredientName: item.canonicalName,
          storeId: krogerUserStore.storeId,
          productId: cached.id,
          price: Number(cached.price ?? 0),
          isOnSale: cached.isOnSale,
          salePrice: cached.salePrice ? Number(cached.salePrice) : undefined,
        })
        continue
      }

      // Fetch from Kroger API
      const products = await searchKrogerProducts(
        item.canonicalName,
        locationId,
        3
      )

      if (products.length > 0) {
        const product = products[0]
        const item0 = product.items?.[0]
        const price = item0?.price?.regular ?? 0
        const promoPrice = item0?.price?.promo

        // Cache in DB
        const savedProduct = await prisma.storeProduct.upsert({
          where: {
            id: (await prisma.storeProduct.findFirst({
              where: { storeId: krogerUserStore.storeId, krogerProductId: product.productId },
            }))?.id ?? "new",
          },
          create: {
            storeId: krogerUserStore.storeId,
            krogerProductId: product.productId,
            name: product.description,
            brand: product.brand,
            sizeDescription: item0?.size,
            price: price,
            isOnSale: !!promoPrice,
            salePrice: promoPrice,
            ingredientMatch: item.canonicalName,
            priceSource: "kroger_api",
          },
          update: {
            price,
            isOnSale: !!promoPrice,
            salePrice: promoPrice,
            lastFetchedAt: new Date(),
          },
        })

        productMatches.push({
          ingredientName: item.canonicalName,
          storeId: krogerUserStore.storeId,
          productId: savedProduct.id,
          price,
          isOnSale: !!promoPrice,
          salePrice: promoPrice,
        })
      }
    }

    optimized = applyKrogerPrices(optimized, productMatches)
  }

  // AI price estimates for items without prices
  optimized = await applyAiPriceEstimates(optimized)

  // Calculate total
  const total = optimized.reduce((sum, i) => sum + (i.estimatedPrice ?? 0), 0)
  const isOverBudget = profile.weeklyBudget ? total > Number(profile.weeklyBudget) : false

  // Save or update grocery list
  const existing = await prisma.groceryList.findFirst({
    where: { mealPlanId: planId, profileId: profile.id },
  })

  const list = await (existing
    ? prisma.groceryList.update({
        where: { id: existing.id },
        data: {
          status: "optimized",
          totalEstimatedCost: total,
          isOverBudget,
          items: {
            deleteMany: {},
            create: optimized.map((item) => ({
              ingredientName: item.ingredientName,
              totalQuantity: item.totalQuantity,
              unit: item.unit,
              sourceMeals: item.sourceMeals,
              storeId: item.storeId,
              storeProductId: item.storeProductId,
              purchaseQuantity: item.purchaseQuantity,
              purchaseUnit: item.purchaseUnit,
              estimatedPrice: item.estimatedPrice,
              priceSource: item.priceSource as never,
              isOnSale: item.isOnSale,
              salePrice: item.salePrice,
              isBulkSuggested: item.isBulkSuggested,
            })),
          },
        },
      })
    : prisma.groceryList.create({
        data: {
          mealPlanId: planId,
          profileId: profile.id,
          status: "optimized",
          totalEstimatedCost: total,
          isOverBudget,
          items: {
            create: optimized.map((item) => ({
              ingredientName: item.ingredientName,
              totalQuantity: item.totalQuantity,
              unit: item.unit,
              sourceMeals: item.sourceMeals,
              storeId: item.storeId,
              storeProductId: item.storeProductId,
              purchaseQuantity: item.purchaseQuantity,
              purchaseUnit: item.purchaseUnit,
              estimatedPrice: item.estimatedPrice,
              priceSource: item.priceSource as never,
              isOnSale: item.isOnSale,
              salePrice: item.salePrice,
              isBulkSuggested: item.isBulkSuggested,
            })),
          },
        },
      }))

  return NextResponse.json({ listId: list.id, total, isOverBudget })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  const list = await prisma.groceryList.findFirst({
    where: { mealPlanId: planId, profileId: profile.id },
    include: {
      items: {
        include: { store: true, storeProduct: true },
        orderBy: { ingredientName: "asc" },
      },
    },
  })

  if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 })

  return NextResponse.json({ list })
}
