"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin } from "lucide-react"

interface Props {
  zipCode: string
  onChange: (zip: string) => void
  onNext: () => void
}

export default function ZipCodeStep({ zipCode, onChange, onNext }: Props) {
  const valid = /^\d{5}$/.test(zipCode)

  return (
    <Card>
      <CardHeader>
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-2">
          <MapPin className="w-5 h-5 text-green-600" />
        </div>
        <CardTitle>Where do you shop?</CardTitle>
        <CardDescription>
          Enter your zip code so we can find grocery stores near you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="zip">Zip code</Label>
          <Input
            id="zip"
            type="text"
            placeholder="12345"
            value={zipCode}
            onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 5))}
            className="text-lg font-mono tracking-widest max-w-xs"
            maxLength={5}
            inputMode="numeric"
          />
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={onNext} disabled={!valid}>
            Find stores near me →
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
