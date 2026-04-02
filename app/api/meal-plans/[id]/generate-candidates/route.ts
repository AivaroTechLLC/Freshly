import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"
import { validateNutrition, buildDietaryPromptSection } from "@/lib/nutrition-validator"

const client = new Anthropic()

async function generateCandidates(
  category: "lunch" | "dinner",
  count: number,
  restrictions: string[],
  existingTitles: string[]
) {
  const dietarySection = buildDietaryPromptSection(restrictions)

  const prompt = `Generate ${count} different ${category} recipes for a weekly meal plan.
Make them varied — different proteins, cuisines, and cooking methods.

${dietarySection ? `DIETARY REQUIREMENTS:\n${dietarySection}\n\n` : ""}
${existingTitles.length > 0 ? `Already used (do not repeat): ${existingTitles.join(", ")}\n\n` : ""}

Return ONLY a valid JSON array of ${count} recipe objects:
[
  {
    "title": "Recipe Name",
    "description": "Brief description",
    "category": "${category}",
    "prep_time_mins": 15,
    "cook_time_mins": 25,
    "servings": 4,
    "instructions": ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"],
    "dietary_tags": ["tag1"],
    "nutrition": {"calories": 450, "protein_g": 28, "carbs_g": 45, "fat_g": 12, "fiber_g": 6, "sodium_mg": 480},
    "ingredients": [
      {"name": "chicken breast", "quantity": 6, "unit": "oz", "preparation": "diced", "canonical_search_term": "chicken breast"}
    ]
  }
]`

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 6000,
    messages: [{ role: "user", content: prompt }],
  })

  const text = (msg.content[0] as { type: "text"; text: string }).text.trim()
  const jsonStr = text.match(/\[[\s\S]*\]/)?.[0]
  if (!jsonStr) return []

  return JSON.parse(jsonStr)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: planId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    include: { dietaryRestrictions: true },
  })
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  const plan = await prisma.mealPlan.findUnique({
    where: { id: planId, profileId: profile.id },
    include: { days: true },
  })
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 })

  const restrictions = profile.dietaryRestrictions.map((r) => r.restriction)

  // Generate dinner and lunch candidates for all days in one batch
  const dinnerCandidates = await generateCandidates(
    "dinner",
    plan.numDays * 4, // 4 per day
    restrictions,
    []
  )

  const lunchCandidates = await generateCandidates(
    "lunch",
    plan.numDays * 3, // 3 per day
    restrictions,
    dinnerCandidates.map((r: { title: string }) => r.title)
  )

  async function saveRecipeAndIngredients(recipeData: {
    title: string
    description?: string
    category: string
    prep_time_mins?: number
    cook_time_mins?: number
    servings?: number
    instructions?: string[]
    dietary_tags?: string[]
    nutrition?: Record<string, number>
    ingredients?: Array<{
      name: string
      quantity: number
      unit: string
      preparation?: string
      canonical_search_term?: string
    }>
  }) {
    return prisma.recipe.create({
      data: {
        title: recipeData.title,
        description: recipeData.description,
        category: recipeData.category as never,
        prepTimeMins: recipeData.prep_time_mins,
        cookTimeMins: recipeData.cook_time_mins,
        servings: recipeData.servings ?? 4,
        instructions: recipeData.instructions ?? [],
        dietaryTags: recipeData.dietary_tags ?? [],
        nutrition: recipeData.nutrition ?? {},
        source: "ai_generated",
        isPublic: true,
        ingredients: {
          create: (recipeData.ingredients ?? []).map((ing) => ({
            ingredientName: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            preparation: ing.preparation,
            canonicalSearchTerm: ing.canonical_search_term ?? ing.name,
          })),
        },
      },
    })
  }

  // Save recipes and assign to days
  for (let dayIdx = 0; dayIdx < plan.days.length; dayIdx++) {
    const day = plan.days[dayIdx]

    // 4 dinner candidates for this day
    const dayDinners = dinnerCandidates.slice(dayIdx * 4, dayIdx * 4 + 4)
    for (let i = 0; i < dayDinners.length; i++) {
      const recipe = await saveRecipeAndIngredients(dayDinners[i])
      await prisma.mealPlanCandidate.create({
        data: {
          mealPlanDayId: day.id,
          mealType: "dinner",
          recipeId: recipe.id,
          candidateOrder: i,
        },
      })
    }

    // 3 lunch candidates for this day
    const dayLunches = lunchCandidates.slice(dayIdx * 3, dayIdx * 3 + 3)
    for (let i = 0; i < dayLunches.length; i++) {
      const recipe = await saveRecipeAndIngredients(dayLunches[i])
      await prisma.mealPlanCandidate.create({
        data: {
          mealPlanDayId: day.id,
          mealType: "lunch",
          recipeId: recipe.id,
          candidateOrder: i,
        },
      })
    }
  }

  return NextResponse.json({ ok: true })
}
