import { supabase, setUserContext } from "./supabase"
import type { Database } from "@/types/database"
import type { Market, MarketOdds } from "@/types/market"
import type { Pool } from "@/types/dlmm"
import { ErrorHandler, Logger } from "./error-handling"

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

  // User management
  async createOrUpdateUser(walletAddress: string, username?: string): Promise<UserRow> {
    try {
      const { data, error } = await supabase
        .from("users")
        .upsert(
          {
            wallet_address: walletAddress,
            username: username || null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "wallet_address",
          },
        )
        .select()
        .single()

      if (error) throw error

      // Set user context for RLS
      await setUserContext(walletAddress)

      Logger.info("User created/updated", { walletAddress, username })
      return data
    } catch (error) {
      Logger.error("Failed to create/update user", error as Error, { walletAddress })
      throw ErrorHandler.handle(error)
    }
  }

  async getUserByWallet(walletAddress: string): Promise<UserRow | null> {
    try {
      const { data, error } = await supabase.from("users").select("*").eq("wallet_address", walletAddress).single()

      if (error && error.code !== "PGRST116") throw error // PGRST116 = no rows returned

      return data || null
    } catch (error) {
      Logger.error("Failed to get user by wallet", error as Error, { walletAddress })
      throw ErrorHandler.handle(error)
    }
  }

  // Market management
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

      return data.map(this.mapMarketRowToMarket)
    } catch (error) {
      Logger.error("Failed to get markets", error as Error, { filters })
      throw ErrorHandler.handle(error)
    }
  }

  async getMarket(slug: string): Promise<Market | null> {
    try {
      const { data, error } = await supabase
        .from("markets")
        .select(`
          *,
          pools!markets_id_fkey (
            *,
            pool_bins (*)
          )
        `)
        .eq("slug", slug)
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
      // Get or create user
      const user = await this.createOrUpdateUser(marketData.creatorWallet)

      // Create market
      const { data: market, error: marketError } = await supabase
        .from("markets")
        .insert({
          slug: marketData.slug,
          title: marketData.title,
          description: marketData.description,
          category: marketData.category,
          creator_id: user.id,
          end_date: marketData.endDate.toISOString(),
          bond_amount: marketData.bondAmount,
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
          liquidity: 0,
          price: 0.5,
        },
        {
          id: `${marketData.slug}-no-pool`,
          market_id: market.id,
          outcome: "NO" as const,
          token_a: "USDC",
          token_b: `NO-${marketData.slug.toUpperCase()}`,
          liquidity: 0,
          price: 0.5,
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

  // Pool management
  async getPool(poolId: string): Promise<Pool | null> {
    try {
      const { data, error } = await supabase
        .from("pools")
        .select(`
          *,
          pool_bins (*)
        `)
        .eq("id", poolId)
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
      const updateData: any = {
        liquidity: liquidityChange,
        updated_at: new Date().toISOString(),
      }

      if (priceChange !== undefined) {
        updateData.price = priceChange
      }

      const { error } = await supabase.from("pools").update(updateData).eq("id", poolId)

      if (error) throw error

      Logger.info("Pool liquidity updated", { poolId, liquidityChange, priceChange })
    } catch (error) {
      Logger.error("Failed to update pool liquidity", error as Error, { poolId, liquidityChange })
      throw ErrorHandler.handle(error)
    }
  }

  // Trade management
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
      const user = await this.createOrUpdateUser(tradeData.userWallet)

      const { data, error } = await supabase
        .from("trades")
        .insert({
          user_id: user.id,
          market_id: tradeData.marketId,
          pool_id: tradeData.poolId,
          outcome: tradeData.outcome,
          trade_type: tradeData.tradeType,
          amount_in: tradeData.amountIn,
          amount_out: tradeData.amountOut,
          price: tradeData.price,
          slippage: tradeData.slippage,
          fee: tradeData.fee,
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
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      }

      if (signature) {
        updateData.transaction_signature = signature
      }

      const { error } = await supabase.from("trades").update(updateData).eq("id", tradeId)

      if (error) throw error

      Logger.info("Trade status updated", { tradeId, status })
    } catch (error) {
      Logger.error("Failed to update trade status", error as Error, { tradeId, status })
      throw ErrorHandler.handle(error)
    }
  }

  async getUserTrades(userWallet: string, limit = 50): Promise<TradeRow[]> {
    try {
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
        .limit(limit)

      if (error) throw error

      return data || []
    } catch (error) {
      Logger.error("Failed to get user trades", error as Error, { userWallet })
      throw ErrorHandler.handle(error)
    }
  }

  // Optimized market odds calculation using database function
  async getMarketOddsOptimized(marketSlug: string): Promise<MarketOdds | null> {
    try {
      const { data, error } = await supabase.rpc("get_market_odds", {
        market_slug: marketSlug,
      })

      if (error) {
        Logger.error("Database function failed for market odds", error, { marketSlug })
        // Fallback to regular method
        return this.getMarketOdds(marketSlug)
      }

      if (!data || data.length === 0) {
        Logger.warn("No data returned from market odds function", { marketSlug })
        return null
      }

      const result = data[0]
      const yesPrice = Number(result.yes_price) || 0.5
      const noPrice = Number(result.no_price) || 0.5
      const totalLiquidity = Number(result.total_liquidity) || 0
      const yesLiquidity = Number(result.yes_liquidity) || 0

      const liquidityRatio = totalLiquidity > 0 ? yesLiquidity / totalLiquidity : 0.5
      const yesImpliedProbability = yesPrice * 100
      const noImpliedProbability = noPrice * 100
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
      Logger.error("Optimized market odds calculation failed", error as Error, { marketSlug })
      // Fallback to regular method
      return this.getMarketOdds(marketSlug)
    }
  }

  async getMarketOdds(marketSlug: string): Promise<MarketOdds | null> {
    // Try optimized version first
    const optimizedResult = await this.getMarketOddsOptimized(marketSlug)
    if (optimizedResult) {
      return optimizedResult
    }

    // Fallback to original implementation
    try {
      const { data: market, error: marketError } = await supabase
        .from("markets")
        .select("id, slug")
        .eq("slug", marketSlug)
        .single()

      if (marketError || !market) {
        Logger.error("Market not found for odds calculation", marketError, { marketSlug })
        return null
      }

      const { data: pools, error: poolsError } = await supabase.from("pools").select("*").eq("market_id", market.id)

      if (poolsError) {
        Logger.error("Failed to get pools for market", poolsError, { marketSlug, marketId: market.id })
        throw poolsError
      }

      if (!pools || pools.length < 2) {
        Logger.warn("Insufficient pools for market odds", { marketSlug, poolCount: pools?.length || 0 })
        return null
      }

      const yesPool = pools.find((p) => p.outcome === "YES")
      const noPool = pools.find((p) => p.outcome === "NO")

      if (!yesPool || !noPool) {
        Logger.warn("Missing YES or NO pool", { marketSlug, hasYes: !!yesPool, hasNo: !!noPool })
        return null
      }

      const totalLiquidity = yesPool.liquidity + noPool.liquidity
      const liquidityRatio = totalLiquidity > 0 ? yesPool.liquidity / totalLiquidity : 0.5

      const yesPrice = Number(yesPool.price) || 0.5
      const noPrice = Number(noPool.price) || 0.5

      const yesImpliedProbability = yesPrice * 100
      const noImpliedProbability = noPrice * 100
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
      throw ErrorHandler.handle(error)
    }
  }

  async getMarketIdBySlug(slug: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.from("markets").select("id").eq("slug", slug).single()

      if (error && error.code !== "PGRST116") throw error

      return data?.id || null
    } catch (error) {
      Logger.error("Failed to get market ID by slug", error as Error, { slug })
      return null
    }
  }

  // Price history
  async savePriceData(symbol: string, price: number, confidence?: number): Promise<void> {
    try {
      const { error } = await supabase.from("price_history").insert({
        symbol,
        price,
        confidence,
        source: "PYTH",
      })

      if (error) throw error
    } catch (error) {
      Logger.error("Failed to save price data", error as Error, { symbol, price })
      // Don't throw error for price history failures
    }
  }

  // Helper methods
  private mapMarketRowToMarket(row: any): Market {
    return {
      id: row.slug, // Use slug as external ID
      title: row.title,
      description: row.description || "",
      category: row.category,
      endDate: new Date(row.end_date),
      resolved: row.resolved,
      winningOutcome: row.winning_outcome,
      yesPoolId: row.yes_pool_id || "",
      noPoolId: row.no_pool_id || "",
      totalVolume: row.total_volume || 0,
      createdAt: new Date(row.created_at),
    }
  }

  private mapPoolRowToPool(row: any): Pool {
    return {
      id: row.id,
      tokenA: row.token_a,
      tokenB: row.token_b,
      liquidity: row.liquidity,
      price: row.price,
      volume24h: row.volume_24h,
      fees: row.fees,
      bins:
        row.pool_bins?.map((bin: any) => ({
          id: bin.bin_id,
          price: bin.price,
          liquidityX: bin.liquidity_x,
          liquidityY: bin.liquidity_y,
          feeRate: bin.fee_rate,
        })) || [],
    }
  }
}

export const databaseService = DatabaseService.getInstance()
