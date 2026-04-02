"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, Users, ChevronRight, ShoppingCart, Loader2, Check, RefreshCw } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface Candidate {
  id: string
  recipeId: string
  recipe: {
    id: string
    title: string
    description?: string
    prepTimeMins?: number
    cookTimeMins?: number
    servings: number
    dietaryTags: string[]
    nutrition?: Record<string, number>
  }
}

interface Day {
  id: string
  dayIndex: number
  planDate: string
  candidates: { dinner: Candidate[]; lunch: Candidate[] }
  selected: { dinner?: string; lunch?: string }
}

interface Plan {
  id: string
  name: string
  numDays: number
  status: string
}

export default function MealPlanPage() {
  const { planId } = useParams<{ planId: string }>()
  const router = useRouter()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [days, setDays] = useState<Day[]>([])
  const [activeDay, setActiveDay] = useState(0)
  const [loading, setLoading] = useState(true)
  const [generatingList, setGeneratingList] = useState(false)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/meal-plans/${planId}`)
      if (!res.ok) return
      const data = await res.json()
      setPlan(data.plan)
      setDays(data.days)
      setLoading(false)
    }
    load()

    // Poll until candidates are ready
    const poll = setInterval(async () => {
      const res = await fetch(`/api/meal-plans/${planId}`)
      if (!res.ok) return
      const data = await res.json()
      const hasCandidates = data.days.some(
        (d: Day) => d.candidates.dinner.length > 0 || d.candidates.lunch.length > 0
      )
      if (hasCandidates) {
        setPlan(data.plan)
        setDays(data.days)
        clearInterval(poll)
        setLoading(false)
      }
    }, 3000)

    return () => clearInterval(poll)
  }, [planId])

  async function selectRecipe(dayId: string, mealType: "dinner" | "lunch", recipeId: string) {
    await fetch(`/api/meal-plans/${planId}/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayId, mealType, recipeId }),
    })
    setDays((prev) =>
      prev.map((d) =>
        d.id === dayId ? { ...d, selected: { ...d.selected, [mealType]: recipeId } } : d
      )
    )
  }

  async function buildGroceryList() {
    setGeneratingList(true)
    const res = await fetch(`/api/grocery-list/${planId}`, { method: "POST" })
    if (res.ok) {
      router.push(`/meal-plan/${planId}/list`)
    }
    setGeneratingList(false)
  }

  const currentDay = days[activeDay]
  const totalSelected = days.reduce(
    (sum, d) => sum + (d.selected.dinner ? 1 : 0) + (d.selected.lunch ? 1 : 0),
    0
  )

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
        <p className="text-gray-600 text-center">
          AI is generating your meal options…<br />
          <span className="text-sm text-gray-400">This takes about 30–60 seconds</span>
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{plan?.name}</h1>
          <p className="text-sm text-gray-500">{plan?.numDays} days • {totalSelected} meals selected</p>
        </div>
        <Button onClick={buildGroceryList} disabled={generatingList || totalSelected === 0}>
          {generatingList ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Building list…</>
          ) : (
            <><ShoppingCart className="w-4 h-4" />Grocery list</>
          )}
        </Button>
      </div>

      {/* Day tabs — horizontal scroll on mobile */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-6 -mx-4 px-4">
        {days.map((day, i) => {
          const hasSelections = !!(day.selected.dinner && day.selected.lunch)
          return (
            <button
              key={day.id}
              onClick={() => setActiveDay(i)}
              className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl text-sm border transition-colors min-w-[60px] ${
                i === activeDay
                  ? "bg-green-600 text-white border-green-600"
                  : hasSelections
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <span className="text-xs opacity-70">
                {new Date(day.planDate).toLocaleDateString("en-US", { weekday: "short" })}
              </span>
              <span className="font-semibold">
                {new Date(day.planDate).getDate()}
              </span>
              {hasSelections && i !== activeDay && (
                <Check className="w-3 h-3 mt-0.5" />
              )}
            </button>
          )
        })}
      </div>

      {/* Current day */}
      {currentDay && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {formatDate(currentDay.planDate)}
          </h2>

          {/* Dinner selection */}
          <MealSection
            label="Dinner"
            candidates={currentDay.candidates.dinner}
            selectedId={currentDay.selected.dinner}
            onSelect={(id) => selectRecipe(currentDay.id, "dinner", id)}
          />

          {/* Lunch selection */}
          <MealSection
            label="Lunch"
            candidates={currentDay.candidates.lunch}
            selectedId={currentDay.selected.lunch}
            onSelect={(id) => selectRecipe(currentDay.id, "lunch", id)}
          />

          {/* Day nav */}
          <div className="flex justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setActiveDay((a) => Math.max(0, a - 1))}
              disabled={activeDay === 0}
            >
              ← Previous day
            </Button>
            {activeDay < days.length - 1 ? (
              <Button onClick={() => setActiveDay((a) => a + 1)}>
                Next day →
              </Button>
            ) : (
              <Button onClick={buildGroceryList} disabled={generatingList}>
                <ShoppingCart className="w-4 h-4" />
                Build grocery list
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function MealSection({
  label,
  candidates,
  selectedId,
  onSelect,
}: {
  label: string
  candidates: Candidate[]
  selectedId?: string
  onSelect: (id: string) => void
}) {
  return (
    <div>
      <h3 className="font-semibold text-gray-700 mb-3">{label}</h3>
      {candidates.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-center text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
            Generating options…
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {candidates.map((c) => {
            const isSelected = selectedId === c.recipeId
            const totalTime = (c.recipe.prepTimeMins ?? 0) + (c.recipe.cookTimeMins ?? 0)
            const nutrition = c.recipe.nutrition as Record<string, number> | null

            return (
              <button
                key={c.id}
                onClick={() => onSelect(c.recipeId)}
                className={`text-left rounded-xl border-2 p-4 transition-all hover:shadow-sm ${
                  isSelected
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 bg-white hover:border-green-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-gray-900 text-sm leading-snug">
                    {c.recipe.title}
                  </p>
                  {isSelected && (
                    <div className="shrink-0 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                {c.recipe.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.recipe.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  {totalTime > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {totalTime} min
                    </span>
                  )}
                  {nutrition?.calories && <span>{nutrition.calories} cal</span>}
                  {nutrition?.protein_g && <span>{nutrition.protein_g}g protein</span>}
                </div>
                <div className="mt-2">
                  <Link
                    href={`/recipes/${c.recipe.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-green-600 hover:underline"
                  >
                    View recipe →
                  </Link>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
