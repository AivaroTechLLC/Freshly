/**
 * Smart grocery list optimizer.
 * Aggregates ingredients across the week's meals, normalizes units,
 * groups by canonical name, rounds to real purchase sizes, and flags
 * bulk/sale opportunities.
 */

import Anthropic from "@anthropic-ai/sdk"

export interface RawIngredient {
  ingredientName: string
  quantity: number
  unit: string
  canonicalSearchTerm?: string | null
  recipeName: string
  mealDate: string
}

export interface OptimizedItem {
  ingredientName: string
  canonicalName: string
  totalQuantity: number
  unit: string
  purchaseQuantity: number
  purchaseUnit: string
  sourceMeals: string[]
  estimatedPrice: number | null
  priceSource: "kroger_api" | "ai_estimate" | "scraped" | "user_override"
  isOnSale: boolean
  salePrice: number | null
  isBulkSuggested: boolean
  storeId?: string
  storeProductId?: string
}

// ─── Unit normalization ────────────────────────────────────────────────────

const ML_CONVERSIONS: Record<string, number> = {
  cup: 240,
  cups: 240,
  tbsp: 15,
  tablespoon: 15,
  tablespoons: 15,
  tsp: 5,
  teaspoon: 5,
  teaspoons: 5,
  ml: 1,
  oz: 29.5735,
  "fl oz": 29.5735,
  liter: 1000,
  liters: 1000,
  l: 1000,
  pint: 473,
  quart: 946,
  gallon: 3785,
}

const GRAM_CONVERSIONS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
  pound: 453.592,
  pounds: 453.592,
}

type BaseUnit = "ml" | "g" | "whole"

function detectBaseUnit(unit: string): BaseUnit {
  const u = unit.toLowerCase()
  if (ML_CONVERSIONS[u]) return "ml"
  if (GRAM_CONVERSIONS[u] && !ML_CONVERSIONS[u]) return "g"
  return "whole"
}

function toBase(quantity: number, unit: string): { value: number; base: BaseUnit } {
  const u = unit.toLowerCase()
  if (ML_CONVERSIONS[u]) return { value: quantity * ML_CONVERSIONS[u], base: "ml" }
  if (GRAM_CONVERSIONS[u]) return { value: quantity * GRAM_CONVERSIONS[u], base: "g" }
  return { value: quantity, base: "whole" }
}

function fromBase(value: number, base: BaseUnit): { quantity: number; unit: string } {
  if (base === "ml") {
    if (value >= 3785) return { quantity: Math.round((value / 3785) * 10) / 10, unit: "gal" }
    if (value >= 946) return { quantity: Math.round((value / 946) * 10) / 10, unit: "qt" }
    if (value >= 240) return { quantity: Math.round((value / 240) * 10) / 10, unit: "cups" }
    if (value >= 15) return { quantity: Math.round(value / 15), unit: "tbsp" }
    return { quantity: Math.round(value / 5), unit: "tsp" }
  }
  if (base === "g") {
    if (value >= 453) return { quantity: Math.round((value / 453.592) * 10) / 10, unit: "lb" }
    if (value >= 28) return { quantity: Math.round(value / 28.3495), unit: "oz" }
    return { quantity: Math.round(value), unit: "g" }
  }
  return { quantity: Math.round(value * 10) / 10, unit: "whole" }
}

// ─── Canonical name resolution (Claude) ──────────────────────────────────

const canonicalCache = new Map<string, string>()

async function resolveCanonicalNames(
  ingredientNames: string[]
): Promise<Map<string, string>> {
  const unknowns = ingredientNames.filter((n) => !canonicalCache.has(n))
  if (unknowns.length === 0) {
    return new Map(ingredientNames.map((n) => [n, canonicalCache.get(n)!]))
  }

  const client = new Anthropic()
  const prompt = `You are a grocery expert. For each ingredient name below, return the canonical grocery search term that would find it in a store.
Group synonyms together (e.g., "scallion" and "green onion" → "green onion").
Return a JSON object mapping each input name to its canonical term.

Input names:
${unknowns.map((n) => `- "${n}"`).join("\n")}

Respond with ONLY valid JSON like: {"scallion": "green onion", "roma tomato": "tomato roma"}`

  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    })

    const text = (msg.content[0] as { type: "text"; text: string }).text.trim()
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}")

    for (const [k, v] of Object.entries(json)) {
      canonicalCache.set(k, v as string)
    }
  } catch {
    // Fallback: use the name as-is
    for (const n of unknowns) canonicalCache.set(n, n)
  }

  return new Map(ingredientNames.map((n) => [n, canonicalCache.get(n) ?? n]))
}

