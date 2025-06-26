export interface Market {
  id: string
  title: string
  description: string
  category: string
  endDate: Date
  resolved: boolean
  winningOutcome?: "YES" | "NO"
  yesPoolId: string
  noPoolId: string
  totalVolume: number
  createdAt: Date
}

export interface Pool {
  id: string
  tokenA: string
  tokenB: string
  liquidity: number
  price: number
  volume24h: number
  fees: number
  bins: Bin[]
}

export interface Bin {
  id: number
  price: number
  liquidityX: number
  liquidityY: number
  feeRate: number
}

export interface Position {
  marketId: string
  outcome: "YES" | "NO"
  amount: number
  averagePrice: number
  unrealizedPnl: number
}

export interface LiquidityPosition {
  poolId: string
  binId: number
  liquidityAmount: number
  feesEarned: number
  impermanentLoss: number
}

export interface MarketOdds {
  yes: number
  no: number
  yesImpliedProbability: number
  noImpliedProbability: number
  liquidityRatio: number
  confidence: number
}
