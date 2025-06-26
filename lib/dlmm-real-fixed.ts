import type { Pool, SwapQuote } from "@/types/dlmm"
import type { Market, MarketOdds } from "@/types/market"
import { pythOracle } from "./pyth-oracle"
import { transactionService, type TransactionResult } from "./transaction-service"
import { ErrorHandler, AppError, ErrorType, Logger } from "./error-handling"
import { databaseService } from "./database-service-relationship-fix" // Updated import
// @ts-ignore - Temporary workaround for missing @solana/wallet-adapter-react
import type { WalletContextState } from "@solana/wallet-adapter-react"
import { PublicKey } from "@solana/web3.js"

// Real DLMM service implementation with fixed database integration
class RealDLMMService {
  private static instance: RealDLMMService

  static getInstance(): RealDLMMService {
    if (!this.instance) {
      this.instance = new RealDLMMService()
      this.instance.initializeRealData()
    }
    return this.instance
  }

  private async initializeRealData() {
    try {
      // Test database connection first
      const healthCheck = await databaseService.healthCheck()
      Logger.info("Database health check", { healthCheck })

      // Start real-time price updates
      this.startRealTimePriceUpdates()

      Logger.info("Real DLMM service with fixed database initialized successfully")
    } catch (error) {
      Logger.error("Failed to initialize real DLMM service", error as Error)
      console.warn("Using fallback mode for DLMM service")
    }
  }

  private startRealTimePriceUpdates() {
    // Update prices every 30 seconds using real oracle data
    setInterval(async () => {
      try {
        await this.updatePricesFromOracle()
      } catch (error) {
        Logger.error("Failed to update prices from oracle", error as Error)
      }
    }, 30000)
  }

  private async updatePricesFromOracle() {
    try {
      const [ethPrice, btcPrice, solPrice] = await Promise.all([
        pythOracle.getPrice("ETH/USD"),
        pythOracle.getPrice("BTC/USD"),
        pythOracle.getPrice("SOL/USD"),
      ])

      // Save price data to database (this should now work with fixed RLS)
      const pricePromises = []

      if (ethPrice) {
        pricePromises.push(databaseService.savePriceData("ETH/USD", ethPrice.price, ethPrice.confidence))
        pricePromises.push(this.updateMarketOddsFromPrice("eth-5k-july-2024", ethPrice.price, 5000))
      }

      if (btcPrice) {
        pricePromises.push(databaseService.savePriceData("BTC/USD", btcPrice.price, btcPrice.confidence))
        pricePromises.push(this.updateMarketOddsFromPrice("btc-100k-2024", btcPrice.price, 100000))
      }

      if (solPrice) {
        pricePromises.push(databaseService.savePriceData("SOL/USD", solPrice.price, solPrice.confidence))
        pricePromises.push(this.updateMarketOddsFromPrice("sol-200-2024", solPrice.price, 200))
      }

      // Execute all price updates concurrently
      await Promise.allSettled(pricePromises)
    } catch (error) {
      Logger.error("Failed to update prices from oracle", error as Error)
    }
  }