// ─── Main optimizer ────────────────────────────────────────────────────────

export async function optimizeGroceryList(
  ingredients: RawIngredient[]
): Promise<OptimizedItem[]> {
  // Step 1 & 2: Normalize all units to base
  const normalized = ingredients.map((ing) => ({
    ...ing,
    ...toBase(ing.quantity, ing.unit),
  }))

  // Step 3 & 4: Resolve canonical names
  const names = [...new Set(normalized.map((i) => i.ingredientName))]
  const canonicalMap = await resolveCanonicalNames(names)

  // Group by canonical name + base unit
  const groups = new Map<string, typeof normalized>()
  for (const item of normalized) {
    const canonical = canonicalMap.get(item.ingredientName) ?? item.ingredientName
    const key = `${canonical}::${item.base}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push({ ...item, ingredientName: canonical })
  }

  // Step 5: Sum and convert back to human-readable units
  const optimized: OptimizedItem[] = []

  for (const [key, items] of groups) {
    const [canonical, base] = key.split("::")
    const totalBase = items.reduce((sum, i) => sum + i.value, 0)
    const { quantity, unit } = fromBase(totalBase, base as BaseUnit)
    const sourceMeals = [...new Set(items.map((i) => `${i.mealDate} – ${i.recipeName}`))]

    // Step 6: Flag items used in 3+ meals as bulk candidates
    const isBulkSuggested = sourceMeals.length >= 3

    optimized.push({
      ingredientName: canonical,
      canonicalName: canonical,
      totalQuantity: quantity,
      unit,
      purchaseQuantity: quantity,
      purchaseUnit: unit,
      sourceMeals,
      estimatedPrice: null,
      priceSource: "ai_estimate",
      isOnSale: false,
      salePrice: null,
      isBulkSuggested,
    })
  }

  return optimized.sort((a, b) => a.ingredientName.localeCompare(b.ingredientName))
}

/** Apply Kroger product matches and prices to optimized items */
export function applyKrogerPrices(
  items: OptimizedItem[],
  productMatches: Array<{
    ingredientName: string
    storeId: string
    productId: string
    price: number
    isOnSale: boolean
    salePrice?: number
  }>
): OptimizedItem[] {
  const matchMap = new Map(productMatches.map((m) => [m.ingredientName, m]))

  return items.map((item) => {
    const match = matchMap.get(item.canonicalName)
    if (!match) return item
    return {
      ...item,
      estimatedPrice: match.isOnSale ? (match.salePrice ?? match.price) : match.price,
      priceSource: "kroger_api",
      isOnSale: match.isOnSale,
      salePrice: match.salePrice ?? null,
      storeId: match.storeId,
      storeProductId: match.productId,
    }
  })
}

/** Apply AI-estimated prices for items not matched to Kroger */
export async function applyAiPriceEstimates(items: OptimizedItem[]): Promise<OptimizedItem[]> {
  const unpriced = items.filter((i) => i.estimatedPrice === null)
  if (unpriced.length === 0) return items

  const client = new Anthropic()
  const itemList = unpriced
    .map((i) => `${i.purchaseQuantity} ${i.purchaseUnit} ${i.canonicalName}`)
    .join("\n")

  const prompt = `Estimate typical US grocery store prices for these items.
Return a JSON object mapping item name to estimated price in USD.
Be conservative — use average retail prices, not premium.

Items:
${itemList}

Respond with ONLY valid JSON like: {"green onion": 1.29, "chicken breast": 7.99}`

  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    })

    const text = (msg.content[0] as { type: "text"; text: string }).text.trim()
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}")

    return items.map((item) => {
      if (item.estimatedPrice !== null) return item
      const price = json[item.canonicalName]
      return price != null
        ? { ...item, estimatedPrice: price, priceSource: "ai_estimate" as const }
        : item
    })
  } catch {
    return items
  }
}
