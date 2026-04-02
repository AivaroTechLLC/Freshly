"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, X, Coffee } from "lucide-react"

interface StapleItem {
  id: string
  name: string
  category: string
  isRecurring: boolean
  isCustom: boolean
}

interface Props {
  initialStaples: StapleItem[]
}

export default function StaplesManager({ initialStaples }: Props) {
  const router = useRouter()
  const [staples, setStaples] = useState(initialStaples)
  const [newItem, setNewItem] = useState("")
  const [saving, setSaving] = useState(false)

  async function addCustom() {
    const name = newItem.trim()
    if (!name) return

    const res = await fetch("/api/staples", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      const { staple } = await res.json()
      setStaples((prev) => [...prev, staple])
      setNewItem("")
      router.refresh()
    }
  }

  async function removeStaple(id: string) {
    await fetch(`/api/staples/${id}`, { method: "DELETE" })
    setStaples((prev) => prev.filter((s) => s.id !== id))
    router.refresh()
  }

  // Group by category
  const byCategory = new Map<string, StapleItem[]>()
  for (const s of staples) {
    if (!byCategory.has(s.category)) byCategory.set(s.category, [])
    byCategory.get(s.category)!.push(s)
  }

  return (
    <div className="space-y-6">
      {/* Add new */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Add a staple item</p>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Almond milk, Coffee pods, Eggs…"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustom()}
            />
            <Button onClick={addCustom} disabled={!newItem.trim()}>
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grouped list */}
      {staples.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Coffee className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No staple items yet. Add items above.</p>
        </div>
      ) : (
        Array.from(byCategory.entries()).map(([category, items]) => (
          <div key={category}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {category}
            </p>
            <div className="space-y-1.5">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900">{item.name}</span>
                    {item.isCustom && <Badge variant="outline" className="text-xs">Custom</Badge>}
                  </div>
                  <button
                    onClick={() => removeStaple(item.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    aria-label="Remove"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
