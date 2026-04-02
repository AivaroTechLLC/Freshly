/**
 * Server-side nutrition validator for medical dietary restrictions.
 * Guidelines sourced from:
 *   - GLP-1: ADA + Obesity Medicine Association
 *   - High BP: DASH diet (NIH/NHLBI)
 *   - High Fiber: Academy of Nutrition and Dietetics
 */

export interface NutritionData {
  calories?: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
  fiber_g?: number
  sodium_mg?: number
  potassium_mg?: number
  saturated_fat_g?: number
  glycemic_index?: number
}

export interface ValidationResult {
  valid: boolean
  failures: string[]
}

type Restriction = "glp1" | "high_bp" | "high_fiber"

const THRESHOLDS: Record<Restriction, (n: NutritionData) => string[]> = {
  glp1: (n) => {
    const failures: string[] = []
    if (n.protein_g !== undefined && n.protein_g < 20)
      failures.push(`Protein ${n.protein_g}g is below 20g minimum for GLP-1 meal`)
    if (n.fat_g !== undefined && n.fat_g > 40)
      failures.push(`Fat ${n.fat_g}g exceeds 40g limit for GLP-1 (high fat slows gastric emptying)`)
    if (n.glycemic_index !== undefined && n.glycemic_index > 70)
      failures.push(`Glycemic index ${n.glycemic_index} is too high — keep below 70 for GLP-1`)
    return failures
  },
  high_bp: (n) => {
    const failures: string[] = []
    if (n.sodium_mg !== undefined && n.sodium_mg > 650)
      failures.push(`Sodium ${n.sodium_mg}mg exceeds DASH limit of 650mg per meal`)
    if (n.saturated_fat_g !== undefined && n.saturated_fat_g > 8)
      failures.push(`Saturated fat ${n.saturated_fat_g}g exceeds DASH limit of 8g per meal`)
    return failures
  },
  high_fiber: (n) => {
    const failures: string[] = []
    if (n.fiber_g !== undefined && n.fiber_g < 5)
      failures.push(`Fiber ${n.fiber_g}g is below 5g minimum for high-fiber diet`)
    return failures
  },
}

export function validateNutrition(
  nutrition: NutritionData,
  activeRestrictions: string[]
): ValidationResult {
  const failures: string[] = []

  for (const restriction of activeRestrictions) {
    const checker = THRESHOLDS[restriction as Restriction]
    if (checker) {
      failures.push(...checker(nutrition))
    }
  }

  return { valid: failures.length === 0, failures }
}

/** Build the dietary constraint string for Claude prompts */
export function buildDietaryPromptSection(activeRestrictions: string[]): string {
  const sections: string[] = []

  if (activeRestrictions.includes("glp1")) {
    sections.push(`GLP-1 MEDICATION GUIDELINES (ADA + Obesity Medicine Association):
- Minimum 20-30g protein per serving
- Maximum 35-40g total fat per serving (high fat slows gastric emptying — causes nausea)
- Low glycemic index ingredients only (GI < 55 preferred, max 70)
- Smaller portion sizes (3-4 oz protein, 1/2 cup starch)
- Emphasize lean proteins, vegetables, legumes`)
  }

  if (activeRestrictions.includes("high_bp")) {
    sections.push(`HIGH BLOOD PRESSURE — DASH DIET (NIH/NHLBI):
- Maximum 600-650mg sodium per serving
- Rich in potassium (beans, sweet potato, avocado, spinach)
- Rich in magnesium and calcium (leafy greens, low-fat dairy)
- Limit saturated fat to under 8g per serving
- Limit red meat; emphasize poultry, fish, legumes`)
  }

  if (activeRestrictions.includes("high_fiber")) {
    sections.push(`HIGH FIBER (Academy of Nutrition and Dietetics):
- Minimum 5-8g dietary fiber per serving
- Emphasize soluble fiber (oats, beans, lentils, apples, citrus)
- Include whole grains, not refined
- Vegetables and legumes in every meal`)
  }

  if (activeRestrictions.includes("vegetarian")) {
    sections.push("VEGETARIAN: No meat, poultry, or seafood. Eggs and dairy are acceptable.")
  }

  if (activeRestrictions.includes("vegan")) {
    sections.push("VEGAN: No animal products whatsoever including eggs, dairy, and honey.")
  }

  if (activeRestrictions.includes("gluten_free")) {
    sections.push("GLUTEN-FREE: No wheat, barley, rye, or regular oats. Use certified GF alternatives.")
  }

  if (activeRestrictions.includes("dairy_free")) {
    sections.push("DAIRY-FREE: No milk, cheese, butter, cream, yogurt. Use plant-based alternatives.")
  }

  if (activeRestrictions.includes("nut_free")) {
    sections.push("NUT-FREE: No tree nuts or peanuts. Check all sauces and dressings.")
  }

  return sections.join("\n\n")
}
