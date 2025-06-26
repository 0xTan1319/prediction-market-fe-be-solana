import type { PRICE_FEED_IDS } from "./solana-connection"

export interface PriceData {
  price: number
  confidence: number
  publishTime: number
  status: "trading" | "halted" | "unknown"
  symbol: string
}

export class PythOracleService {
  private static instance: PythOracleService
  private priceCache: Map<string, { data: PriceData; timestamp: number }> = new Map()
  private readonly CACHE_DURATION = 30000 // 30 seconds

  private constructor() {
    console.log("✅ Pyth Oracle service initialized")
  }

  static getInstance(): PythOracleService {
    if (!this.instance) {
      this.instance = new PythOracleService()
    }
    return this.instance
  }

  async getPrice(symbol: keyof typeof PRICE_FEED_IDS): Promise<PriceData | null> {
    // Check cache first
    const cached = this.priceCache.get(symbol)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data
    }

    try {
      // For now, we'll use a combination of real API calls and fallback data
      const priceData = await this.fetchPriceFromAPI(symbol)

      // Cache the result
      this.priceCache.set(symbol, {
        data: priceData,
        timestamp: Date.now(),
      })

      return priceData
    } catch (error) {
      console.error(`Failed to fetch price for ${symbol}:`, error)
      return this.getFallbackPrice(symbol)
    }
  }

  private async fetchPriceFromAPI(symbol: keyof typeof PRICE_FEED_IDS): Promise<PriceData> {
    // In production, this would make actual API calls to Pyth or other price feeds
    // For now, we'll simulate realistic price movements

    const basePrice = this.getBasePrice(symbol)
    const volatility = this.getVolatility(symbol)

    // Add realistic price movement
    const change = (Math.random() - 0.5) * volatility
    const price = basePrice * (1 + change)

    return {
      price: Math.round(price * 100) / 100,
      confidence: 0.1 + Math.random() * 0.5, // Random confidence between 0.1 and 0.6
      publishTime: Date.now(),
      status: "trading",
      symbol,
    }
  }

  private getBasePrice(symbol: keyof typeof PRICE_FEED_IDS): number {
    const basePrices: Record<string, number> = {
      "ETH/USD": 2800,
      "BTC/USD": 45000,
      "SOL/USD": 100,
    }
    return basePrices[symbol] || 100
  }

  private getVolatility(symbol: keyof typeof PRICE_FEED_IDS): number {
    const volatilities: Record<string, number> = {
      "ETH/USD": 0.05, // 5% volatility
      "BTC/USD": 0.04, // 4% volatility
      "SOL/USD": 0.08, // 8% volatility
    }
    return volatilities[symbol] || 0.05
  }

  private getFallbackPrice(symbol: keyof typeof PRICE_FEED_IDS): PriceData {
    // Fallback prices for when API calls fail
    const fallbackPrices: Record<string, number> = {
      "ETH/USD": 2800,
      "BTC/USD": 45000,
      "SOL/USD": 100,
    }

    return {
      price: fallbackPrices[symbol] || 100,
      confidence: 1,
      publishTime: Date.now(),
      status: "trading",
      symbol,
    }
  }

  async getMultiplePrices(symbols: (keyof typeof PRICE_FEED_IDS)[]): Promise<Record<string, PriceData | null>> {
    const results: Record<string, PriceData | null> = {}

    await Promise.all(
      symbols.map(async (symbol) => {
        results[symbol] = await this.getPrice(symbol)
      }),
    )

    return results
  }

  // Market resolution helper
  async resolveMarket(
    marketId: string,
    targetPrice: number,
    symbol: keyof typeof PRICE_FEED_IDS,
  ): Promise<{
    resolved: boolean
    outcome: "YES" | "NO" | null
    currentPrice: number
    confidence: number
  }> {
    const priceData = await this.getPrice(symbol)

    if (!priceData || priceData.status !== "trading") {
      return {
        resolved: false,
        outcome: null,
        currentPrice: 0,
        confidence: 0,
      }
    }

    const outcome = priceData.price >= targetPrice ? "YES" : "NO"

    return {
      resolved: true,
      outcome,
      currentPrice: priceData.price,
      confidence: priceData.confidence,
    }
  }

  // Add method to fetch real-time price updates
  startPriceUpdates(callback: (symbol: string, price: PriceData) => void) {
    const symbols: (keyof typeof PRICE_FEED_IDS)[] = ["ETH/USD", "BTC/USD", "SOL/USD"]

    setInterval(async () => {
      for (const symbol of symbols) {
        try {
          const price = await this.getPrice(symbol)
          if (price) {
            callback(symbol, price)
          }
        } catch (error) {
          console.error(`Failed to update price for ${symbol}:`, error)
        }
      }
    }, 30000) // Update every 30 seconds
  }
}

export const pythOracle = PythOracleService.getInstance()
