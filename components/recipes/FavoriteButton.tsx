"use client"

import { useState } from "react"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  recipeId: string
  isFavorite: boolean
}

export default function FavoriteButton({ recipeId, isFavorite: initialFavorite }: Props) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    const res = await fetch(`/api/recipes/${recipeId}/favorite`, {
      method: isFavorite ? "DELETE" : "POST",
    })
    if (res.ok) setIsFavorite(!isFavorite)
    setLoading(false)
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggle}
      disabled={loading}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      className={isFavorite ? "border-red-200 hover:border-red-300" : ""}
    >
      <Heart
        className={`w-4 h-4 ${isFavorite ? "text-red-500 fill-red-500" : "text-gray-500"}`}
      />
    </Button>
  )
}
