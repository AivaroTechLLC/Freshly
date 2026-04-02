"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Heart } from "lucide-react"

const RESTRICTIONS = [
  {
    id: "glp1",
    label: "GLP-1 medication (Ozempic, Wegovy, etc.)",
    desc: "High protein, low GI, smaller portions. Follows ADA + Obesity Medicine guidelines.",
    medical: true,
  },
  {
    id: "high_bp",
    label: "High blood pressure",
    desc: "DASH diet: low sodium (<650mg/meal), high potassium, limits saturated fat.",
    medical: true,
  },
  {
    id: "high_fiber",
    label: "High fiber diet",
    desc: "Minimum 5g fiber per meal. Whole grains, legumes, and soluble fiber emphasized.",
    medical: true,
  },
  {
    id: "vegetarian",
    label: "Vegetarian",
    desc: "No meat or seafood. Eggs and dairy are fine.",
    medical: false,
  },
  {
    id: "vegan",
    label: "Vegan",
    desc: "No animal products including eggs, dairy, or honey.",
    medical: false,
  },
  {
    id: "gluten_free",
    label: "Gluten-free",
    desc: "No wheat, barley, rye, or regular oats.",
    medical: false,
  },
  {
    id: "dairy_free",
    label: "Dairy-free",
    desc: "No milk, cheese, butter, or cream.",
    medical: false,
  },
  {
    id: "nut_free",
    label: "Nut-free",
    desc: "No tree nuts or peanuts.",
    medical: false,
  },
]

interface Props {
  selected: string[]
  onChange: (restrictions: string[]) => void
  onBack: () => void
  onNext: () => void
}

export default function DietaryStep({ selected, onChange, onBack, onNext }: Props) {
  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((r) => r !== id))
    } else {
      onChange([...selected, id])
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-2">
          <Heart className="w-5 h-5 text-green-600" />
        </div>
        <CardTitle>Dietary needs</CardTitle>
        <CardDescription>
          Select any dietary restrictions or health needs. We&apos;ll filter all recipes and
          verify nutrition against clinical guidelines. Skip if none apply.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 pb-1">
            Medical / Clinical
          </p>
          {RESTRICTIONS.filter((r) => r.medical).map((r) => (
            <label
              key={r.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
            >
              <Checkbox
                checked={selected.includes(r.id)}
                onCheckedChange={() => toggle(r.id)}
                className="mt-0.5"
              />
              <div>
                <p className="font-medium text-gray-900 text-sm">{r.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="space-y-1 pt-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 pb-1">
            Dietary Preferences
          </p>
          {RESTRICTIONS.filter((r) => !r.medical).map((r) => (
            <label
              key={r.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
            >
              <Checkbox
                checked={selected.includes(r.id)}
                onCheckedChange={() => toggle(r.id)}
                className="mt-0.5"
              />
              <div>
                <p className="font-medium text-gray-900 text-sm">{r.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
              </div>
            </label>
          ))}
        </div>

        {(selected.includes("glp1") || selected.includes("high_bp")) && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-md p-3">
            ⚕️ Medical dietary guidance is based on ADA, Obesity Medicine Association, and DASH
            (NIH/NHLBI) guidelines. Always consult your healthcare provider.
          </p>
        )}

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack}>← Back</Button>
          <Button onClick={onNext}>
            {selected.length === 0 ? "Skip — no restrictions →" : "Continue →"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
