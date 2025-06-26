import type { Pool, SwapQuote } from "@/types/dlmm"
import type { Market, MarketOdds } from "@/types/market"
import { realDLMMService } from "./dlmm-real-fixed" // Updated import
import type { TransactionResult } from "./transaction-service"
import type { WalletContextState } from "@solana/wallet-adapter-react"

// Environment configuration
const USE_REAL_SDK = process.env.NEXT_PUBLIC_USE_REAL_SDK === "true"

// Main DLMM service that switches between simulation and real implementation
class DLMMService {
  private static instance: DLMMService
  private realService = realDLMMService

  static getInstance(): DLMMService {
    if (!this.instance) {
      this.instance = new DLMMService()
    }
    return this.instance
  }

  async getMarkets(): Promise<Market[]> {
    return this.realService.getMarkets()
  }

  async getMarket(id: string): Promise<Market | null> {
    return this.realService.getMarket(id)
  }

  async getPool(id: string): Promise<Pool | null> {
    return this.realService.getPool(id)
  }

  async getMarketOdds(marketId: string): Promise<MarketOdds | null> {
    return this.realService.getMarketOdds(marketId)
  }

  async addLiquidity(
    wallet: WalletContextState,
    poolId: string,
    amount: number,
    binId?: number,
  ): Promise<TransactionResult> {
    return this.realService.addLiquidity(wallet, poolId, amount, binId)
  }

  async swap(wallet: WalletContextState, poolId: string, amountIn: number, tokenIn: string): Promise<SwapQuote | null> {
    return this.realService.swap(wallet, poolId, amountIn, tokenIn)
  }

  async resolveMarket(marketId: string): Promise<boolean> {
    return this.realService.resolveMarket(marketId)
  }
}

export const dlmmService = DLMMService.getInstance()
