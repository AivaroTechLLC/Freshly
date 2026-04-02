/**
 * Kroger Developer API client
 * Handles OAuth token lifecycle and product/location searches.
 * Token is cached in-process for 28 minutes (expires at 30).
 */

const KROGER_BASE_URL = "https://api.kroger.com/v1"

interface KrogerToken {
  access_token: string
  expires_at: number
}

interface KrogerStore {
  locationId: string
  name: string
  address: {
    addressLine1: string
    city: string
    state: string
    zipCode: string
  }
  geolocation: {
    latitude: number
    longitude: number
  }
}

interface KrogerProduct {
  productId: string
  description: string
  brand: string
  items: Array<{
    itemId: string
    size: string
    price?: {
      regular: number
      promo?: number
    }
  }>
  images: Array<{ perspective: string; sizes: Array<{ url: string; size: string }> }>
}

// In-process token cache
let tokenCache: KrogerToken | null = null

async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (tokenCache && tokenCache.expires_at > now) {
    return tokenCache.access_token
  }

  const credentials = Buffer.from(
    `${process.env.KROGER_CLIENT_ID}:${process.env.KROGER_CLIENT_SECRET}`
  ).toString("base64")

  const res = await fetch(`${KROGER_BASE_URL}/connect/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials&scope=product.compact",
  })

  if (!res.ok) {
    throw new Error(`Kroger token fetch failed: ${res.status}`)
  }

  const data = await res.json()
  tokenCache = {
    access_token: data.access_token,
    expires_at: now + 28 * 60 * 1000, // 28 minutes
  }

  return tokenCache.access_token
}

export async function findKrogerStores(zipCode: string): Promise<KrogerStore[]> {
  const token = await getAccessToken()

  const params = new URLSearchParams({
    "filter.zipCode.near": zipCode,
    "filter.radiusInMiles": "25",
    "filter.limit": "10",
  })

  const res = await fetch(`${KROGER_BASE_URL}/locations?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) return []

  const data = await res.json()
  return data.data ?? []
}

export async function searchKrogerProducts(
  query: string,
  locationId: string,
  limit = 5
): Promise<KrogerProduct[]> {
  const token = await getAccessToken()

  const params = new URLSearchParams({
    "filter.term": query,
    "filter.locationId": locationId,
    "filter.limit": String(limit),
  })

  const res = await fetch(`${KROGER_BASE_URL}/products?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 4 * 60 * 60 }, // 4-hour ISR cache
  })

  if (!res.ok) return []

  const data = await res.json()
  return data.data ?? []
}

export type { KrogerStore, KrogerProduct }
