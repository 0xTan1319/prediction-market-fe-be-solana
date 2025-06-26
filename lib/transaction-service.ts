import {
  type Connection,
  PublicKey,
  Transaction,
  type TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js"
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount } from "@solana/spl-token"
import type { WalletContextState } from "@solana/wallet-adapter-react"
import { solanaConnection } from "./solana-connection"

export interface TransactionResult {
  success: boolean
  signature?: string
  error?: string
}

export interface SwapParams {
  userWallet: PublicKey
  inputMint: PublicKey
  outputMint: PublicKey
  inputAmount: number
  minimumOutputAmount: number
  slippageTolerance: number
}

export class TransactionService {
  private static instance: TransactionService
  private connection: Connection

  private constructor() {
    this.connection = solanaConnection.getConnection()
  }

  static getInstance(): TransactionService {
    if (!this.instance) {
      this.instance = new TransactionService()
    }
    return this.instance
  }

  async executeSwap(wallet: WalletContextState, params: SwapParams): Promise<TransactionResult> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      return { success: false, error: "Wallet not connected" }
    }

    try {
      // Validate user has sufficient balance
      const hasBalance = await this.validateBalance(wallet.publicKey, params.inputMint, params.inputAmount)
      if (!hasBalance) {
        return { success: false, error: "Insufficient balance" }
      }

      // Create swap transaction
      const transaction = await this.createSwapTransaction(params)

      // Sign and send transaction
      const signedTransaction = await wallet.signTransaction(transaction)
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize())

      // Confirm transaction
      const confirmed = await solanaConnection.confirmTransaction(signature)

      if (confirmed) {
        return { success: true, signature }
      } else {
        return { success: false, error: "Transaction failed to confirm" }
      }
    } catch (error) {
      console.error("Swap execution failed:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }
    }
  }

  private async createSwapTransaction(params: SwapParams): Promise<Transaction> {
    const transaction = new Transaction()

    // Get associated token accounts
    const inputTokenAccount = await getAssociatedTokenAddress(params.inputMint, params.userWallet)
    const outputTokenAccount = await getAssociatedTokenAddress(params.outputMint, params.userWallet)

    // Check if output token account exists, create if not
    try {
      await getAccount(this.connection, outputTokenAccount)
    } catch {
      // Account doesn't exist, create it
      const createAccountInstruction = createAssociatedTokenAccountInstruction(
        params.userWallet,
        outputTokenAccount,
        params.userWallet,
        params.outputMint,
      )
      transaction.add(createAccountInstruction)
    }

    // Add swap instruction (this would be replaced with actual DLMM swap instruction)
    const swapInstruction = await this.createDLMMSwapInstruction(params)
    transaction.add(swapInstruction)

    // Set recent blockhash
    const { blockhash } = await this.connection.getLatestBlockhash()
    transaction.recentBlockhash = blockhash
    transaction.feePayer = params.userWallet

    return transaction
  }

  private async createDLMMSwapInstruction(params: SwapParams): Promise<TransactionInstruction> {
    // This is a placeholder - in production, this would use the actual Meteora DLMM program
    // For now, we'll create a simple transfer instruction as a demo

    return SystemProgram.transfer({
      fromPubkey: params.userWallet,
      toPubkey: new PublicKey("11111111111111111111111111111112"), // System program
      lamports: Math.floor(params.inputAmount * LAMPORTS_PER_SOL * 0.001), // Small fee
    })
  }

  private async validateBalance(userWallet: PublicKey, tokenMint: PublicKey, requiredAmount: number): Promise<boolean> {
    try {
      if (tokenMint.equals(PublicKey.default)) {
        // SOL balance check
        const balance = await solanaConnection.getBalance(userWallet)
        return balance >= requiredAmount
      } else {
        // SPL token balance check
        const tokenAccount = await getAssociatedTokenAddress(tokenMint, userWallet)
        const accountInfo = await getAccount(this.connection, tokenAccount)
        return Number(accountInfo.amount) >= requiredAmount * 1e6 // Assuming 6 decimals
      }
    } catch (error) {
      console.error("Balance validation failed:", error)
      return false
    }
  }

  async addLiquidity(
    wallet: WalletContextState,
    poolId: string,
    tokenAAmount: number,
    tokenBAmount: number,
  ): Promise<TransactionResult> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      return { success: false, error: "Wallet not connected" }
    }

    try {
      // Create add liquidity transaction
      const transaction = new Transaction()

      // Add liquidity instruction (placeholder)
      const addLiquidityInstruction = SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: new PublicKey("11111111111111111111111111111112"),
        lamports: Math.floor((tokenAAmount + tokenBAmount) * LAMPORTS_PER_SOL * 0.001),
      })

      transaction.add(addLiquidityInstruction)

      const { blockhash } = await this.connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = wallet.publicKey

      const signedTransaction = await wallet.signTransaction(transaction)
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize())

      const confirmed = await solanaConnection.confirmTransaction(signature)

      if (confirmed) {
        return { success: true, signature }
      } else {
        return { success: false, error: "Transaction failed to confirm" }
      }
    } catch (error) {
      console.error("Add liquidity failed:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }
    }
  }

  async createMarket(
    wallet: WalletContextState,
    marketData: {
      title: string
      description: string
      endDate: Date
      bondAmount: number
    },
  ): Promise<TransactionResult> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      return { success: false, error: "Wallet not connected" }
    }

    try {
      const transaction = new Transaction()

      // Market creation bond transfer
      const bondInstruction = SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: new PublicKey("11111111111111111111111111111112"), // Treasury
        lamports: marketData.bondAmount * LAMPORTS_PER_SOL,
      })

      transaction.add(bondInstruction)

      const { blockhash } = await this.connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = wallet.publicKey

      const signedTransaction = await wallet.signTransaction(transaction)
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize())

      const confirmed = await solanaConnection.confirmTransaction(signature)

      if (confirmed) {
        return { success: true, signature }
      } else {
        return { success: false, error: "Market creation failed" }
      }
    } catch (error) {
      console.error("Market creation failed:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }
    }
  }
}

export const transactionService = TransactionService.getInstance()
