import type { Pool, SwapQuote } from "@/types/dlmm"
import type { Market, MarketOdds } from "@/types/market"
import { meteoraIntegratedDLMM } from "./dlmm-meteora-integration"
import type { TransactionResult } from "./transaction-service"
import type { WalletContextState } from "@solana/wallet-adapter-react"

// Final DLMM service with complete Meteora integration
class FinalDLMMService {
  private static instance: FinalDLMMService
  private meteoraService = meteoraIntegratedDLMM

  static getInstance(): FinalDLMMService {
    if (!this.instance) {
      this.instance = new FinalDLMMService()
    }
    return this.instance
  }

  async getMarkets(): Promise<Market[]> {
    return this.meteoraService.getMarkets()
  }

  async getMarket(id: string): Promise<Market | null> {
    return this.meteoraService.getMarket(id)
  }

  async getPool(id: string): Promise<Pool | null> {
    return this.meteoraService.getPool(id)
  }

  async getMarketOdds(marketId: string): Promise<MarketOdds | null> {
    return this.meteoraService.getMarketOdds(marketId)
  }

  async addLiquidity(
    wallet: WalletContextState,
    poolId: string,
    amount: number,
    binId?: number,
  ): Promise<TransactionResult> {
    return this.meteoraService.addLiquidity(wallet, poolId, amount, binId)
  }

  async swap(wallet: WalletContextState, poolId: string, amountIn: number, tokenIn: string): Promise<SwapQuote | null> {
    return this.meteoraService.swap(wallet, poolId, amountIn, tokenIn)
  }

  async resolveMarket(marketId: string): Promise<boolean> {
    return this.meteoraService.resolveMarket(marketId)
  }

  async createMarket(marketData: {
    title: string
    description: string
    category: string
    endDate: Date
    creatorWallet: string
    bondAmount: number
  }): Promise<Market> {
    return this.meteoraService.createMarket(marketData)
  }
}

export const dlmmService = FinalDLMMService.getInstance()
