export interface DLMMPool {
  address: string
  tokenX: Token
  tokenY: Token
  activeId: number
  binStep: number
  baseFactor: number
  filterPeriod: number
  decayPeriod: number
  reductionFactor: number
  variableFeeControl: number
  maxVolatilityAccumulator: number
  minBinId: number
  maxBinId: number
  protocolFee: number
  lastUpdateTimestamp: number
  whitelistedWallet: string
}

export interface Token {
  address: string
  symbol: string
  name: string
  decimals: number
  logoURI?: string
}

export interface SwapQuote {
  inAmount: string
  outAmount: string
  minOutAmount: string
  priceImpact: number
  fee: number
  route: string[]
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
