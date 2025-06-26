"use client"

import { useEffect } from "react"

// Component to suppress wallet adapter warnings in production
export function WalletWarningsSuppressor() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      // Suppress wallet adapter warnings in production
      const originalWarn = console.warn
      const originalError = console.error

      console.warn = (...args) => {
        const message = args[0]
        if (
          typeof message === "string" &&
          (message.includes("was registered as a Standard Wallet") ||
            message.includes("can be removed from your app") ||
            message.includes("StreamMiddleware - Unknown response id"))
        ) {
          return // Suppress these specific warnings
        }
        originalWarn.apply(console, args)
      }

      console.error = (...args) => {
        const message = args[0]
        if (typeof message === "string" && message.includes("Cannot read properties of null")) {
          return // Suppress wallet null property errors
        }
        originalError.apply(console, args)
      }

      return () => {
        console.warn = originalWarn
        console.error = originalError
      }
    }
  }, [])

  return null
}
