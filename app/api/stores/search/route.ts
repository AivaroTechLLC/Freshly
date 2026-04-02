import { NextRequest, NextResponse } from "next/server"
import { findKrogerStores } from "@/lib/kroger-client"
import { prisma } from "@/lib/prisma"

interface GooglePlace {
  name: string
  vicinity: string
  place_id: string
  geometry: { location: { lat: number; lng: number } }
  types: string[]
}

const BULK_CHAINS = ["costco", "sam's club", "sams club", "bj's wholesale", "bjs"]

async function geocodeZip(zip: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) return null

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${zip}&key=${apiKey}`
  )
  const data = await res.json()
  if (data.results?.[0]) {
    return data.results[0].geometry.location
  }
  return null
}

async function findGooglePlaces(lat: number, lng: number): Promise<GooglePlace[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) return []

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=25000&type=grocery_or_supermarket&key=${apiKey}`
  )
  const data = await res.json()
  return data.results ?? []
}

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959 // miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export async function POST(req: NextRequest) {
  const { zipCode } = await req.json()

  if (!zipCode || !/^\d{5}$/.test(zipCode)) {
    return NextResponse.json({ error: "Invalid zip code" }, { status: 400 })
  }

  const stores: Array<{
    id: string
    name: string
    address: string
    chain: string
    isBulkStore: boolean
    distance?: string
  }> = []

  // Get center coordinates
  const center = await geocodeZip(zipCode)

  // ── Kroger stores ──────────────────────────────────────────────────────
  try {
    const krogerStores = await findKrogerStores(zipCode)
    for (const ks of krogerStores) {
      const existing = await prisma.store.findFirst({
        where: { krogerLocationId: ks.locationId },
      })

      let store = existing
      if (!store) {
        store = await prisma.store.create({
          data: {
            name: ks.name,
            chain: "kroger",
            address: ks.address.addressLine1,
            city: ks.address.city,
            state: ks.address.state,
            zipCode: ks.address.zipCode,
            lat: ks.geolocation?.latitude,
            lng: ks.geolocation?.longitude,
            krogerLocationId: ks.locationId,
            isBulkStore: false,
          },
        })
      }

      const dist =
        center && ks.geolocation
          ? getDistance(center.lat, center.lng, ks.geolocation.latitude, ks.geolocation.longitude)
          : null

      stores.push({
        id: store.id,
        name: store.name,
        address: `${ks.address.addressLine1}, ${ks.address.city}, ${ks.address.state}`,
        chain: "kroger",
        isBulkStore: false,
        distance: dist ? `${dist.toFixed(1)} mi` : undefined,
      })
    }
  } catch {
    // Kroger API may not be configured yet — continue with Google results
  }

  // ── Google Places ──────────────────────────────────────────────────────
  if (center) {
    try {
      const places = await findGooglePlaces(center.lat, center.lng)

      for (const place of places.slice(0, 20)) {
        // Skip if already added from Kroger
        const alreadyAdded = stores.some(
          (s) => s.name.toLowerCase() === place.name.toLowerCase()
        )
        if (alreadyAdded) continue

        const nameLower = place.name.toLowerCase()
        const isBulk = BULK_CHAINS.some((bc) => nameLower.includes(bc))
        let chain: "kroger" | "walmart" | "sams_club" | "costco" | "local" | "other" = "other"
        if (nameLower.includes("walmart")) chain = "walmart"
        else if (nameLower.includes("sam's club") || nameLower.includes("sams club")) chain = "sams_club"
        else if (nameLower.includes("costco")) chain = "costco"
        else if (nameLower.includes("kroger")) chain = "kroger"
        else chain = "local"

        const existing = await prisma.store.findFirst({
          where: { placeId: place.place_id },
        })

        let store = existing
        if (!store) {
          store = await prisma.store.create({
            data: {
              name: place.name,
              chain,
              address: place.vicinity,
              zipCode,
              lat: place.geometry.location.lat,
              lng: place.geometry.location.lng,
              placeId: place.place_id,
              isBulkStore: isBulk,
            },
          })
        }

        const dist = getDistance(
          center.lat,
          center.lng,
          place.geometry.location.lat,
          place.geometry.location.lng
        )

        stores.push({
          id: store.id,
          name: store.name,
          address: place.vicinity,
          chain,
          isBulkStore: isBulk,
          distance: `${dist.toFixed(1)} mi`,
        })
      }
    } catch {
      // Google Places not configured — return just Kroger results
    }
  }

  // Sort by distance
  stores.sort((a, b) => {
    const distA = a.distance ? parseFloat(a.distance) : 999
    const distB = b.distance ? parseFloat(b.distance) : 999
    return distA - distB
  })

  return NextResponse.json({ stores: stores.slice(0, 20) })
}
