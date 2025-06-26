import type { Pool, SwapQuote } from "@/types/dlmm"
import type { Market, MarketOdds } from "@/types/market"
import { meteoraSDK, type MeteoraLiquidityParams } from "./meteora-dlmm-sdk"
import { pythOracle } from "./pyth-oracle"
import { ErrorHandler, AppError, ErrorType, Logger } from "./error-handling"
import { databaseService } from "./database-service-relationship-fix"
import type { WalletContextState } from "@solana/wallet-adapter-react"
import { PublicKey } from "@solana/web3.js"

// DLMM service with real Meteora integration
class MeteoraIntegratedDLMMService {
  private static instance: MeteoraIntegratedDLMMService

  static getInstance(): MeteoraIntegratedDLMMService {
    if (!this.instance) {
      this.instance = new MeteoraIntegratedDLMMService()
      this.instance.initialize()
    }
    return this.instance
  }

  private async initialize() {
    try {
      // Sync Meteora pools with database
      await this.syncMeteoraPoolsWithDatabase()

      // Start real-time updates
      this.startRealTimeUpdates()

      Logger.info("Meteora integrated DLMM service initialized successfully")
    } catch (error) {
      Logger.error("Failed to initialize Meteora DLMM service", error as Error)
    }
  }

  private async syncMeteoraPoolsWithDatabase() {
    try {
      const meteoraPools = await meteoraSDK.getAllPools()

      for (const pool of meteoraPools) {
        // Update database with real Meteora pool data
        await databaseService.updatePoolFromMeteora({
          id: pool.pubkey.toString(),
          tokenA: pool.tokenX.toString(),
          tokenB: pool.tokenY.toString(),
          liquidity: pool.totalLiquidity,
          price: (await meteoraSDK.getPoolPrice(pool.pubkey.toString())) || 0,
          fees: pool.fees24h / pool.volume24h || 0.003, // Default 0.3%
          binStep: pool.binStep,
          activeId: pool.activeId,
        })
      }

      Logger.info("Synced Meteora pools with database", { count: meteoraPools.length })
    } catch (error) {
      Logger.error("Failed to sync Meteora pools", error as Error)
    }
  }

  private startRealTimeUpdates() {
    // Update pool prices every 30 seconds
    setInterval(async () => {
      try {
        await this.updatePoolPricesFromMeteora()
      } catch (error) {
        Logger.error("Failed to update pool prices", error as Error)
      }
    }, 30000)

    // Update oracle prices every 60 seconds
    setInterval(async () => {
      try {
        await this.updateOraclePrices()
      } catch (error) {
        Logger.error("Failed to update oracle prices", error as Error)
      }
    }, 60000)
  }

  private async updatePoolPricesFromMeteora() {
    const markets = await databaseService.getMarkets({ resolved: false, limit: 50 })

    for (const market of markets) {
      if (market.yesPoolId) {
        const price = await meteoraSDK.getPoolPrice(market.yesPoolId)
        if (price) {
          await databaseService.updatePoolPrice(market.yesPoolId, price)
        }
      }

      if (market.noPoolId) {
        const price = await meteoraSDK.getPoolPrice(market.noPoolId)
        if (price) {
          await databaseService.updatePoolPrice(market.noPoolId, price)
        }
      }
    }
  }

  private async updateOraclePrices() {
    const ethPrice = await pythOracle.getPrice("ETH/USD")
    const btcPrice = await pythOracle.getPrice("BTC/USD")
    const solPrice = await pythOracle.getPrice("SOL/USD")

    if (ethPrice) {
      await databaseService.savePriceData("ETH/USD", ethPrice.price, ethPrice.confidence)
      await this.updateMarketOddsFromPrice("eth-5k-july-2024", ethPrice.price, 5000)
    }

    if (btcPrice) {
      await databaseService.savePriceData("BTC/USD", btcPrice.price, btcPrice.confidence)
      await this.updateMarketOddsFromPrice("btc-100k-2024", btcPrice.price, 100000)
    }

    if (solPrice) {
      await databaseService.savePriceData("SOL/USD", solPrice.price, solPrice.confidence)
      await this.updateMarketOddsFromPrice("sol-200-2024", solPrice.price, 200)
    }
  }

