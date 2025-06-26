"use client"

import { useState, useEffect, useCallback } from "react"
import type { MarketOdds } from "@/types/market"
import { dlmmService } from "@/lib/dlmm-fixed" // Updated import

export function useMarketOdds(marketId: string) {
  const [odds, setOdds] = useState<MarketOdds | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const fetchOdds = useCallback(async () => {
    if (!marketId) {
      setLoading(false)
      return
    }

    try {
      setError(null)
      const marketOdds = await dlmmService.getMarketOdds(marketId)

      if (marketOdds) {
        setOdds(marketOdds)
        setRetryCount(0) // Reset retry count on success
      } else {
        // Set default odds if none found
        setOdds({
          yes: 0.5,
          no: 0.5,
          yesImpliedProbability: 50,
          noImpliedProbability: 50,
          liquidityRatio: 0.5,
          confidence: 0,
        })
      }
    } catch (err) {
      console.error("Failed to fetch market odds:", err)
      setError("Failed to fetch market odds")

      // Retry logic with exponential backoff
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
        setTimeout(() => {
          setRetryCount((prev) => prev + 1)
        }, delay)
      } else {
        // After 3 retries, set default odds
        setOdds({
          yes: 0.5,
          no: 0.5,
          yesImpliedProbability: 50,
          noImpliedProbability: 50,
          liquidityRatio: 0.5,
          confidence: 0,
        })
      }
    } finally {
      setLoading(false)
    }
  }, [marketId, retryCount])

  useEffect(() => {
    let interval: NodeJS.Timeout

    fetchOdds()

    // Update odds every 15 seconds (increased from 10 to reduce load)
    interval = setInterval(fetchOdds, 15000)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [fetchOdds])

  return { odds, loading, error, refetch: fetchOdds }
}
