import { z } from "zod"

// Market creation validation
export const MarketCreationSchema = z.object({
  title: z
    .string()
    .min(10, "Title must be at least 10 characters")
    .max(200, "Title must be less than 200 characters")
    .regex(/^[a-zA-Z0-9\s?!.,-]+$/, "Title contains invalid characters"),

  description: z.string().max(1000, "Description must be less than 1000 characters").optional(),

  category: z.enum(["crypto", "sports", "politics", "weather", "other"]),

  endDate: z
    .date()
    .min(new Date(Date.now() + 24 * 60 * 60 * 1000), "End date must be at least 24 hours from now")
    .max(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), "End date must be within 1 year"),

  bondAmount: z.number().min(1, "Bond amount must be at least 1 SOL").max(100, "Bond amount cannot exceed 100 SOL"),
})

// Trading validation
export const TradingSchema = z.object({
  amount: z
    .number()
    .positive("Amount must be positive")
    .max(1000000, "Amount too large")
    .refine((val) => val >= 0.01, "Minimum trade amount is 0.01"),

  outcome: z.enum(["YES", "NO"]),

  slippageTolerance: z
    .number()
    .min(0.1, "Minimum slippage tolerance is 0.1%")
    .max(50, "Maximum slippage tolerance is 50%")
    .default(1),
})

// Liquidity provision validation
export const LiquiditySchema = z
  .object({
    yesAmount: z.number().min(0, "Amount cannot be negative").max(1000000, "Amount too large"),

    noAmount: z.number().min(0, "Amount cannot be negative").max(1000000, "Amount too large"),

    binRange: z
      .object({
        min: z.number().min(0.01).max(0.99),
        max: z.number().min(0.01).max(0.99),
      })
      .refine((data) => data.min < data.max, "Min price must be less than max price"),
  })
  .refine((data) => data.yesAmount > 0 || data.noAmount > 0, "Must provide liquidity to at least one side")

// Wallet address validation
export const WalletAddressSchema = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "Invalid Solana wallet address")

// Input sanitization
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .replace(/javascript:/gi, "") // Remove javascript: protocols
    .slice(0, 1000) // Limit length
}

// Rate limiting helper
export class RateLimiter {
  private requests: Map<string, number[]> = new Map()

  constructor(
    private maxRequests = 10,
    private windowMs = 60000, // 1 minute
  ) {}

  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const requests = this.requests.get(identifier) || []

    // Remove old requests outside the window
    const validRequests = requests.filter((time) => now - time < this.windowMs)

    if (validRequests.length >= this.maxRequests) {
      return false
    }

    validRequests.push(now)
    this.requests.set(identifier, validRequests)

    return true
  }

  getRemainingRequests(identifier: string): number {
    const requests = this.requests.get(identifier) || []
    const validRequests = requests.filter((time) => Date.now() - time < this.windowMs)
    return Math.max(0, this.maxRequests - validRequests.length)
  }
}

export const tradingRateLimiter = new RateLimiter(5, 60000) // 5 trades per minute
export const marketCreationRateLimiter = new RateLimiter(1, 300000) // 1 market per 5 minutes
