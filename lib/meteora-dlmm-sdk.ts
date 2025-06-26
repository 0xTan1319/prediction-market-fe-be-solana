import { type Connection, PublicKey, type Transaction, VersionedTransaction } from "@solana/web3.js"
import { AnchorProvider, type Wallet } from "@coral-xyz/anchor"
import type { WalletContextState } from "@solana/wallet-adapter-react"
import { DLMM, type ActivationType, type BinLiquidityDistribution } from "@meteora-ag/dlmm"
import { solanaConnection } from "./solana-connection"
import { Logger } from "./error-handling"

export interface MeteoraPool {
  pubkey: PublicKey
  account: any
  tokenX: PublicKey
  tokenY: PublicKey
  binStep: number
  activeId: number
  totalLiquidity: number
  volume24h: number
  fees24h: number
}

export interface MeteoraSwapQuote {
  inAmount: string
  outAmount: string
  minOutAmount: string
  priceImpact: number
  fee: number
  route: string[]
  binArrays: PublicKey[]
}

export interface MeteoraLiquidityParams {
  poolAddress: PublicKey
  tokenXAmount: number
  tokenYAmount: number
  binId: number
  activationType: ActivationType
}

class MeteoraSDKService {
  private static instance: MeteoraSDKService
  private connection: Connection
  private dlmmProgram: PublicKey

  private constructor() {
    this.connection = solanaConnection.getConnection()
    this.dlmmProgram = new PublicKey("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo") // Meteora DLMM Program ID
  }

  static getInstance(): MeteoraSDKService {
    if (!this.instance) {
      this.instance = new MeteoraSDKService()
    }
    return this.instance
  }

  private createProvider(wallet: WalletContextState): AnchorProvider {
    return new AnchorProvider(this.connection, wallet as Wallet, { commitment: "confirmed" })
  }

  async getAllPools(): Promise<MeteoraPool[]> {
    try {
      const pools = await DLMM.getAllLbPairs(this.connection)

      return pools.map((pool) => ({
        pubkey: pool.publicKey,
        account: pool.account,
        tokenX: pool.account.tokenXMint,
        tokenY: pool.account.tokenYMint,
        binStep: pool.account.binStep,
        activeId: pool.account.activeId,
        totalLiquidity: 0, // Would need to calculate from reserves
        volume24h: 0, // Would need historical data
        fees24h: 0, // Would need historical data
      }))
    } catch (error) {
      Logger.error("Failed to get all pools", error as Error)
      return []
    }
  }

  async getPool(poolAddress: string): Promise<MeteoraPool | null> {
    try {
      const poolPubkey = new PublicKey(poolAddress)
      const dlmmPool = await DLMM.create(this.connection, poolPubkey)

      const poolData = await dlmmPool.getPoolInfo()

      return {
        pubkey: poolPubkey,
        account: poolData,
        tokenX: poolData.tokenXMint,
        tokenY: poolData.tokenYMint,
        binStep: poolData.binStep,
        activeId: poolData.activeId,
        totalLiquidity: Number(poolData.reserveX) + Number(poolData.reserveY),
        volume24h: 0, // Would need historical data
        fees24h: 0, // Would need historical data
      }
    } catch (error) {
      Logger.error("Failed to get pool", error as Error, { poolAddress })
      return null
    }
  }

  async getSwapQuote(
    poolAddress: string,
    inputMint: string,
    outputMint: string,
    amount: number,
    slippage = 1,
  ): Promise<MeteoraSwapQuote | null> {
    try {
      const poolPubkey = new PublicKey(poolAddress)
      const dlmmPool = await DLMM.create(this.connection, poolPubkey)

      const inputAmount = BigInt(Math.floor(amount * 1e6)) // Assuming 6 decimals
      const swapYtoX = inputMint === outputMint // Determine swap direction

      const quote = await dlmmPool.swapQuote(inputAmount, swapYtoX, slippage)

      return {
        inAmount: quote.inAmount.toString(),
        outAmount: quote.outAmount.toString(),
        minOutAmount: quote.minOutAmount.toString(),
        priceImpact: quote.priceImpact,
        fee: Number(quote.fee),
        route: [inputMint, outputMint],
        binArrays: quote.binArraysPubkey || [],
      }
    } catch (error) {
      Logger.error("Failed to get swap quote", error as Error, { poolAddress, amount })
      return null
    }
  }

