/**
 * Lazy price scraper for non-Kroger stores.
 * Scrapes only when triggered by user ("Verify price" button).
 * Results are cached for 24 hours in store_products table.
 *
 * Supported: Walmart, Sam's Club, Costco
 */

import { chromium } from "playwright"

export interface ScrapedPrice {
  productName: string
  price: number
  unit?: string
  imageUrl?: string
  productUrl?: string
  store: "walmart" | "sams_club" | "costco"
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function randomDelay() {
  // 1–2.5 second delay to avoid rate limiting
  await delay(1000 + Math.random() * 1500)
}

export async function scrapeWalmartPrice(query: string): Promise<ScrapedPrice | null> {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    await page.setExtraHTTPHeaders({
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    })

    await randomDelay()
    await page.goto(
      `https://www.walmart.com/search?q=${encodeURIComponent(query)}`,
      { waitUntil: "domcontentloaded", timeout: 15000 }
    )

    // Wait for product cards
    await page.waitForSelector('[data-testid="list-view"]', { timeout: 8000 }).catch(() => null)

    const product = await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-testid="list-view"] > div, .mb0.ph1.pa0-xl.bb.b--near-white.w-25')
      for (const card of cards) {
        const priceEl = card.querySelector('[itemprop="price"], [data-automation="product-price"]')
        const nameEl = card.querySelector('[data-automation="product-title"], [itemprop="name"]')
        const imgEl = card.querySelector('img')

        if (priceEl && nameEl) {
          const priceText = priceEl.getAttribute("content") || priceEl.textContent || ""
          const price = parseFloat(priceText.replace(/[^0-9.]/g, ""))
          if (!isNaN(price)) {
            return {
              productName: nameEl.textContent?.trim() ?? "",
              price,
              imageUrl: imgEl?.src ?? undefined,
              productUrl: (card.querySelector('a') as HTMLAnchorElement)?.href ?? undefined,
            }
          }
        }
      }
      return null
    })

    if (!product) return null
    return { ...product, store: "walmart" }
  } catch {
    return null
  } finally {
    await browser.close()
  }
}

export async function scrapeSamsClubPrice(query: string): Promise<ScrapedPrice | null> {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    await page.setExtraHTTPHeaders({
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    })

    await randomDelay()
    await page.goto(
      `https://www.samsclub.com/s/${encodeURIComponent(query)}`,
      { waitUntil: "domcontentloaded", timeout: 15000 }
    )

    await page.waitForSelector('.product-title', { timeout: 8000 }).catch(() => null)

    const product = await page.evaluate(() => {
      const cards = document.querySelectorAll('.product-tile, [class*="ProductTile"]')
      for (const card of cards) {
        const priceEl = card.querySelector('[class*="price"], .Price')
        const nameEl = card.querySelector('.product-title, [class*="productTitle"]')
        const imgEl = card.querySelector('img')

        if (priceEl && nameEl) {
          const priceText = priceEl.textContent ?? ""
          const price = parseFloat(priceText.replace(/[^0-9.]/g, ""))
          if (!isNaN(price)) {
            return {
              productName: nameEl.textContent?.trim() ?? "",
              price,
              imageUrl: imgEl?.src ?? undefined,
            }
          }
        }
      }
      return null
    })

    if (!product) return null
    return { ...product, store: "sams_club" }
  } catch {
    return null
  } finally {
    await browser.close()
  }
}

export async function scrapeCostcoPrice(query: string): Promise<ScrapedPrice | null> {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    await page.setExtraHTTPHeaders({
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    })

    await randomDelay()
    await page.goto(
      `https://www.costco.com/s?keyword=${encodeURIComponent(query)}`,
      { waitUntil: "domcontentloaded", timeout: 15000 }
    )

    await page.waitForSelector('.product-tile-set', { timeout: 8000 }).catch(() => null)

    const product = await page.evaluate(() => {
      const cards = document.querySelectorAll('.product-tile-set .product-tile, [automation-id="productTile"]')
      for (const card of cards) {
        const priceEl = card.querySelector('[automation-id="buyBoxPrice"], .price')
        const nameEl = card.querySelector('[automation-id="productName"], .description')
        const imgEl = card.querySelector('img')

        if (priceEl && nameEl) {
          const priceText = priceEl.textContent ?? ""
          const price = parseFloat(priceText.replace(/[^0-9.]/g, ""))
          if (!isNaN(price)) {
            return {
              productName: nameEl.textContent?.trim() ?? "",
              price,
              imageUrl: imgEl?.src ?? undefined,
            }
          }
        }
      }
      return null
    })

    if (!product) return null
    return { ...product, store: "costco" }
  } catch {
    return null
  } finally {
    await browser.close()
  }
}

/** Scrape a price from a store given its chain identifier */
export async function scrapePrice(
  query: string,
  storeChain: "walmart" | "sams_club" | "costco"
): Promise<ScrapedPrice | null> {
  switch (storeChain) {
    case "walmart":
      return scrapeWalmartPrice(query)
    case "sams_club":
      return scrapeSamsClubPrice(query)
    case "costco":
      return scrapeCostcoPrice(query)
    default:
      return null
  }
}
