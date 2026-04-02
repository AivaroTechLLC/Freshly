import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"
import { validateNutrition, buildDietaryPromptSection } from "@/lib/nutrition-validator"

const client = new Anthropic()

interface GeneratedRecipe {
  title: string
  description: string
  category: "breakfast" | "lunch" | "dinner" | "snack"
  prep_time_mins: number
  cook_time_mins: number
  servings: number
  instructions: string[]
  dietary_tags: string[]
  nutrition: {
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
    fiber_g: number
    sodium_mg: number
    saturated_fat_g?: number
    glycemic_index?: number
  }
  ingredients: Array<{
    name: string
    quantity: number
    unit: string
    preparation?: string
    canonical_search_term: string
  }>
}

async function generateRecipe(
  category: string,
  restrictions: string[],
  excludeTitles: string[],
  retryNote?: string
): Promise<GeneratedRecipe | null> {
  const dietarySection = buildDietaryPromptSection(restrictions)

  const prompt = `Generate a complete, delicious ${category} recipe for a home cook.

${dietarySection ? `DIETARY REQUIREMENTS (MUST follow all of these):\n${dietarySection}\n\n` : ""}
${retryNote ? `IMPORTANT CORRECTION FROM LAST ATTEMPT: ${retryNote}\n\n` : ""}
${excludeTitles.length > 0 ? `Avoid these recipe titles (already used): ${excludeTitles.join(", ")}\n\n` : ""}

Return ONLY a valid JSON object with this exact structure:
{
  "title": "Recipe Name",
  "description": "1-2 sentence description",
  "category": "${category}",
  "prep_time_mins": 15,
  "cook_time_mins": 25,
  "servings": 4,
  "instructions": ["Step 1...", "Step 2...", "Step 3..."],
  "dietary_tags": ["glp1_friendly", "low_sodium"],
  "nutrition": {
    "calories": 450,
    "protein_g": 28,
    "carbs_g": 45,
    "fat_g": 12,
    "fiber_g": 6,
    "sodium_mg": 480,
    "saturated_fat_g": 3,
    "glycemic_index": 45
  },
  "ingredients": [
    {"name": "chicken breast", "quantity": 6, "unit": "oz", "preparation": "diced", "canonical_search_term": "chicken breast"},
    {"name": "broccoli", "quantity": 2, "unit": "cups", "preparation": "chopped", "canonical_search_term": "broccoli"}
  ]
}

Provide at least 5 step-by-step instructions and 6-12 ingredients.`

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  })

  const text = (msg.content[0] as { type: "text"; text: string }).text.trim()
  const jsonStr = text.match(/\{[\s\S]*\}/)?.[0]
  if (!jsonStr) return null

  return JSON.parse(jsonStr) as GeneratedRecipe
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { category = "dinner", count = 4, excludeTitles = [] } = await req.json()

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    include: { dietaryRestrictions: true },
  })

  const restrictions = profile?.dietaryRestrictions.map((r) => r.restriction) ?? []
  const recipes: { title: string }[] = []

  for (let i = 0; i < count; i++) {
    let recipe: GeneratedRecipe | null = null
    let retryNote: string | undefined

    // Up to 2 retries for dietary validation
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        recipe = await generateRecipe(
          category,
          restrictions,
          [...excludeTitles, ...recipes.map((r) => r.title)],
          retryNote
        )

        if (!recipe) continue

        // Validate nutrition
        const { valid, failures } = validateNutrition(recipe.nutrition, restrictions)
        if (valid) break

        retryNote = failures.join("; ")
        recipe = null
      } catch (err) {
        console.error("Recipe generation error:", err)
        break
      }
    }

    if (!recipe) continue

    // Save to database
    const saved = await prisma.recipe.create({
      data: {
        title: recipe.title,
        description: recipe.description,
        category: recipe.category,
        prepTimeMins: recipe.prep_time_mins,
        cookTimeMins: recipe.cook_time_mins,
        servings: recipe.servings,
        instructions: recipe.instructions,
        dietaryTags: recipe.dietary_tags,
        nutrition: recipe.nutrition,
        source: "ai_generated",
        isPublic: true,
        ingredients: {
          create: recipe.ingredients.map((ing) => ({
            ingredientName: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            preparation: ing.preparation,
            canonicalSearchTerm: ing.canonical_search_term,
          })),
        },
      },
      include: { ingredients: true },
    })

    recipes.push(saved)
  }

  return NextResponse.json({ recipes })
}
