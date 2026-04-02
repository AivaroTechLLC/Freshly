"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Coffee, Plus, X } from "lucide-react"

interface StapleItem {
  id: string
  name: string
  brand?: string
  categoryName: string
}

interface Props {
  selected: string[]
  customStaples: string[]
  onChange: (ids: string[], custom: string[]) => void
  onBack: () => void
  onFinish: () => void
}

const DEFAULT_CATEGORIES: Record<string, StapleItem[]> = {
  "Breakfast Cereals": [
    { id: "frosted-mini-wheats", name: "Frosted Mini Wheats", brand: "Kellogg's", categoryName: "Breakfast Cereals" },
    { id: "cheerios", name: "Cheerios", brand: "General Mills", categoryName: "Breakfast Cereals" },
    { id: "oatmeal", name: "Rolled Oats", brand: "", categoryName: "Breakfast Cereals" },
    { id: "granola", name: "Granola", brand: "", categoryName: "Breakfast Cereals" },
  ],
  "Lunch Meats": [
    { id: "turkey-breast", name: "Sliced Turkey Breast", brand: "", categoryName: "Lunch Meats" },
    { id: "ham", name: "Sliced Ham", brand: "", categoryName: "Lunch Meats" },
    { id: "roast-beef", name: "Roast Beef", brand: "", categoryName: "Lunch Meats" },
    { id: "salami", name: "Salami", brand: "", categoryName: "Lunch Meats" },
  ],
  "Cheeses": [
    { id: "cheddar", name: "Cheddar Cheese", brand: "", categoryName: "Cheeses" },
    { id: "swiss", name: "Swiss Cheese", brand: "", categoryName: "Cheeses" },
    { id: "mozzarella", name: "Mozzarella", brand: "", categoryName: "Cheeses" },
    { id: "parmesan", name: "Parmesan", brand: "", categoryName: "Cheeses" },
  ],
  "Breads": [
    { id: "whole-wheat-bread", name: "Whole Wheat Bread", brand: "", categoryName: "Breads" },
    { id: "white-bread", name: "White Bread", brand: "", categoryName: "Breads" },
    { id: "tortillas", name: "Flour Tortillas", brand: "", categoryName: "Breads" },
    { id: "pita", name: "Pita Bread", brand: "", categoryName: "Breads" },
  ],
  "Condiments": [
    { id: "mayo", name: "Mayonnaise", brand: "", categoryName: "Condiments" },
    { id: "mustard", name: "Yellow Mustard", brand: "", categoryName: "Condiments" },
    { id: "ketchup", name: "Ketchup", brand: "", categoryName: "Condiments" },
    { id: "hot-sauce", name: "Hot Sauce", brand: "", categoryName: "Condiments" },
  ],
}

export default function StaplesStep({
  selected,
  customStaples,
  onChange,
  onBack,
  onFinish,
}: Props) {
  const [newCustom, setNewCustom] = useState("")

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id), customStaples)
    } else {
      onChange([...selected, id], customStaples)
    }
  }

  function addCustom() {
    const trimmed = newCustom.trim()
    if (!trimmed || customStaples.includes(trimmed)) return
    onChange(selected, [...customStaples, trimmed])
    setNewCustom("")
  }

  function removeCustom(item: string) {
    onChange(selected, customStaples.filter((c) => c !== item))
  }

  return (
    <Card>
      <CardHeader>
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-2">
          <Coffee className="w-5 h-5 text-green-600" />
        </div>
        <CardTitle>Your staple items</CardTitle>
        <CardDescription>
          Select items you buy every week. These go straight onto your grocery list
          without needing to be in a recipe. Add anything custom too.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Category sections */}
        <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
          {Object.entries(DEFAULT_CATEGORIES).map(([category, items]) => (
            <div key={category}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {category}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {items.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selected.includes(item.id)}
                      onCheckedChange={() => toggle(item.id)}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      {item.brand && <p className="text-xs text-gray-400">{item.brand}</p>}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Custom staples */}
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <p className="text-sm font-medium text-gray-700">Add anything else</p>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Almond milk, Coffee pods…"
              value={newCustom}
              onChange={(e) => setNewCustom(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustom()}
            />
            <Button variant="outline" size="icon" onClick={addCustom}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {customStaples.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {customStaples.map((item) => (
                <Badge key={item} variant="secondary" className="gap-1 pr-1">
                  {item}
                  <button onClick={() => removeCustom(item)} className="hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack}>← Back</Button>
          <Button onClick={onFinish}>
            Finish setup →
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
