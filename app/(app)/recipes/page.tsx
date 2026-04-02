import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, Users, Heart, Plus } from "lucide-react"

const CATEGORY_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
}

const TAG_LABELS: Record<string, string> = {
  glp1_friendly: "GLP-1",
  low_sodium: "Low Sodium",
  high_fiber: "High Fiber",
  high_protein: "High Protein",
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  gluten_free: "GF",
  dairy_free: "Dairy-Free",
}

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; tag?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { category, tag } = await searchParams

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
  if (!profile) redirect("/onboarding")

  const favorites = await prisma.userFavoriteRecipe.findMany({
    where: { profileId: profile.id },
    select: { recipeId: true },
  })
  const favoriteIds = new Set(favorites.map((f) => f.recipeId))

  const recipes = await prisma.recipe.findMany({
    where: {
      isPublic: true,
      ...(category ? { category: category as never } : {}),
      ...(tag ? { dietaryTags: { has: tag } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 48,
  })

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Recipes</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/recipes/favorites">
              <Heart className="w-4 h-4" />
              Favorites
            </Link>
          </Button>
          <Button asChild>
            <Link href="/recipes/add">
              <Plus className="w-4 h-4" />
              Add recipe
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href="/recipes"
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            !category && !tag
              ? "bg-green-600 text-white border-green-600"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
        >
          All
        </Link>
        {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
          <Link
            key={val}
            href={`/recipes?category=${val}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              category === val
                ? "bg-green-600 text-white border-green-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {label}
          </Link>
        ))}
        {Object.entries(TAG_LABELS).map(([val, label]) => (
          <Link
            key={val}
            href={`/recipes?tag=${val}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              tag === val
                ? "bg-green-600 text-white border-green-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Recipe grid */}
      {recipes.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">No recipes found.</p>
          <Button asChild>
            <Link href="/recipes/generate">Generate recipes with AI</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((recipe) => {
            const nutrition = recipe.nutrition as Record<string, number> | null
            return (
              <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-5">
                    {/* Category badge */}
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="secondary">{CATEGORY_LABELS[recipe.category]}</Badge>
                      {favoriteIds.has(recipe.id) && (
                        <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                      )}
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{recipe.title}</h3>
                    {recipe.description && (
                      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{recipe.description}</p>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {(recipe.prepTimeMins ?? 0) + (recipe.cookTimeMins ?? 0)} min
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {recipe.servings} servings
                      </span>
                      {nutrition?.calories && (
                        <span>{nutrition.calories} cal</span>
                      )}
                    </div>

                    {/* Dietary tags */}
                    {recipe.dietaryTags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {recipe.dietaryTags.slice(0, 3).map((t) => (
                          <Badge key={t} variant="outline" className="text-xs">
                            {TAG_LABELS[t] ?? t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
