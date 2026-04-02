import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, Users, Heart, ChevronLeft } from "lucide-react"

export default async function FavoritesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
  if (!profile) redirect("/onboarding")

  const favorites = await prisma.userFavoriteRecipe.findMany({
    where: { profileId: profile.id },
    include: { recipe: true },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Button variant="ghost" size="sm" className="-ml-2 mb-4" asChild>
        <Link href="/recipes"><ChevronLeft className="w-4 h-4" />All recipes</Link>
      </Button>
      <div className="flex items-center gap-2 mb-6">
        <Heart className="w-5 h-5 text-red-500 fill-red-500" />
        <h1 className="text-2xl font-bold text-gray-900">Favorite Recipes</h1>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Heart className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No favorites yet. Browse recipes and hit the heart icon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map(({ recipe }) => {
            const nutrition = recipe.nutrition as Record<string, number> | null
            return (
              <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="secondary">{recipe.category}</Badge>
                      <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{recipe.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {(recipe.prepTimeMins ?? 0) + (recipe.cookTimeMins ?? 0)} min
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {recipe.servings}
                      </span>
                      {nutrition?.calories && <span>{nutrition.calories} cal</span>}
                    </div>
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