  async executeSwap(
    wallet: WalletContextState,
    poolAddress: string,
    inputMint: string,
    outputMint: string,
    amount: number,
    slippage = 1,
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      if (!wallet.publicKey || !wallet.signTransaction) {
        return { success: false, error: "Wallet not connected" }
      }

      const poolPubkey = new PublicKey(poolAddress)
      const dlmmPool = await DLMM.create(this.connection, poolPubkey)

      const inputAmount = BigInt(Math.floor(amount * 1e6))
      const swapYtoX = inputMint === outputMint

      // Get swap quote first
      const quote = await dlmmPool.swapQuote(inputAmount, swapYtoX, slippage)

      // Create swap transaction
      const swapTx = await dlmmPool.swap({
        inToken: new PublicKey(inputMint),
        binArraysPubkey: quote.binArraysPubkey || [],
        inAmount: inputAmount,
        lbPair: poolPubkey,
        user: wallet.publicKey,
        minOutAmount: quote.minOutAmount,
        outToken: new PublicKey(outputMint),
      })

      // Sign and send transaction
      let signedTx: Transaction | VersionedTransaction

      if (swapTx instanceof VersionedTransaction) {
        signedTx = await wallet.signTransaction(swapTx)
      } else {
        signedTx = await wallet.signTransaction(swapTx)
      }

      const signature = await this.connection.sendRawTransaction(signedTx.serialize())

      // Confirm transaction
      const confirmation = await this.connection.confirmTransaction(signature, "confirmed")

      if (confirmation.value.err) {
        return { success: false, error: "Transaction failed" }
      }

      Logger.info("Swap executed successfully", { poolAddress, amount, signature })

      return { success: true, signature }
    } catch (error) {
      Logger.error("Swap execution failed", error as Error, { poolAddress, amount })
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
  }

  async addLiquidity(
    wallet: WalletContextState,
    params: MeteoraLiquidityParams,
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      if (!wallet.publicKey || !wallet.signTransaction) {
        return { success: false, error: "Wallet not connected" }
      }

      const dlmmPool = await DLMM.create(this.connection, params.poolAddress)

      // Create bin liquidity distribution
      const binLiquidityDist: BinLiquidityDistribution[] = [
        {
          binId: params.binId,
          xAmountBpsOfTotal: 5000, // 50% of X token
          yAmountBpsOfTotal: 5000, // 50% of Y token
        },
      ]

      // Add liquidity transaction
      const addLiquidityTx = await dlmmPool.addLiquidity({
        user: wallet.publicKey,
        totalXAmount: BigInt(Math.floor(params.tokenXAmount * 1e6)),
        totalYAmount: BigInt(Math.floor(params.tokenYAmount * 1e6)),
        binLiquidityDist,
      })

      // Sign and send transaction
      const signedTx = await wallet.signTransaction(addLiquidityTx)
      const signature = await this.connection.sendRawTransaction(signedTx.serialize())

      // Confirm transaction
      const confirmation = await this.connection.confirmTransaction(signature, "confirmed")

      if (confirmation.value.err) {
        return { success: false, error: "Transaction failed" }
      }

      Logger.info("Liquidity added successfully", {
        poolAddress: params.poolAddress.toString(),
        tokenXAmount: params.tokenXAmount,
        tokenYAmount: params.tokenYAmount,
        signature,
      })

      return { success: true, signature }
    } catch (error) {
      Logger.error("Add liquidity failed", error as Error, { params })
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
  }

