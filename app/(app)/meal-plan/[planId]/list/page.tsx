"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  ChevronLeft,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  ShoppingBag,
  Scan,
  Check,
  Loader2,
  Info,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface GroceryItem {
  id: string
  ingredientName: string
  purchaseQuantity: number
  purchaseUnit: string
  estimatedPrice: number | null
  priceSource: "kroger_api" | "ai_estimate" | "scraped" | "user_override"
  isOnSale: boolean
  salePrice: number | null
  isBulkSuggested: boolean
  bulkConfirmed: boolean | null
  isCheckedOff: boolean
  userPriceFeedback: number | null
  sourceMeals: string[]
  store?: { name: string; chain: string }
}

interface GroceryList {
  id: string
  totalEstimatedCost: number | null
  isOverBudget: boolean
  status: string
  items: GroceryItem[]
}

export default function GroceryListPage() {
  const { planId } = useParams<{ planId: string }>()
  const [list, setList] = useState<GroceryList | null>(null)
  const [loading, setLoading] = useState(true)
  const [scrapingItem, setScrapingItem] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/grocery-list/${planId}`)
    if (res.ok) {
      const data = await res.json()
      setList(data.list)
    }
    setLoading(false)
  }, [planId])

  useEffect(() => {
    load()
  }, [load])

  async function toggleCheck(itemId: string, checked: boolean) {
    setList((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((i) =>
              i.id === itemId ? { ...i, isCheckedOff: checked } : i
            ),
          }
        : null
    )
    await fetch(`/api/grocery-list/${planId}/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, checked }),
    })
  }

  async function submitFeedback(itemId: string, feedback: 1 | -1, actualPrice?: number) {
    setList((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((i) =>
              i.id === itemId ? { ...i, userPriceFeedback: feedback } : i
            ),
          }
        : null
    )
    await fetch(`/api/grocery-list/${planId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, feedback, actualPrice }),
    })
  }

  async function scrapePrice(item: GroceryItem, storeChain: string) {
    setScrapingItem(item.id)
    const res = await fetch(`/api/grocery-list/${planId}/scrape-price`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id, query: item.ingredientName, storeChain }),
    })
    if (res.ok) {
      const { price } = await res.json()
      setList((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((i) =>
                i.id === item.id
                  ? { ...i, estimatedPrice: price, priceSource: "scraped" }
                  : i
              ),
            }
          : null
      )
    }
    setScrapingItem(null)
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 flex items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
        <span className="text-gray-500">Loading grocery list…</span>
      </div>
    )
  }

  if (!list) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 mb-4">No grocery list found for this plan.</p>
        <Button asChild>
          <Link href={`/meal-plan/${planId}`}>← Back to meal plan</Link>
        </Button>
      </div>
    )
  }

  const checkedCount = list.items.filter((i) => i.isCheckedOff).length
  const hasAiPrices = list.items.some((i) => i.priceSource === "ai_estimate")
  const hasScrapedPrices = list.items.some((i) => i.priceSource === "scraped")

  // Group by store
  const byStore = new Map<string, GroceryItem[]>()
  for (const item of list.items) {
    const storeKey = item.store?.name ?? "General Grocery"
    if (!byStore.has(storeKey)) byStore.set(storeKey, [])
    byStore.get(storeKey)!.push(item)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" className="-ml-2" asChild>
          <Link href={`/meal-plan/${planId}`}>
            <ChevronLeft className="w-4 h-4" />
            Back to plan
          </Link>
        </Button>
        <span className="text-sm text-gray-500">
          {checkedCount}/{list.items.length} checked
        </span>
      </div>

      {/* Title + total */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Grocery List</h1>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xl font-semibold text-green-600">
            {formatCurrency(list.totalEstimatedCost)}
          </span>
          {list.isOverBudget && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Over budget
            </Badge>
          )}
        </div>
      </div>

      {/* AI disclaimer */}
      {(hasAiPrices || hasScrapedPrices) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 flex items-start gap-2 text-sm text-amber-800">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">AI-estimated prices. </span>
            Prices may differ from actual store pricing. Always verify before purchase.
            {hasAiPrices && " Tap the scan icon to verify a price with live store data."}
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-6">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all rounded-full"
            style={{ width: `${list.items.length ? (checkedCount / list.items.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Items grouped by store */}
      <div className="space-y-6">
        {Array.from(byStore.entries()).map(([storeName, items]) => (
          <div key={storeName}>
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBag className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                {storeName}
              </h2>
              <span className="text-xs text-gray-400">({items.length} items)</span>
            </div>

            <div className="space-y-1">
              {items.map((item) => (
                <GroceryListItemRow
                  key={item.id}
                  item={item}
                  planId={planId}
                  onToggle={toggleCheck}
                  onFeedback={submitFeedback}
                  onScrape={scrapePrice}
                  isScraping={scrapingItem === item.id}
                />
              ))}
            </div>

            <Separator className="mt-4" />
          </div>
        ))}
      </div>

      {/* Footer total */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 py-4 mt-6 -mx-4 px-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Estimated total</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(list.totalEstimatedCost)}
            </p>
          </div>
          <Badge variant={list.isOverBudget ? "destructive" : "default"}>
            {list.isOverBudget ? "Over budget" : "Within budget"}
          </Badge>
        </div>
      </div>
    </div>
  )
}

function GroceryListItemRow({
  item,
  planId,
  onToggle,
  onFeedback,
  onScrape,
  isScraping,
}: {
  item: GroceryItem
  planId: string
  onToggle: (id: string, checked: boolean) => void
  onFeedback: (id: string, fb: 1 | -1) => void
  onScrape: (item: GroceryItem, chain: string) => void
  isScraping: boolean
}) {
  const [showSources, setShowSources] = useState(false)

  return (
    <div
      className={`rounded-lg border transition-colors ${
        item.isCheckedOff ? "bg-gray-50 border-gray-100 opacity-60" : "bg-white border-gray-200"
      }`}
    >
      <div className="flex items-center gap-3 p-3">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(item.id, !item.isCheckedOff)}
          className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            item.isCheckedOff
              ? "bg-green-500 border-green-500"
              : "border-gray-300 hover:border-green-400"
          }`}
          aria-label={item.isCheckedOff ? "Uncheck" : "Check off"}
        >
          {item.isCheckedOff && <Check className="w-3.5 h-3.5 text-white" />}
        </button>

        {/* Name + quantity */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`font-medium text-sm ${
                item.isCheckedOff ? "line-through text-gray-400" : "text-gray-900"
              }`}
            >
              {item.ingredientName}
            </span>
            {item.isOnSale && <Badge variant="sale">SALE</Badge>}
            {item.isBulkSuggested && !item.isCheckedOff && (
              <Badge variant="bulk">Bulk option</Badge>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {item.purchaseQuantity} {item.purchaseUnit}
            {item.sourceMeals.length > 0 && (
              <button
                onClick={() => setShowSources(!showSources)}
                className="ml-1.5 text-green-600 hover:underline"
              >
                {item.sourceMeals.length} meals
              </button>
            )}
          </p>
        </div>

        {/* Price */}
        <div className="text-right shrink-0">
          {item.estimatedPrice != null ? (
            <div>
              <p className={`font-semibold text-sm ${item.isOnSale ? "text-red-600" : "text-gray-900"}`}>
                {formatCurrency(item.estimatedPrice)}
              </p>
              <p className="text-xs text-gray-400">
                {item.priceSource === "kroger_api"
                  ? "Kroger"
                  : item.priceSource === "scraped"
                  ? "Verified"
                  : "Est."}
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-400">—</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Scrape verify — only for AI estimate items with a non-Kroger store */}
          {item.priceSource === "ai_estimate" && (
            <button
              onClick={() => onScrape(item, item.store?.chain ?? "walmart")}
              disabled={isScraping}
              title="Verify price from store"
              className="p-1.5 text-gray-400 hover:text-blue-500 rounded"
            >
              {isScraping ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Scan className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Price feedback thumbs */}
          {item.estimatedPrice != null && item.userPriceFeedback === null && (
            <>
              <button
                onClick={() => onFeedback(item.id, 1)}
                title="Price looks right"
                className="p-1.5 text-gray-400 hover:text-green-500 rounded"
              >
                <ThumbsUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => onFeedback(item.id, -1)}
                title="Price is wrong"
                className="p-1.5 text-gray-400 hover:text-red-500 rounded"
              >
                <ThumbsDown className="w-4 h-4" />
              </button>
            </>
          )}
          {item.userPriceFeedback === 1 && (
            <ThumbsUp className="w-4 h-4 text-green-500" />
          )}
          {item.userPriceFeedback === -1 && (
            <ThumbsDown className="w-4 h-4 text-red-400" />
          )}
        </div>
      </div>

      {/* Source meals expandable */}
      {showSources && item.sourceMeals.length > 0 && (
        <div className="px-3 pb-3 -mt-1">
          <div className="bg-gray-50 rounded-md p-2 text-xs text-gray-500 space-y-0.5">
            {item.sourceMeals.map((m, i) => (
              <p key={i}>• {m}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
