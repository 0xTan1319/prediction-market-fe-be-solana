import { createClient } from "@supabase/supabase-js"
import type { Market, MarketOdds } from "@/types/market"
import type { Pool } from "@/types/dlmm"
import { Logger } from "./error-handling"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export class DatabaseServiceMeteora {
  private static instance: DatabaseServiceMeteora
  private supabase = createClient(supabaseUrl, supabaseKey)

  static getInstance(): DatabaseServiceMeteora {
    if (!this.instance) {
      this.instance = new DatabaseServiceMeteora()
    }
    return this.instance
  }

  // New method to update pool from Meteora data
  async updatePoolFromMeteora(poolData: {
    id: string
    tokenA: string
    tokenB: string
    liquidity: number
    price: number
    fees: number
    binStep: number
    activeId: number
  }): Promise<void> {
    try {
      const { error } = await this.supabase.from("pools").upsert({
        id: poolData.id,
        token_a: poolData.tokenA,
        token_b: poolData.tokenB,
        liquidity: poolData.liquidity,
        price: poolData.price,
        fees: poolData.fees,
        bin_step: poolData.binStep,
        active_id: poolData.activeId,
        updated_at: new Date().toISOString(),
      })

      if (error) {
        throw error
      }

      Logger.info("Pool updated from Meteora data", { poolId: poolData.id })
    } catch (error) {
      Logger.error("Failed to update pool from Meteora", error as Error, { poolId: poolData.id })
      throw error
    }
  }

  // New method to update pool price from Meteora
  async updatePoolPrice(poolId: string, price: number): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("pools")
        .update({
          price,
          updated_at: new Date().toISOString(),
        })
        .eq("id", poolId)

      if (error) {
        throw error
      }

      Logger.info("Pool price updated from Meteora", { poolId, price })
    } catch (error) {
      Logger.error("Failed to update pool price", error as Error, { poolId, price })
      throw error
    }
  }

  // Enhanced method to get market odds with Meteora integration
  async getMarketOddsWithMeteora(marketSlug: string): Promise<MarketOdds | null> {
    try {
      const { data: market, error: marketError } = await this.supabase
        .from("markets")
        .select(`
          *,
          yes_pool:pools!markets_yes_pool_id_fkey(*),
          no_pool:pools!markets_no_pool_id_fkey(*)
        `)
        .eq("slug", marketSlug)
        .single()

      if (marketError || !market) {
        Logger.warn("Market not found for odds calculation", { marketSlug })
        return null
      }

      const yesPool = market.yes_pool
      const noPool = market.no_pool

      if (!yesPool || !noPool) {
        Logger.warn("Pools not found for market", { marketSlug })
        return null
      }

      // Calculate odds from Meteora pool prices
      const yesPrice = yesPool.price || 0.5
      const noPrice = noPool.price || 0.5

      const totalPrice = yesPrice + noPrice
      const yesImpliedProbability = (yesPrice / totalPrice) * 100
      const noImpliedProbability = (noPrice / totalPrice) * 100

      return {
        marketId: market.id,
        yes: yesPrice,
        no: noPrice,
        yesImpliedProbability,
        noImpliedProbability,
        lastUpdated: new Date(yesPool.updated_at || noPool.updated_at),
        volume24h: (yesPool.volume_24h || 0) + (noPool.volume_24h || 0),
        liquidity: (yesPool.liquidity || 0) + (noPool.liquidity || 0),
      }
    } catch (error) {
      Logger.error("Failed to get market odds with Meteora integration", error as Error, { marketSlug })
      return null
    }
  }

  // All other methods from the original database service...
  async getMarkets(filters: { resolved?: boolean; limit?: number } = {}): Promise<Market[]> {
    try {
      let query = this.supabase.from("markets").select("*").order("created_at", { ascending: false })

      if (filters.resolved !== undefined) {
        query = query.eq("resolved", filters.resolved)
      }

      if (filters.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      return (data || []).map(this.mapDatabaseToMarket)
    } catch (error) {
      Logger.error("Failed to get markets", error as Error)
      throw error
    }
  }

  async getMarket(slug: string): Promise<Market | null> {
    try {
      const { data, error } = await this.supabase.from("markets").select("*").eq("slug", slug).single()

      if (error || !data) {
        return null
      }

      return this.mapDatabaseToMarket(data)
    } catch (error) {
      Logger.error("Failed to get market", error as Error, { slug })
      return null
    }
  }

  async getPool(id: string): Promise<Pool | null> {
    try {
      const { data, error } = await this.supabase.from("pools").select("*").eq("id", id).single()

      if (error || !data) {
        return null
      }

      return {
        id: data.id,
        tokenA: data.token_a,
        tokenB: data.token_b,
        liquidity: data.liquidity || 0,
        price: data.price || 0,
        fees: data.fees || 0.003,
        volume24h: data.volume_24h || 0,
        createdAt: new Date(data.created_at),
      }
    } catch (error) {
      Logger.error("Failed to get pool", error as Error, { id })
      return null
    }
  }

  private mapDatabaseToMarket(data: any): Market {
    return {
      id: data.id,
      slug: data.slug,
      title: data.title,
      description: data.description || "",
      category: data.category,
      createdAt: new Date(data.created_at),
      endDate: new Date(data.end_date),
      resolved: data.resolved || false,
      outcome: data.outcome,
      totalVolume: data.total_volume || 0,
      yesPoolId: data.yes_pool_id,
      noPoolId: data.no_pool_id,
      creatorWallet: data.creator_wallet,
      bondAmount: data.bond_amount || 0,
      oracleConfig: data.oracle_config,
    }
  }

  // Additional methods for Meteora integration...
  async createTrade(tradeData: {
    userWallet: string
    marketId: string
    poolId: string
    outcome: string
    tradeType: string
    amountIn: number
    amountOut: number
    price: number
    slippage: number
    fee: number
    transactionSignature?: string
  }): Promise<void> {
    try {
      const { error } = await this.supabase.from("trades").insert({
        user_wallet: tradeData.userWallet,
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
        created_at: new Date().toISOString(),
      })

      if (error) {
        throw error
      }

      Logger.info("Trade recorded", {
        userWallet: tradeData.userWallet,
        marketId: tradeData.marketId,
        signature: tradeData.transactionSignature,
      })
    } catch (error) {
      Logger.error("Failed to create trade record", error as Error, { tradeData })
      throw error
    }
  }

  async savePriceData(symbol: string, price: number, confidence: number): Promise<void> {
    try {
      const { error } = await this.supabase.from("price_data").insert({
        symbol,
        price,
        confidence,
        timestamp: new Date().toISOString(),
      })

      if (error) {
        throw error
      }
    } catch (error) {
      Logger.error("Failed to save price data", error as Error, { symbol, price })
      throw error
    }
  }

  async updatePoolLiquidity(poolId: string, liquidityChange: number, newPrice?: number): Promise<void> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      }

      if (liquidityChange !== 0) {
        // Get current liquidity first
        const { data: pool } = await this.supabase.from("pools").select("liquidity").eq("id", poolId).single()

        if (pool) {
          updateData.liquidity = (pool.liquidity || 0) + liquidityChange
        }
      }

      if (newPrice !== undefined) {
        updateData.price = newPrice
      }

      const { error } = await this.supabase.from("pools").update(updateData).eq("id", poolId)

      if (error) {
        throw error
      }
    } catch (error) {
      Logger.error("Failed to update pool liquidity", error as Error, { poolId, liquidityChange })
      throw error
    }
  }

  async createMarket(marketData: {
    slug: string
    title: string
    description: string
    category: string
    creatorWallet: string
    endDate: Date
    bondAmount: number
    oracleConfig?: any
  }): Promise<Market> {
    try {
      const { data, error } = await this.supabase
        .from("markets")
        .insert({
          slug: marketData.slug,
          title: marketData.title,
          description: marketData.description,
          category: marketData.category,
          creator_wallet: marketData.creatorWallet,
          end_date: marketData.endDate.toISOString(),
          bond_amount: marketData.bondAmount,
          oracle_config: marketData.oracleConfig,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error || !data) {
        throw error || new Error("Failed to create market")
      }

      return this.mapDatabaseToMarket(data)
    } catch (error) {
      Logger.error("Failed to create market", error as Error, { marketData })
      throw error
    }
  }

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const { data, error } = await this.supabase.from("markets").select("count").limit(1)

      return {
        status: error ? "error" : "healthy",
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        status: "error",
        timestamp: new Date().toISOString(),
      }
    }
  }

  async getMarketOdds(marketSlug: string): Promise<MarketOdds | null> {
    // Use the enhanced Meteora-integrated method
    return this.getMarketOddsWithMeteora(marketSlug)
  }
}

export const databaseService = DatabaseServiceMeteora.getInstance()
