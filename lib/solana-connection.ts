import { Connection, type PublicKey, clusterApiUrl } from "@solana/web3.js"

// Solana connection configuration
const SOLANA_NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK as "devnet" | "mainnet-beta") || "devnet"
const RPC_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(SOLANA_NETWORK)

// Price feed IDs for different assets (these are the actual Pyth price feed IDs)
export const PRICE_FEED_IDS = {
  "ETH/USD": "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  "BTC/USD": "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  "SOL/USD": "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
} as const

class SolanaConnectionService {
  private static instance: SolanaConnectionService
  private connection: Connection | null = null

  private constructor() {
    // Only initialize connection on client side
    if (typeof window !== "undefined") {
      this.connection = new Connection(RPC_ENDPOINT, {
        commitment: "confirmed",
      })
      console.log(`✅ Solana connection initialized for ${SOLANA_NETWORK}`)
    }
  }

  static getInstance(): SolanaConnectionService {
    if (!this.instance) {
      this.instance = new SolanaConnectionService()
    }
    return this.instance
  }

  getConnection(): Connection | null {
    return this.connection
  }

  async getAccountInfo(publicKey: PublicKey) {
    if (!this.connection) {
      throw new Error("Connection not available on server side")
    }

    try {
      return await this.connection.getAccountInfo(publicKey)
    } catch (error) {
      console.error("Failed to get account info:", error)
      throw new Error("Failed to fetch account information")
    }
  }

  async getBalance(publicKey: PublicKey): Promise<number> {
    if (!this.connection) {
      return 0
    }

    try {
      const balance = await this.connection.getBalance(publicKey)
      return balance / 1e9 // Convert lamports to SOL
    } catch (error) {
      console.error("Failed to get balance:", error)
      return 0
    }
  }

  async confirmTransaction(signature: string): Promise<boolean> {
    if (!this.connection) {
      return false
    }

    try {
      const confirmation = await this.connection.confirmTransaction(signature, "confirmed")
      return !confirmation.value.err
    } catch (error) {
      console.error("Failed to confirm transaction:", error)
      return false
    }
  }
}

export const solanaConnection = SolanaConnectionService.getInstance()
