"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Store, Loader2 } from "lucide-react"

interface FoundStore {
  id: string
  name: string
  address: string
  chain: string
  isBulkStore: boolean
  distance?: string
}

interface Props {
  zipCode: string
  selectedStoreIds: string[]
  onChange: (ids: string[]) => void
  onBack: () => void
  onNext: () => void
}

export default function StoreSelectionStep({
  zipCode,
  selectedStoreIds,
  onChange,
  onBack,
  onNext,
}: Props) {
  const [stores, setStores] = useState<FoundStore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch("/api/stores/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zipCode }),
    })
      .then((r) => r.json())
      .then((data) => {
        setStores(data.stores ?? [])
        setLoading(false)
      })
      .catch(() => {
        setError("Could not find stores. Check your zip code and try again.")
        setLoading(false)
      })
  }, [zipCode])

  function toggle(id: string) {
    if (selectedStoreIds.includes(id)) {
      onChange(selectedStoreIds.filter((s) => s !== id))
    } else {
      onChange([...selectedStoreIds, id])
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-2">
          <Store className="w-5 h-5 text-green-600" />
        </div>
        <CardTitle>Select your preferred stores</CardTitle>
        <CardDescription>
          We found these stores near {zipCode}. Select all the ones you shop at.
          Bulk stores (Costco, Sam&apos;s) are marked — we&apos;ll suggest bulk buying when it saves money.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <div className="flex items-center gap-2 text-gray-500 py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Finding stores near you…
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-md p-3">{error}</div>
        )}

        {!loading && !error && stores.length === 0 && (
          <p className="text-gray-500 text-sm">No stores found near {zipCode}.</p>
        )}

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {stores.map((store) => (
            <label
              key={store.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
            >
              <Checkbox
                checked={selectedStoreIds.includes(store.id)}
                onCheckedChange={() => toggle(store.id)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 text-sm">{store.name}</span>
                  {store.isBulkStore && (
                    <Badge variant="bulk">Bulk store</Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{store.address}</p>
              </div>
              {store.distance && (
                <span className="text-xs text-gray-400 shrink-0">{store.distance}</span>
              )}
            </label>
          ))}
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack}>← Back</Button>
          <Button onClick={onNext} disabled={selectedStoreIds.length === 0}>
            Continue →
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