  private async updateMarketOddsFromPrice(marketSlug: string, currentPrice: number, targetPrice: number) {
    try {
      // Use the fixed database service to get market
      const market = await databaseService.getMarket(marketSlug)
      if (!market || market.resolved) {
        Logger.info("Market not found or already resolved", { marketSlug })
        return
      }

      // Calculate implied probability based on current price vs target
      const timeToExpiry = Math.max(1, (market.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) // days
      const priceRatio = currentPrice / targetPrice

      // Simple probability model (in production, this would be more sophisticated)
      const impliedProbability = Math.min(0.95, Math.max(0.05, priceRatio * (1 - 0.1 / Math.sqrt(timeToExpiry))))

      // Update pool prices to reflect new probability
      if (market.yesPoolId && market.noPoolId) {
        await Promise.allSettled([
          databaseService.updatePoolLiquidity(market.yesPoolId, 0, impliedProbability),
          databaseService.updatePoolLiquidity(market.noPoolId, 0, 1 - impliedProbability),
        ])

        Logger.info("Market odds updated successfully", {
          marketSlug,
          currentPrice,
          targetPrice,
          impliedProbability,
        })
      }
    } catch (error) {
      Logger.error("Failed to update market odds from price", error as Error, {
        marketSlug,
        currentPrice,
        targetPrice,
      })
    }
  }

  async getMarkets(): Promise<Market[]> {
    try {
      return await databaseService.getMarkets({ resolved: false, limit: 50 })
    } catch (error) {
      Logger.error("Failed to get markets from database", error as Error)
      throw ErrorHandler.handle(error)
    }
  }

  async getMarket(slug: string): Promise<Market | null> {
    try {
      return await databaseService.getMarket(slug)
    } catch (error) {
      Logger.error("Failed to get market from database", error as Error, { slug })
      throw ErrorHandler.handle(error)
    }
  }

  async getPool(id: string): Promise<Pool | null> {
    try {
      return await databaseService.getPool(id)
    } catch (error) {
      Logger.error("Failed to get pool from database", error as Error, { id })
      throw ErrorHandler.handle(error)
    }
  }

  async getMarketOdds(marketSlug: string): Promise<MarketOdds | null> {
    try {
      // Use the fixed database service directly with the slug
      const odds = await databaseService.getMarketOdds(marketSlug)

      if (!odds) {
        Logger.warn("No odds found for market", { marketSlug })
        return null
      }

      // Apply real-time price adjustments if available
      if (marketSlug.includes("eth")) {
        try {
          const ethPrice = await pythOracle.getPrice("ETH/USD")
          if (ethPrice) {
            // Adjust odds based on current ETH price vs target
            const targetPrice = 5000
            const priceInfluence = Math.min(20, Math.max(-20, (ethPrice.price - targetPrice) / 100))

            let adjustedYesProbability = odds.yesImpliedProbability + priceInfluence
            adjustedYesProbability = Math.max(5, Math.min(95, adjustedYesProbability))

            const adjustedNoProbability = 100 - adjustedYesProbability

            return {
              ...odds,
              yesImpliedProbability: adjustedYesProbability,
              noImpliedProbability: adjustedNoProbability,
              yes: adjustedYesProbability / 100,
              no: adjustedNoProbability / 100,
            }
          }
        } catch (priceError) {
          Logger.warn(`Failed to get price adjustment for odds: ${(priceError as Error).message} (market: ${marketSlug})`)
          // Continue with base odds if price adjustment fails
        }
      }

      return odds
    } catch (error) {
      Logger.error("Failed to get market odds in DLMM service", error as Error, { marketSlug })
      throw ErrorHandler.handle(error)
    }
  }

  async addLiquidity(
    wallet: WalletContextState,
    poolId: string,
    amount: number,
    binId?: number,
  ): Promise<TransactionResult> {
    try {
      if (!wallet.publicKey) {
        throw new AppError(ErrorType.WALLET_NOT_CONNECTED, "Wallet not connected")
      }

      const result = await transactionService.addLiquidity(wallet, poolId, amount, amount)

      if (result.success) {
        // Update database with new liquidity
        await databaseService.updatePoolLiquidity(poolId, amount)

        Logger.info("Liquidity added successfully", { poolId, amount, signature: result.signature })
      }

      return result
    } catch (error) {
      Logger.error("Failed to add liquidity", error as Error, { poolId, amount })
      throw ErrorHandler.handle(error)
    }
  }

  async swap(wallet: WalletContextState, poolId: string, amountIn: number, tokenIn: string): Promise<SwapQuote | null> {
    try {
      if (!wallet.publicKey) {
        throw new AppError(ErrorType.WALLET_NOT_CONNECTED, "Wallet not connected")
      }

      const pool = await databaseService.getPool(poolId)
      if (!pool) {
        throw new AppError(ErrorType.INVALID_INPUT, "Pool not found")
      }

      // Calculate swap with real slippage and fees
      const priceImpact = (amountIn / pool.liquidity) * 100
      // Calculate fee (0.3% of amountIn)
      const feePercentage = 0.003
      const fee = amountIn * feePercentage
      const amountAfterFee = amountIn - fee
      const outAmount = amountAfterFee * pool.price * (1 - priceImpact / 100)

      if (outAmount <= 0) {
        throw new AppError(ErrorType.SLIPPAGE_EXCEEDED, "Insufficient output amount")
      }

      // Execute the actual swap transaction
      const swapParams = {
        userWallet: wallet.publicKey,
        inputMint: new PublicKey(pool.tokenA === "USDC" ? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" : pool.tokenA),
        outputMint: new PublicKey(pool.tokenB),
        inputAmount: amountIn,
        minimumOutputAmount: outAmount * 0.99, // 1% slippage tolerance
        slippageTolerance: 1,
      }

      const result = await transactionService.executeSwap(wallet, swapParams)

      if (!result.success) {
        throw new AppError(ErrorType.TRANSACTION_FAILED, result.error || "Swap failed")
      }

      // Create trade record in database
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
        amountOut: outAmount,
        price: pool.price,
        slippage: priceImpact,
        fee,
        transactionSignature: result.signature,
      })

      // Distribute fee to liquidity providers (50% to each pool)
      if (market) {
        const otherPoolId = outcome === "YES" ? market.noPoolId : market.yesPoolId
        if (otherPoolId) {
          await Promise.all([
            databaseService.updatePoolLiquidity(poolId, fee * 0.5),
            databaseService.updatePoolLiquidity(otherPoolId, fee * 0.5)
          ])
        }
      }
      }

      Logger.info("Swap executed successfully", {
        poolId,
        amountIn,
        outAmount,
        signature: result.signature,
      })

      return {
        inAmount: amountIn.toString(),
        outAmount: outAmount.toString(),
        minOutAmount: (outAmount * 0.99).toString(),
        priceImpact,
        fee,
        route: [tokenIn, pool.tokenB],
      }
    } catch (error) {
      Logger.error("Swap failed", error as Error, { poolId, amountIn, tokenIn })
      throw ErrorHandler.handle(error)
    }
  }

  async resolveMarket(marketSlug: string): Promise<boolean> {
    try {
      const market = await databaseService.getMarket(marketSlug)
      if (!market || market.resolved) return false

      // Check if market end date has passed
      if (new Date() < market.endDate) return false

      let outcome: "YES" | "NO" | null = null

      if (marketSlug.includes("eth-5k")) {
        const resolution = await pythOracle.resolveMarket(marketSlug, 5000, "ETH/USD")
        if (resolution.resolved && resolution.outcome) {
          outcome = resolution.outcome

          Logger.info("Market resolved via oracle", {
            marketSlug,
            outcome,
            currentPrice: resolution.currentPrice,
            confidence: resolution.confidence,
          })
        }
      }

      return outcome !== null
    } catch (error) {
      Logger.error("Market resolution failed", error as Error, { marketSlug })
      return false
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

      // Determine oracle config based on market content
      let oracleConfig = null
      if (marketData.title.toLowerCase().includes("eth")) {
        oracleConfig = {
          symbol: "ETH/USD",
          target_price: 5000, // This would be extracted from the title
          feed_id: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
        }
      }

      return await databaseService.createMarket({
        slug,
        title: marketData.title,
        description: marketData.description,
        category: marketData.category,
        creatorWallet: marketData.creatorWallet,
        endDate: marketData.endDate,
        bondAmount: marketData.bondAmount,
        oracleConfig,
      })
    } catch (error) {
      Logger.error("Failed to create market", error as Error, { marketData })
      throw ErrorHandler.handle(error)
    }
  }
}

export const realDLMMService = RealDLMMService.getInstance()
