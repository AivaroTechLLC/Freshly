"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign } from "lucide-react"

interface Props {
  budget: number
  onChange: (budget: number) => void
  onBack: () => void
  onNext: () => void
}

const PRESETS = [75, 100, 150, 200, 250]

export default function BudgetStep({ budget, onChange, onBack, onNext }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-2">
          <DollarSign className="w-5 h-5 text-green-600" />
        </div>
        <CardTitle>Weekly grocery budget</CardTitle>
        <CardDescription>
          We&apos;ll warn you if your meal plan is approaching or exceeding this amount.
          The AI will try to optimize for savings within your budget.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => onChange(preset)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                budget === preset
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              ${preset}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="budget">Or enter a custom amount</Label>
          <div className="relative max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <Input
              id="budget"
              type="number"
              min={20}
              max={1000}
              value={budget}
              onChange={(e) => onChange(Number(e.target.value))}
              className="pl-7"
            />
          </div>
          <p className="text-xs text-gray-400">
            Average US family of 4 spends $150–$200/week on groceries.
          </p>
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack}>← Back</Button>
          <Button onClick={onNext} disabled={budget < 20}>
            Continue →
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