  async removeLiquidity(
    wallet: WalletContextState,
    poolAddress: PublicKey,
    positionAddress: PublicKey,
    binIds: number[],
    liquidityShares: bigint[],
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      if (!wallet.publicKey || !wallet.signTransaction) {
        return { success: false, error: "Wallet not connected" }
      }

      const dlmmPool = await DLMM.create(this.connection, poolAddress)

      // Remove liquidity transaction
      const removeLiquidityTx = await dlmmPool.removeLiquidity({
        user: wallet.publicKey,
        position: positionAddress,
        binIds,
        liquidityShares,
      })

      // Sign and send transaction
      const signedTx = await wallet.signTransaction(removeLiquidityTx)
      const signature = await this.connection.sendRawTransaction(signedTx.serialize())

      // Confirm transaction
      const confirmation = await this.connection.confirmTransaction(signature, "confirmed")

      if (confirmation.value.err) {
        return { success: false, error: "Transaction failed" }
      }

      Logger.info("Liquidity removed successfully", {
        poolAddress: poolAddress.toString(),
        positionAddress: positionAddress.toString(),
        signature,
      })

      return { success: true, signature }
    } catch (error) {
      Logger.error("Remove liquidity failed", error as Error, { poolAddress: poolAddress.toString() })
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
  }

  async createPool(
    wallet: WalletContextState,
    tokenX: PublicKey,
    tokenY: PublicKey,
    binStep: number,
    initialPrice: number,
  ): Promise<{ success: boolean; poolAddress?: PublicKey; signature?: string; error?: string }> {
    try {
      if (!wallet.publicKey || !wallet.signTransaction) {
        return { success: false, error: "Wallet not connected" }
      }

      // Create DLMM pool
      const createPoolTx = await DLMM.createLbPair(
        this.connection,
        {
          tokenX,
          tokenY,
          binStep,
          initialPrice,
          feeBps: 100, // 1% fee
          activationSlot: null,
        },
        wallet.publicKey,
      )

      // Sign and send transaction
      const signedTx = await wallet.signTransaction(createPoolTx.tx)
      const signature = await this.connection.sendRawTransaction(signedTx.serialize())

      // Confirm transaction
      const confirmation = await this.connection.confirmTransaction(signature, "confirmed")

      if (confirmation.value.err) {
        return { success: false, error: "Pool creation failed" }
      }

      Logger.info("Pool created successfully", {
        tokenX: tokenX.toString(),
        tokenY: tokenY.toString(),
        binStep,
        poolAddress: createPoolTx.lbPair.toString(),
        signature,
      })

      return {
        success: true,
        poolAddress: createPoolTx.lbPair,
        signature,
      }
    } catch (error) {
      Logger.error("Pool creation failed", error as Error, { tokenX: tokenX.toString(), tokenY: tokenY.toString() })
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
  }

  async getUserPositions(wallet: WalletContextState): Promise<any[]> {
    try {
      if (!wallet.publicKey) {
        return []
      }

      const positions = await DLMM.getAllLbPairPositionsByUser(this.connection, wallet.publicKey)

      return positions.map((position) => ({
        address: position.publicKey,
        lbPair: position.account.lbPair,
        owner: position.account.owner,
        liquidityShares: position.account.liquidityShares,
        rewardInfos: position.account.rewardInfos,
      }))
    } catch (error) {
      Logger.error("Failed to get user positions", error as Error)
      return []
    }
  }

  async getPoolPrice(poolAddress: string): Promise<number | null> {
    try {
      const poolPubkey = new PublicKey(poolAddress)
      const dlmmPool = await DLMM.create(this.connection, poolPubkey)

      const poolInfo = await dlmmPool.getPoolInfo()
      const activeId = poolInfo.activeId
      const binStep = poolInfo.binStep

      // Calculate price from active bin
      const price = DLMM.getPriceFromBinId(activeId, binStep)

      return price
    } catch (error) {
      Logger.error("Failed to get pool price", error as Error, { poolAddress })
      return null
    }
  }
}

export const meteoraSDK = MeteoraSDKService.getInstance()