  private async updateMarketOddsFromPrice(marketSlug: string, currentPrice: number, targetPrice: number) {
    try {
      const market = await databaseService.getMarket(marketSlug)
      if (!market || market.resolved) return

      const timeToExpiry = Math.max(1, (market.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      const priceRatio = currentPrice / targetPrice
      const impliedProbability = Math.min(0.95, Math.max(0.05, priceRatio * (1 - 0.1 / Math.sqrt(timeToExpiry))))

      // Update actual Meteora pools if they exist
      if (market.yesPoolId && market.noPoolId) {
        // This would require more sophisticated pool rebalancing
        // For now, we update the database representation
        await Promise.allSettled([
          databaseService.updatePoolLiquidity(market.yesPoolId, 0, impliedProbability),
          databaseService.updatePoolLiquidity(market.noPoolId, 0, 1 - impliedProbability),
        ])
      }
    } catch (error) {
      Logger.error("Failed to update market odds from price", error as Error, { marketSlug, currentPrice, targetPrice })
    }
  }

  // Public API methods using real Meteora integration

  async getMarkets(): Promise<Market[]> {
    return await databaseService.getMarkets({ resolved: false, limit: 50 })
  }

  async getMarket(slug: string): Promise<Market | null> {
    return await databaseService.getMarket(slug)
  }

  async getPool(id: string): Promise<Pool | null> {
    // Get pool from Meteora first, then fallback to database
    const meteoraPool = await meteoraSDK.getPool(id)
    if (meteoraPool) {
      return {
        id: meteoraPool.pubkey.toString(),
        tokenA: meteoraPool.tokenX.toString(),
        tokenB: meteoraPool.tokenY.toString(),
        liquidity: meteoraPool.totalLiquidity,
        price: (await meteoraSDK.getPoolPrice(id)) || 0,
        fees: 0.003, // Default fee
        volume24h: meteoraPool.volume24h,
        createdAt: new Date(),
      }
    }

    return await databaseService.getPool(id)
  }

  async getMarketOdds(marketSlug: string): Promise<MarketOdds | null> {
    const odds = await databaseService.getMarketOdds(marketSlug)
    if (!odds) return null

    // Enhance with real-time Meteora pool data
    const market = await databaseService.getMarket(marketSlug)
    if (market?.yesPoolId && market?.noPoolId) {
      const [yesPrice, noPrice] = await Promise.all([
        meteoraSDK.getPoolPrice(market.yesPoolId),
        meteoraSDK.getPoolPrice(market.noPoolId),
      ])

      if (yesPrice && noPrice) {
        const totalPrice = yesPrice + noPrice
        const yesProb = (yesPrice / totalPrice) * 100
        const noProb = (noPrice / totalPrice) * 100

        return {
          ...odds,
          yes: yesPrice,
          no: noPrice,
          yesImpliedProbability: yesProb,
          noImpliedProbability: noProb,
        }
      }
    }

    return odds
  }

  async addLiquidity(
    wallet: WalletContextState,
    poolId: string,
    amount: number,
    binId?: number,
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      if (!wallet.publicKey) {
        throw new AppError(ErrorType.WALLET_NOT_CONNECTED, "Wallet not connected")
      }

      const pool = await meteoraSDK.getPool(poolId)
      if (!pool) {
        throw new AppError(ErrorType.INVALID_INPUT, "Pool not found")
      }

      const params: MeteoraLiquidityParams = {
        poolAddress: new PublicKey(poolId),
        tokenXAmount: amount / 2, // Split amount between tokens
        tokenYAmount: amount / 2,
        binId: binId || pool.activeId,
        activationType: 0, // Spot
      }

      const result = await meteoraSDK.addLiquidity(wallet, params)

      if (result.success) {
        // Update database
        await databaseService.updatePoolLiquidity(poolId, amount)
        Logger.info("Liquidity added via Meteora", { poolId, amount, signature: result.signature })
      }

      return result
    } catch (error) {
      Logger.error("Failed to add liquidity via Meteora", error as Error, { poolId, amount })
      throw ErrorHandler.handle(error)
    }
  }

  async swap(wallet: WalletContextState, poolId: string, amountIn: number, tokenIn: string): Promise<SwapQuote | null> {
    try {
      if (!wallet.publicKey) {
        throw new AppError(ErrorType.WALLET_NOT_CONNECTED, "Wallet not connected")
      }

      const pool = await meteoraSDK.getPool(poolId)
      if (!pool) {
        throw new AppError(ErrorType.INVALID_INPUT, "Pool not found")
      }

      // Determine output token
      const tokenOut = tokenIn === pool.tokenX.toString() ? pool.tokenY.toString() : pool.tokenX.toString()

      // Get quote from Meteora
      const meteoraQuote = await meteoraSDK.getSwapQuote(poolId, tokenIn, tokenOut, amountIn, 1)

      if (!meteoraQuote) {
        throw new AppError(ErrorType.SLIPPAGE_EXCEEDED, "Unable to get swap quote")
      }

      // Execute swap via Meteora
      const result = await meteoraSDK.executeSwap(wallet, poolId, tokenIn, tokenOut, amountIn, 1)

      if (!result.success) {
        throw new AppError(ErrorType.TRANSACTION_FAILED, result.error || "Swap failed")
      }

      // Record trade in database
      const markets = await databaseService.getMarkets({ limit: 100 })
      const market = markets.find((m) => m.yesPoolId === poolId || m.noPoolId === poolId)

      if (market) {
        const outcome = market.yesPoolId === poolId ? "YES" : "NO"
        await databaseService.createTrade({
          userWallet: wallet.publicKey.toString(),
          marketId: market.id,
          poolId,
          outcome,
          tradeType: "BUY",
          amountIn,
          amountOut: Number.parseFloat(meteoraQuote.outAmount),
          price: Number.parseFloat(meteoraQuote.outAmount) / amountIn,
          slippage: meteoraQuote.priceImpact,
          fee: meteoraQuote.fee,
          transactionSignature: result.signature,
        })
      }

      Logger.info("Swap executed via Meteora", {
        poolId,
        amountIn,
        outAmount: meteoraQuote.outAmount,
        signature: result.signature,
      })

      return {
        inAmount: meteoraQuote.inAmount,
        outAmount: meteoraQuote.outAmount,
        minOutAmount: meteoraQuote.minOutAmount,
        priceImpact: meteoraQuote.priceImpact,
        fee: meteoraQuote.fee,
        route: meteoraQuote.route,
      }
    } catch (error) {
      Logger.error("Swap failed via Meteora", error as Error, { poolId, amountIn, tokenIn })
      throw ErrorHandler.handle(error)
    }
  }

  async createMarket(marketData: {
    title: string
    description: string
    category: string
    endDate: Date
    creatorWallet: string
    bondAmount: number
  }): Promise<Market> {
    try {
      const slug = marketData.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .substring(0, 50)

      // Create YES and NO token mints (this would be more sophisticated in production)
      const usdcMint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v") // USDC
      const yesMint = new PublicKey("11111111111111111111111111111112") // Placeholder
      const noMint = new PublicKey("11111111111111111111111111111113") // Placeholder

      // Create Meteora pools for YES and NO outcomes
      // This would require actual token creation in production

      let oracleConfig = null
      if (marketData.title.toLowerCase().includes("eth")) {
        oracleConfig = {
          symbol: "ETH/USD",
          target_price: 5000,
          feed_id: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
        }
      }

      const market = await databaseService.createMarket({
        slug,
        title: marketData.title,
        description: marketData.description,
        category: marketData.category,
        creatorWallet: marketData.creatorWallet,
        endDate: marketData.endDate,
        bondAmount: marketData.bondAmount,
        oracleConfig,
      })

      Logger.info("Market created with Meteora integration", { marketId: market.id, slug })

      return market
    } catch (error) {
      Logger.error("Failed to create market with Meteora", error as Error, { marketData })
      throw ErrorHandler.handle(error)
    }
  }

  async resolveMarket(marketSlug: string): Promise<boolean> {
    try {
      const market = await databaseService.getMarket(marketSlug)
      if (!market || market.resolved) return false

      if (new Date() < market.endDate) return false

      let outcome: "YES" | "NO" | null = null

      if (marketSlug.includes("eth-5k")) {
        const resolution = await pythOracle.resolveMarket(marketSlug, 5000, "ETH/USD")
        if (resolution.resolved && resolution.outcome) {
          outcome = resolution.outcome
          Logger.info("Market resolved via oracle with Meteora", {
            marketSlug,
            outcome,
            currentPrice: resolution.currentPrice,
          })
        }
      }

      return outcome !== null
    } catch (error) {
      Logger.error("Market resolution failed with Meteora", error as Error, { marketSlug })
      return false
    }
  }
}

export const meteoraIntegratedDLMM = MeteoraIntegratedDLMMService.getInstance()
