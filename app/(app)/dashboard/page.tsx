import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, ShoppingCart, TrendingDown, Plus } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    include: {
      dietaryRestrictions: true,
      mealPlans: {
        where: { status: { in: ["draft", "active"] } },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { groceryLists: { take: 1 } },
      },
    },
  })

  if (!profile) redirect("/onboarding")

  const activePlan = profile.mealPlans[0] ?? null
  const activeList = activePlan?.groceryLists[0] ?? null
  const budget = profile.weeklyBudget ? Number(profile.weeklyBudget) : null
  const listCost = activeList?.totalEstimatedCost ? Number(activeList.totalEstimatedCost) : null

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Good {getTimeOfDay()}, {profile.displayName ?? "there"} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          {activePlan
            ? `Active plan: ${activePlan.name}`
            : "No active meal plan. Create one to get started."}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                <CalendarDays className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Active plan</p>
                <p className="font-semibold text-gray-900">{activePlan ? `${activePlan.numDays} days` : "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Estimated list</p>
                <p className="font-semibold text-gray-900">{formatCurrency(listCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                listCost && budget && listCost > budget ? "bg-red-100" : "bg-amber-100"
              }`}>
                <TrendingDown className={`w-4 h-4 ${
                  listCost && budget && listCost > budget ? "text-red-600" : "text-amber-600"
                }`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Weekly budget</p>
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-gray-900">{formatCurrency(budget)}</p>
                  {listCost && budget && listCost > budget && (
                    <Badge variant="destructive" className="text-xs">Over!</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-1">Create a meal plan</h3>
            <p className="text-sm text-gray-500 mb-4">
              Choose how many days, and AI generates dinner + lunch options tailored to your needs.
            </p>
            <Button asChild>
              <Link href="/meal-plan/new">
                <Plus className="w-4 h-4" />
                New meal plan
              </Link>
            </Button>
          </CardContent>
        </Card>

        {activePlan && (
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-1">{activePlan.name}</h3>
              <p className="text-sm text-gray-500 mb-4">
                {activePlan.numDays}-day plan •{" "}
                {listCost ? `Estimated ${formatCurrency(listCost)}` : "Grocery list not yet generated"}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href={`/meal-plan/${activePlan.id}`}>View plan</Link>
                </Button>
                {activeList && (
                  <Button asChild>
                    <Link href={`/meal-plan/${activePlan.id}/list`}>
                      <ShoppingCart className="w-4 h-4" />
                      Grocery list
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dietary restrictions quick view */}
      {profile.dietaryRestrictions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Active dietary restrictions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex flex-wrap gap-2">
            {profile.dietaryRestrictions.map((r) => (
              <Badge key={r.id} variant="secondary">{r.restriction.replace(/_/g, " ")}</Badge>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function getTimeOfDay(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "morning"
  if (hour < 17) return "afternoon"
  return "evening"
}
