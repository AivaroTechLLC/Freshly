"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Store, Search, Loader2, X } from "lucide-react"

interface StoreItem {
  id: string
  name: string
  address: string
  chain: string
  isBulkStore: boolean
  distance?: string
}

interface Props {
  zipCode: string
  initialUserStores: StoreItem[]
}

export default function StoresManager({ zipCode: initialZip, initialUserStores }: Props) {
  const router = useRouter()
  const [zip, setZip] = useState(initialZip)
  const [searchResults, setSearchResults] = useState<StoreItem[]>([])
  const [selectedStores, setSelectedStores] = useState<StoreItem[]>(initialUserStores)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  async function search() {
    if (!/^\d{5}$/.test(zip)) return
    setLoading(true)
    const res = await fetch("/api/stores/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zipCode: zip }),
    })
    const data = await res.json()
    setSearchResults(data.stores ?? [])
    setLoading(false)
  }

  function toggleStore(store: StoreItem) {
    if (selectedStores.find((s) => s.id === store.id)) {
      setSelectedStores((prev) => prev.filter((s) => s.id !== store.id))
    } else {
      setSelectedStores((prev) => [...prev, store])
    }
  }

  async function save() {
    setSaving(true)
    await fetch("/api/stores", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeIds: selectedStores.map((s) => s.id) }),
    })
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Current stores */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Your stores ({selectedStores.length})
        </h2>
        {selectedStores.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No stores selected. Search to add some.</p>
        ) : (
          <div className="space-y-2">
            {selectedStores.map((store) => (
              <div key={store.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                <Store className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900">{store.name}</span>
                    {store.isBulkStore && <Badge variant="bulk">Bulk</Badge>}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{store.address}</p>
                </div>
                <button onClick={() => toggleStore(store)} className="text-gray-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Find more stores
        </h2>
        <div className="flex gap-2 mb-3">
          <Input
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="Zip code"
            className="max-w-[120px] font-mono"
            maxLength={5}
          />
          <Button variant="outline" onClick={search} disabled={loading || !/^\d{5}$/.test(zip)}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </Button>
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {searchResults.map((store) => {
              const isSelected = !!selectedStores.find((s) => s.id === store.id)
              return (
                <label
                  key={store.id}
                  className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                >
                  <Checkbox checked={isSelected} onCheckedChange={() => toggleStore(store)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">{store.name}</span>
                      {store.isBulkStore && <Badge variant="bulk">Bulk</Badge>}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{store.address}</p>
                  </div>
                  {store.distance && (
                    <span className="text-xs text-gray-400 shrink-0">{store.distance}</span>
                  )}
                </label>
              )
            })}
          </div>
        )}
      </div>

      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? "Saving…" : "Save store preferences"}
      </Button>
    </div>
  )
}
