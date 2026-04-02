import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, CalendarDays, ShoppingCart } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"

export default async function MealPlansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
  if (!profile) redirect("/onboarding")

  const plans = await prisma.mealPlan.findMany({
    where: { profileId: profile.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { groceryLists: { take: 1 } },
  })

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Meal Plans</h1>
        <Button asChild>
          <Link href="/meal-plan/new">
            <Plus className="w-4 h-4" />
            New plan
          </Link>
        </Button>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="mb-4">No meal plans yet.</p>
          <Button asChild>
            <Link href="/meal-plan/new">Create your first plan</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => {
            const list = plan.groceryLists[0]
            return (
              <Card key={plan.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                      <Badge variant={plan.status === "active" ? "default" : "secondary"}>
                        {plan.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      {plan.numDays} days •{" "}
                      {formatDate(plan.startDate)} →{" "}
                      {new Date(plan.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {list?.totalEstimatedCost && (
                        <> • Est. {formatCurrency(Number(list.totalEstimatedCost))}</>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/meal-plan/${plan.id}`}>View</Link>
                    </Button>
                    {list && (
                      <Button size="sm" asChild>
                        <Link href={`/meal-plan/${plan.id}/list`}>
                          <ShoppingCart className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
