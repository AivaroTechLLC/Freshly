"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays, Loader2 } from "lucide-react"

const DAY_OPTIONS = [3, 5, 7, 10, 14]

export default function NewMealPlanPage() {
  const router = useRouter()
  const [numDays, setNumDays] = useState(7)
  const [loading, setLoading] = useState(false)

  async function createPlan() {
    setLoading(true)
    const res = await fetch("/api/meal-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numDays }),
    })

    if (res.ok) {
      const { planId } = await res.json()
      router.push(`/meal-plan/${planId}`)
    } else {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <Card>
        <CardHeader>
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-2">
            <CalendarDays className="w-5 h-5 text-green-600" />
          </div>
          <CardTitle>Create a new meal plan</CardTitle>
          <CardDescription>
            How many days do you want to plan? AI will generate 4 dinner options and
            2–3 lunch options per day, plus use your breakfast staples.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Number of days</p>
            <div className="flex flex-wrap gap-3">
              {DAY_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setNumDays(d)}
                  className={`px-5 py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${
                    numDays === d
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-green-400"
                  }`}
                >
                  {d} days
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Custom: <input
                type="number"
                min={1}
                max={21}
                value={numDays}
                onChange={(e) => setNumDays(Math.min(21, Math.max(1, Number(e.target.value))))}
                className="inline-block w-14 px-2 py-1 text-center border rounded text-sm ml-1"
              />
            </p>
          </div>

          <div className="bg-green-50 rounded-lg p-4 text-sm text-green-800">
            <p className="font-medium mb-1">What you&apos;ll get:</p>
            <ul className="space-y-1 text-green-700">
              <li>• {numDays * 4} dinner recipe options to choose from</li>
              <li>• {numDays * 3} lunch options</li>
              <li>• Smart grocery list with cross-week quantity optimization</li>
              <li>• Price estimates from your preferred stores</li>
            </ul>
          </div>

          <Button onClick={createPlan} disabled={loading} className="w-full" size="lg">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating your plan…
              </>
            ) : (
              `Create ${numDays}-day meal plan`
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
