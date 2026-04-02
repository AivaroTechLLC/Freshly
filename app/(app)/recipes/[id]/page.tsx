import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, Users, ChevronLeft, Heart } from "lucide-react"
import FavoriteButton from "@/components/recipes/FavoriteButton"

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
  if (!profile) redirect("/onboarding")

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: { ingredients: true },
  })

  if (!recipe) notFound()

  const isFavorite = !!(await prisma.userFavoriteRecipe.findUnique({
    where: { profileId_recipeId: { profileId: profile.id, recipeId: recipe.id } },
  }))

  const nutrition = recipe.nutrition as Record<string, number> | null
  const totalTime = (recipe.prepTimeMins ?? 0) + (recipe.cookTimeMins ?? 0)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Back */}
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
        <Link href="/recipes">
          <ChevronLeft className="w-4 h-4" />
          Back to recipes
        </Link>
      </Button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold text-gray-900">{recipe.title}</h1>
          <FavoriteButton recipeId={recipe.id} isFavorite={isFavorite} />
        </div>
        {recipe.description && (
          <p className="text-gray-600 mt-2">{recipe.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {recipe.prepTimeMins && <span>Prep {recipe.prepTimeMins} min</span>}
            {recipe.cookTimeMins && <span>· Cook {recipe.cookTimeMins} min</span>}
            <span>· {totalTime} min total</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            {recipe.servings} servings
          </span>
        </div>

        {recipe.dietaryTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {recipe.dietaryTags.map((t) => (
              <Badge key={t} variant="secondary">{t.replace(/_/g, " ")}</Badge>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Ingredients */}
        <div className="md:col-span-1">
          <Card>
            <CardContent className="p-5">
              <h2 className="font-semibold text-gray-900 mb-4">
                Ingredients ({recipe.servings} servings)
              </h2>
              <ul className="space-y-2">
                {recipe.ingredients.map((ing) => (
                  <li key={ing.id} className="flex justify-between text-sm">
                    <span className="text-gray-700">{ing.ingredientName}</span>
                    <span className="text-gray-500 ml-2">
                      {Number(ing.quantity)} {ing.unit}
                      {ing.preparation && `, ${ing.preparation}`}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Nutrition */}
          {nutrition && (
            <Card className="mt-4">
              <CardContent className="p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Nutrition per serving</h2>
                <div className="space-y-2">
                  {[
                    ["Calories", nutrition.calories, "kcal"],
                    ["Protein", nutrition.protein_g, "g"],
                    ["Carbs", nutrition.carbs_g, "g"],
                    ["Fat", nutrition.fat_g, "g"],
                    ["Fiber", nutrition.fiber_g, "g"],
                    ["Sodium", nutrition.sodium_mg, "mg"],
                  ]
                    .filter(([, val]) => val != null)
                    .map(([label, val, unit]) => (
                      <div key={String(label)} className="flex justify-between text-sm">
                        <span className="text-gray-600">{label}</span>
                        <span className="font-medium">{val}{unit}</span>
                      </div>
                    ))}
                </div>
                <p className="text-xs text-amber-700 bg-amber-50 rounded p-2 mt-3">
                  AI-estimated values. Consult your healthcare provider for medical dietary guidance.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Instructions */}
        <div className="md:col-span-2">
          <Card>
            <CardContent className="p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Instructions</h2>
              <ol className="space-y-4">
                {recipe.instructions.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                      {i + 1}
                    </span>
                    <p className="text-gray-700 text-sm leading-relaxed pt-0.5">{step}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
