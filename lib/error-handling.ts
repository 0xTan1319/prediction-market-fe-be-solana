export enum ErrorType {
  NETWORK_ERROR = "NETWORK_ERROR",
  INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS",
  TRANSACTION_FAILED = "TRANSACTION_FAILED",
  WALLET_NOT_CONNECTED = "WALLET_NOT_CONNECTED",
  INVALID_INPUT = "INVALID_INPUT",
  ORACLE_ERROR = "ORACLE_ERROR",
  SLIPPAGE_EXCEEDED = "SLIPPAGE_EXCEEDED",
  MARKET_EXPIRED = "MARKET_EXPIRED",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export class AppError extends Error {
  public readonly type: ErrorType
  public readonly userMessage: string
  public readonly originalError?: Error

  constructor(type: ErrorType, userMessage: string, originalError?: Error) {
    super(userMessage)
    this.type = type
    this.userMessage = userMessage
    this.originalError = originalError
    this.name = "AppError"
  }
}

export class ErrorHandler {
  static handle(error: unknown): AppError {
    if (error instanceof AppError) {
      return error
    }

    if (error instanceof Error) {
      // Map common error patterns
      if (error.message.includes("insufficient funds")) {
        return new AppError(ErrorType.INSUFFICIENT_FUNDS, "You don't have enough funds for this transaction", error)
      }

      if (error.message.includes("network") || error.message.includes("connection")) {
        return new AppError(ErrorType.NETWORK_ERROR, "Network error. Please check your connection and try again", error)
      }

      if (error.message.includes("slippage")) {
        return new AppError(
          ErrorType.SLIPPAGE_EXCEEDED,
          "Price moved too much. Please try again with higher slippage tolerance",
          error,
        )
      }

      if (error.message.includes("wallet")) {
        return new AppError(ErrorType.WALLET_NOT_CONNECTED, "Please connect your wallet to continue", error)
      }
    }

    return new AppError(
      ErrorType.UNKNOWN_ERROR,
      "An unexpected error occurred. Please try again",
      error instanceof Error ? error : new Error(String(error)),
    )
  }

  static getToastMessage(error: AppError): { title: string; description: string; variant: "destructive" | "default" } {
    const messages = {
      [ErrorType.NETWORK_ERROR]: {
        title: "Connection Error",
        description: "Please check your internet connection",
        variant: "destructive" as const,
      },
      [ErrorType.INSUFFICIENT_FUNDS]: {
        title: "Insufficient Funds",
        description: "You need more tokens to complete this transaction",
        variant: "destructive" as const,
      },
      [ErrorType.TRANSACTION_FAILED]: {
        title: "Transaction Failed",
        description: "The transaction could not be completed",
        variant: "destructive" as const,
      },
      [ErrorType.WALLET_NOT_CONNECTED]: {
        title: "Wallet Required",
        description: "Please connect your wallet to continue",
        variant: "default" as const,
      },
      [ErrorType.SLIPPAGE_EXCEEDED]: {
        title: "Price Changed",
        description: "The price moved too much. Try increasing slippage tolerance",
        variant: "destructive" as const,
      },
      [ErrorType.MARKET_EXPIRED]: {
        title: "Market Expired",
        description: "This market has already ended",
        variant: "destructive" as const,
      },
      [ErrorType.ORACLE_ERROR]: {
        title: "Price Feed Error",
        description: "Unable to fetch current price data",
        variant: "destructive" as const,
      },
      [ErrorType.INVALID_INPUT]: {
        title: "Invalid Input",
        description: "Please check your input and try again",
        variant: "destructive" as const,
      },
      [ErrorType.UNKNOWN_ERROR]: {
        title: "Something went wrong",
        description: "Please try again later",
        variant: "destructive" as const,
      },
    }

    return messages[error.type] || messages[ErrorType.UNKNOWN_ERROR]
  }
}

// Simplified logging service for production
export class Logger {
  static error(message: string, error?: Error, context?: Record<string, any>) {
    if (typeof window !== "undefined") {
      // Client-side logging
      console.error(`[ERROR] ${message}`, {
        error: error?.message,
        context,
        timestamp: new Date().toISOString(),
      })
    } else {
      // Server-side logging (simplified)
      console.error(`[ERROR] ${message}`, error?.message, context)
    }
  }

  static warn(message: string, context?: Record<string, any>) {
    console.warn(`[WARN] ${message}`, context)
  }

  static info(message: string, context?: Record<string, any>) {
    console.info(`[INFO] ${message}`, context)
  }
}
