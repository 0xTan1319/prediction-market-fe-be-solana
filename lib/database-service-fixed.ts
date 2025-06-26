import { supabase, setUserContext } from "./supabase"
import type { Database } from "@/types/database-fixed"
import type { Market, MarketOdds } from "@/types/market"
import type { Pool } from "@/types/dlmm"
import { ErrorHandler, Logger } from "./error-handling"
import { parseDecimal, formatDecimal } from "@/types/database-fixed"

type Tables = Database["public"]["Tables"]
type MarketRow = Tables["markets"]["Row"]
type PoolRow = Tables["pools"]["Row"]
type TradeRow = Tables["trades"]["Row"]
type UserRow = Tables["users"]["Row"]

export class DatabaseService {
  private static instance: DatabaseService

  static getInstance(): DatabaseService {
    if (!this.instance) {
      this.instance = new DatabaseService()
    }
    return this.instance
  }

  // Health check method
  async healthCheck(): Promise<{ component: string; status: string; details: string }[]> {
    try {
      const { data, error } = await supabase.rpc("health_check")

      if (error) {
        Logger.error("Health check failed", error)
        return [
          {
            component: "database",
            status: "error",
            details: error.message,
          },
        ]
      }

      return data || []
    } catch (error) {
      Logger.error("Health check exception", error as Error)
      return [
        {
          component: "database",
          status: "error",
          details: "Health check failed",
        },
      ]
    }
  }

  // User management with proper error handling
  async createOrUpdateUser(walletAddress: string, username?: string): Promise<UserRow> {
    try {
      if (!walletAddress || walletAddress.trim() === "") {
        throw new Error("Wallet address is required")
      }

      const { data, error } = await supabase
        .from("users")
        .upsert(
          {
            wallet_address: walletAddress.trim(),
            username: username?.trim() || null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "wallet_address",
          },
        )
        .select()
        .single()

      if (error) throw error

      // Set user context for RLS (with error handling)
      try {
        await setUserContext(walletAddress)
      } catch (contextError) {
        Logger.warn("Failed to set user context", contextError as Error, { walletAddress })
        // Don't fail the entire operation for context setting
      }

      Logger.info("User created/updated", { walletAddress, username })
      return data
    } catch (error) {
      Logger.error("Failed to create/update user", error as Error, { walletAddress })
      throw ErrorHandler.handle(error)
    }
  }

