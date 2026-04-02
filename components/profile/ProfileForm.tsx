"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { createClient } from "@/lib/supabase/client"

const RESTRICTIONS = [
  { id: "glp1", label: "GLP-1 medication", desc: "High protein, low GI diet" },
  { id: "high_bp", label: "High blood pressure", desc: "DASH diet guidelines" },
  { id: "high_fiber", label: "High fiber", desc: "≥5g fiber per meal" },
  { id: "vegetarian", label: "Vegetarian", desc: "" },
  { id: "vegan", label: "Vegan", desc: "" },
  { id: "gluten_free", label: "Gluten-free", desc: "" },
  { id: "dairy_free", label: "Dairy-free", desc: "" },
  { id: "nut_free", label: "Nut-free", desc: "" },
]

interface Props {
  initialData: {
    displayName: string
    zipCode: string
    weeklyBudget: number
    dietaryRestrictions: string[]
  }
  email: string
}

export default function ProfileForm({ initialData, email }: Props) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState(initialData.displayName)
  const [zipCode, setZipCode] = useState(initialData.zipCode)
  const [weeklyBudget, setWeeklyBudget] = useState(initialData.weeklyBudget)
  const [restrictions, setRestrictions] = useState(initialData.dietaryRestrictions)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function toggleRestriction(id: string) {
    setRestrictions((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    )
  }

  async function save() {
    setSaving(true)
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, zipCode, weeklyBudget, dietaryRestrictions: restrictions }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <div className="space-y-6">
      {/* Account info */}
      <Card>
        <CardHeader><CardTitle className="text-base">Account</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={email} disabled className="bg-gray-50 text-gray-500" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name">Display name</Label>
            <Input
              id="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>
        </CardContent>
      </Card>

      {/* Location & budget */}
      <Card>
        <CardHeader><CardTitle className="text-base">Location & Budget</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="zip">Zip code</Label>
            <Input
              id="zip"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
              placeholder="12345"
              className="max-w-xs font-mono"
              maxLength={5}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="budget">Weekly grocery budget</Label>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                id="budget"
                type="number"
                min={20}
                value={weeklyBudget}
                onChange={(e) => setWeeklyBudget(Number(e.target.value))}
                className="pl-7"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dietary restrictions */}
      <Card>
        <CardHeader><CardTitle className="text-base">Dietary Restrictions</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {RESTRICTIONS.map((r) => (
              <label key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                <Checkbox
                  checked={restrictions.includes(r.id)}
                  onCheckedChange={() => toggleRestriction(r.id)}
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{r.label}</p>
                  {r.desc && <p className="text-xs text-gray-500">{r.desc}</p>}
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={signOut}>
          Sign out
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : saved ? "✓ Saved!" : "Save changes"}
        </Button>
      </div>
    </div>
  )
}