  async getUserByWallet(walletAddress: string): Promise<UserRow | null> {
    try {
      if (!walletAddress || walletAddress.trim() === "") {
        return null
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("wallet_address", walletAddress.trim())
        .single()

      if (error && error.code !== "PGRST116") throw error // PGRST116 = no rows returned

      return data || null
    } catch (error) {
      Logger.error("Failed to get user by wallet", error as Error, { walletAddress })
      throw ErrorHandler.handle(error)
    }
  }

  // Market management with type conversion
  async getMarkets(filters?: {
    category?: string
    resolved?: boolean
    limit?: number
    offset?: number
  }): Promise<Market[]> {
    try {
      let query = supabase
        .from("markets")
        .select(`
          *,
          pools!markets_id_fkey (*)
        `)
        .order("created_at", { ascending: false })

      if (filters?.category) {
        query = query.eq("category", filters.category)
      }

      if (filters?.resolved !== undefined) {
        query = query.eq("resolved", filters.resolved)
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map(this.mapMarketRowToMarket)
    } catch (error) {
      Logger.error("Failed to get markets", error as Error, { filters })
      throw ErrorHandler.handle(error)
    }
  }

  async getMarket(slug: string): Promise<Market | null> {
    try {
      if (!slug || slug.trim() === "") {
        return null
      }

      const { data, error } = await supabase
        .from("markets")
        .select(`
          *,
          pools!markets_id_fkey (
            *,
            pool_bins (*)
          )
        `)
        .eq("slug", slug.trim())
        .single()

      if (error && error.code !== "PGRST116") throw error

      return data ? this.mapMarketRowToMarket(data) : null
    } catch (error) {
      Logger.error("Failed to get market", error as Error, { slug })
      throw ErrorHandler.handle(error)
    }
  }

  async createMarket(marketData: {
    slug: string
    title: string
    description?: string
    category: string
    creatorWallet: string
    endDate: Date
    bondAmount: number
    oracleConfig?: any
  }): Promise<Market> {
    try {
      // Validate input data
      if (!marketData.slug || !marketData.title || !marketData.category || !marketData.creatorWallet) {
        throw new Error("Missing required market data")
      }

      // Get or create user
      const user = await this.createOrUpdateUser(marketData.creatorWallet)

      // Create market with proper type conversion
      const { data: market, error: marketError } = await supabase
        .from("markets")
        .insert({
          slug: marketData.slug.trim(),
          title: marketData.title.trim(),
          description: marketData.description?.trim() || null,
          category: marketData.category.trim(),
          creator_id: user.id,
          end_date: marketData.endDate.toISOString(),
          bond_amount: formatDecimal(marketData.bondAmount),
          yes_pool_id: `${marketData.slug}-yes-pool`,
          no_pool_id: `${marketData.slug}-no-pool`,
          oracle_config: marketData.oracleConfig,
        })
        .select()
        .single()

      if (marketError) throw marketError

      // Create YES and NO pools
      const poolsData = [
        {
          id: `${marketData.slug}-yes-pool`,
          market_id: market.id,
          outcome: "YES" as const,
          token_a: "USDC",
          token_b: `YES-${marketData.slug.toUpperCase()}`,
          liquidity: formatDecimal(0),
          price: formatDecimal(0.5),
        },
        {
          id: `${marketData.slug}-no-pool`,
          market_id: market.id,
          outcome: "NO" as const,
          token_a: "USDC",
          token_b: `NO-${marketData.slug.toUpperCase()}`,
          liquidity: formatDecimal(0),
          price: formatDecimal(0.5),
        },
      ]

      const { error: poolsError } = await supabase.from("pools").insert(poolsData)

      if (poolsError) throw poolsError

      Logger.info("Market created successfully", { marketId: market.id, slug: marketData.slug })

      return this.mapMarketRowToMarket(market)
    } catch (error) {
      Logger.error("Failed to create market", error as Error, { marketData })
      throw ErrorHandler.handle(error)
    }
  }

  // Pool management with type conversion
  async getPool(poolId: string): Promise<Pool | null> {
    try {
      if (!poolId || poolId.trim() === "") {
        return null
      }

      const { data, error } = await supabase
        .from("pools")
        .select(`
          *,
          pool_bins (*)
        `)
        .eq("id", poolId.trim())
        .single()

      if (error && error.code !== "PGRST116") throw error

      return data ? this.mapPoolRowToPool(data) : null
    } catch (error) {
      Logger.error("Failed to get pool", error as Error, { poolId })
      throw ErrorHandler.handle(error)
    }
  }

  async updatePoolLiquidity(poolId: string, liquidityChange: number, priceChange?: number): Promise<void> {
    try {
      if (!poolId || poolId.trim() === "") {
        throw new Error("Pool ID is required")
      }

      const updateData: any = {
        liquidity: formatDecimal(Math.max(0, liquidityChange)),
        updated_at: new Date().toISOString(),
      }

      if (priceChange !== undefined) {
        updateData.price = formatDecimal(Math.max(0, Math.min(1, priceChange)))
      }

      const { error } = await supabase.from("pools").update(updateData).eq("id", poolId.trim())

      if (error) throw error

      Logger.info("Pool liquidity updated", { poolId, liquidityChange, priceChange })
    } catch (error) {
      Logger.error("Failed to update pool liquidity", error as Error, { poolId, liquidityChange })
      throw ErrorHandler.handle(error)
    }
  }

  // Optimized market odds with proper error handling
  async getMarketOdds(marketSlug: string): Promise<MarketOdds | null> {
    try {
      if (!marketSlug || marketSlug.trim() === "") {
        Logger.warn("Empty market slug provided")
        return null
      }

      const { data, error } = await supabase.rpc("get_market_odds", {
        market_slug: marketSlug.trim(),
      })

      if (error) {
        Logger.error("Database function failed for market odds", error, { marketSlug })
        return this.getMarketOddsFallback(marketSlug)
      }

      if (!data || data.length === 0) {
        Logger.warn("No data returned from market odds function", { marketSlug })
        return this.getMarketOddsFallback(marketSlug)
      }

      const result = data[0]

      // Check if market exists
      if (!result.market_exists) {
        Logger.warn("Market does not exist", { marketSlug })
        return null
      }

      // Parse and validate the decimal values
      const yesPrice = parseDecimal(result.yes_price)
      const noPrice = parseDecimal(result.no_price)
      const totalLiquidity = parseDecimal(result.total_liquidity)
      const yesLiquidity = parseDecimal(result.yes_liquidity)

      // Validate data integrity
      if (yesPrice < 0 || yesPrice > 1 || noPrice < 0 || noPrice > 1) {
        Logger.warn("Invalid price data", { marketSlug, yesPrice, noPrice })
        return this.getMarketOddsFallback(marketSlug)
      }

      const liquidityRatio = totalLiquidity > 0 ? yesLiquidity / totalLiquidity : 0.5
      const yesImpliedProbability = Math.max(0, Math.min(100, yesPrice * 100))
      const noImpliedProbability = Math.max(0, Math.min(100, noPrice * 100))
      const confidence = Math.min(totalLiquidity / 100000, 1) * 100

      Logger.info("Market odds calculated successfully", {
        marketSlug,
        yesPrice,
        noPrice,
        totalLiquidity,
        confidence,
      })

      return {
        yes: yesPrice,
        no: noPrice,
        yesImpliedProbability,
        noImpliedProbability,
        liquidityRatio,
        confidence,
      }
    } catch (error) {
      Logger.error("Failed to get market odds", error as Error, { marketSlug })
      return this.getMarketOddsFallback(marketSlug)
    }
  }

  // Fallback method for market odds
  private async getMarketOddsFallback(marketSlug: string): Promise<MarketOdds | null> {
    try {
      Logger.info("Using fallback method for market odds", { marketSlug })

      const { data: market, error: marketError } = await supabase
        .from("markets")
        .select("id, slug")
        .eq("slug", marketSlug.trim())
        .single()

      if (marketError || !market) {
        Logger.warn("Market not found in fallback", { marketSlug })
        return {
          yes: 0.5,
          no: 0.5,
          yesImpliedProbability: 50,
          noImpliedProbability: 50,
          liquidityRatio: 0.5,
          confidence: 0,
        }
      }

      const { data: pools, error: poolsError } = await supabase.from("pools").select("*").eq("market_id", market.id)

      if (poolsError) {
        Logger.error("Failed to get pools in fallback", poolsError, { marketSlug })
        throw poolsError
      }

      if (!pools || pools.length < 2) {
        Logger.warn("Insufficient pools in fallback", { marketSlug, poolCount: pools?.length || 0 })
        return {
          yes: 0.5,
          no: 0.5,
          yesImpliedProbability: 50,
          noImpliedProbability: 50,
          liquidityRatio: 0.5,
          confidence: 0,
        }
      }

      const yesPool = pools.find((p) => p.outcome === "YES")
      const noPool = pools.find((p) => p.outcome === "NO")

      if (!yesPool || !noPool) {
        Logger.warn("Missing YES or NO pool in fallback", { marketSlug, hasYes: !!yesPool, hasNo: !!noPool })
        return {
          yes: 0.5,
          no: 0.5,
          yesImpliedProbability: 50,
          noImpliedProbability: 50,
          liquidityRatio: 0.5,
          confidence: 0,
        }
      }

      const yesLiquidity = parseDecimal(yesPool.liquidity)
      const noLiquidity = parseDecimal(noPool.liquidity)
      const totalLiquidity = yesLiquidity + noLiquidity
      const liquidityRatio = totalLiquidity > 0 ? yesLiquidity / totalLiquidity : 0.5

      const yesPrice = parseDecimal(yesPool.price)
      const noPrice = parseDecimal(noPool.price)

      const yesImpliedProbability = Math.max(0, Math.min(100, yesPrice * 100))
      const noImpliedProbability = Math.max(0, Math.min(100, noPrice * 100))
      const confidence = Math.min(totalLiquidity / 100000, 1) * 100

      return {
        yes: yesPrice,
        no: noPrice,
        yesImpliedProbability,
        noImpliedProbability,
        liquidityRatio,
        confidence,
      }
    } catch (error) {
      Logger.error("Fallback market odds calculation failed", error as Error, { marketSlug })
      return {
        yes: 0.5,
        no: 0.5,
        yesImpliedProbability: 50,
        noImpliedProbability: 50,
        liquidityRatio: 0.5,
        confidence: 0,
      }
    }
  }

  // Trade management with proper type conversion
  async createTrade(tradeData: {
    userWallet: string
    marketId: string
    poolId: string
    outcome: "YES" | "NO"
    tradeType: "BUY" | "SELL"
    amountIn: number
    amountOut: number
    price: number
    slippage?: number
    fee?: number
    transactionSignature?: string
  }): Promise<TradeRow> {
    try {
      // Validate input data
      if (!tradeData.userWallet || !tradeData.marketId || !tradeData.poolId) {
        throw new Error("Missing required trade data")
      }

      const user = await this.createOrUpdateUser(tradeData.userWallet)

      const { data, error } = await supabase
        .from("trades")
        .insert({
          user_id: user.id,
          market_id: tradeData.marketId,
          pool_id: tradeData.poolId,
          outcome: tradeData.outcome,
          trade_type: tradeData.tradeType,
          amount_in: formatDecimal(tradeData.amountIn),
          amount_out: formatDecimal(tradeData.amountOut),
          price: formatDecimal(tradeData.price),
          slippage: tradeData.slippage ? formatDecimal(tradeData.slippage) : null,
          fee: tradeData.fee ? formatDecimal(tradeData.fee) : null,
          transaction_signature: tradeData.transactionSignature,
          status: "PENDING",
        })
        .select()
        .single()

      if (error) throw error

      Logger.info("Trade created", { tradeId: data.id, userWallet: tradeData.userWallet })
      return data
    } catch (error) {
      Logger.error("Failed to create trade", error as Error, { tradeData })
      throw ErrorHandler.handle(error)
    }
  }

  async updateTradeStatus(tradeId: string, status: "CONFIRMED" | "FAILED", signature?: string): Promise<void> {
    try {
      if (!tradeId || tradeId.trim() === "") {
        throw new Error("Trade ID is required")
      }

      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      }

      if (signature) {
        updateData.transaction_signature = signature
      }

      const { error } = await supabase.from("trades").update(updateData).eq("id", tradeId.trim())

      if (error) throw error

      Logger.info("Trade status updated", { tradeId, status })
    } catch (error) {
      Logger.error("Failed to update trade status", error as Error, { tradeId, status })
      throw ErrorHandler.handle(error)
    }
  }

  async getUserTrades(userWallet: string, limit = 50): Promise<TradeRow[]> {
    try {
      if (!userWallet || userWallet.trim() === "") {
        return []
      }

      const user = await this.getUserByWallet(userWallet)
      if (!user) return []

      const { data, error } = await supabase
        .from("trades")
        .select(`
          *,
          markets (title, slug)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(Math.max(1, Math.min(100, limit))) // Ensure reasonable limits

      if (error) throw error

      return data || []
    } catch (error) {
      Logger.error("Failed to get user trades", error as Error, { userWallet })
      throw ErrorHandler.handle(error)
    }
  }

  // Price history with validation
  async savePriceData(symbol: string, price: number, confidence?: number): Promise<void> {
    try {
      if (!symbol || symbol.trim() === "" || price <= 0) {
        Logger.warn("Invalid price data", { symbol, price })
        return
      }

      const { error } = await supabase.from("price_history").insert({
        symbol: symbol.trim(),
        price: formatDecimal(price),
        confidence: confidence ? formatDecimal(confidence) : null,
        source: "PYTH",
      })

      if (error) {
        Logger.warn("Failed to save price data", error, { symbol, price })
        // Don't throw error for price history failures
      }
    } catch (error) {
      Logger.warn("Price data save exception", error as Error, { symbol, price })
      // Don't throw error for price history failures
    }
  }

  // Helper methods with proper type conversion
  private mapMarketRowToMarket(row: any): Market {
    return {
      id: row.slug, // Use slug as external ID
      title: row.title || "",
      description: row.description || "",
      category: row.category || "other",
      endDate: new Date(row.end_date),
      resolved: Boolean(row.resolved),
      winningOutcome: row.winning_outcome,
      yesPoolId: row.yes_pool_id || "",
      noPoolId: row.no_pool_id || "",
      totalVolume: parseDecimal(row.total_volume),
      createdAt: new Date(row.created_at),
    }
  }

  private mapPoolRowToPool(row: any): Pool {
    return {
      id: row.id || "",
      tokenA: row.token_a || "",
      tokenB: row.token_b || "",
      liquidity: parseDecimal(row.liquidity),
      price: parseDecimal(row.price),
      volume24h: parseDecimal(row.volume_24h),
      fees: parseDecimal(row.fees),
      bins:
        row.pool_bins?.map((bin: any) => ({
          id: bin.bin_id || 0,
          price: parseDecimal(bin.price),
          liquidityX: parseDecimal(bin.liquidity_x),
          liquidityY: parseDecimal(bin.liquidity_y),
          feeRate: parseDecimal(bin.fee_rate),
        })) || [],
    }
  }
}

export const databaseService = DatabaseService.getInstance()
